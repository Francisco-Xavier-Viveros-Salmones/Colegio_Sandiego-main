-- =====================================================================
-- migrations/02_tutor_alumno_n_m.sql
-- SAE - Colegio San Diego | Migración de tutoría 1:N → N:M
--
-- Propósito:
--   Migrar la relación padre→alumno de 1:N (FK directa en alumno.padre_id)
--   a N:M (tabla puente tutor_alumno). Decisión arquitectónica respaldada
--   por el análisis de casos reales (padres separados, tutor legal,
--   gasto compartido).
--
-- Estrategia:
--   1. Crear la tabla tutor_alumno (idempotente).
--   2. Detectar si alumno.padre_id aún existe (estado v2).
--   3. Si existe: migrar cada vínculo como responsable financiero,
--      verificar integridad, eliminar la columna.
--   4. Si no existe: asumir que ya migramos. No hacer nada.
--
-- Idempotencia:
--   Re-ejecutar el script no rompe ni duplica datos. Si el esquema ya
--   está en v3, el bloque DO detecta la ausencia de padre_id y termina
--   sin tocar nada.
--
-- Transacción:
--   Todo en BEGIN/COMMIT. Si cualquier paso falla, rollback completo.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Paso 1  Crear la tabla puente tutor_alumno
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_alumno (
    tutor_alumno_id            SERIAL      PRIMARY KEY,
    padre_id                   INT         NOT NULL REFERENCES padre(padre_id) ON DELETE CASCADE,
    alumno_id                  INT         NOT NULL REFERENCES alumno(alumno_id) ON DELETE CASCADE,
    tipo_relacion              VARCHAR(20) NOT NULL DEFAULT 'tutor'
                               CHECK (tipo_relacion IN ('padre','madre','tutor_legal','abuelo','otro','tutor')),
    es_responsable_financiero  BOOLEAN     NOT NULL DEFAULT FALSE,
    puede_recoger              BOOLEAN     NOT NULL DEFAULT TRUE,
    recibe_notificaciones      BOOLEAN     NOT NULL DEFAULT TRUE,
    activo                     BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (padre_id, alumno_id)
);

COMMENT ON TABLE tutor_alumno IS
'Relación N:M entre padre/tutor y alumno. Reemplaza a alumno.padre_id (1:N).
Permite modelar padres separados, tutores legales, abuelos como responsables, etc.';

COMMENT ON COLUMN tutor_alumno.es_responsable_financiero IS
'TRUE = este tutor paga colegiaturas y recibe la factura. Un alumno puede tener varios.';

COMMENT ON COLUMN tutor_alumno.tipo_relacion IS
'padre/madre/tutor_legal/abuelo/otro. El valor "tutor" se usa para migraciones automáticas sin información detallada.';

-- Índices estratégicos
CREATE INDEX IF NOT EXISTS idx_tutor_alumno_alumno
    ON tutor_alumno (alumno_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_tutor_alumno_padre
    ON tutor_alumno (padre_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_tutor_alumno_responsable
    ON tutor_alumno (alumno_id) WHERE es_responsable_financiero = TRUE AND activo = TRUE;

-- ---------------------------------------------------------------------
-- Paso 2  Migración condicional según estado actual del esquema
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_padre_id_existe BOOLEAN;
    v_total_vinculos  INT;
    v_total_migrados  INT;
    v_huerfanos       INT;
BEGIN
    -- Detectar si la columna padre_id aún existe en alumno
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'alumno'
          AND column_name  = 'padre_id'
    ) INTO v_padre_id_existe;

    IF NOT v_padre_id_existe THEN
        RAISE NOTICE 'alumno.padre_id no existe. La migración ya está aplicada o el esquema es v3 nativo.';
        RETURN;
    END IF;

    -- Contar vínculos esperados
    EXECUTE 'SELECT COUNT(*) FROM alumno WHERE padre_id IS NOT NULL' INTO v_total_vinculos;
    RAISE NOTICE 'Vínculos padre→alumno detectados en v2: %', v_total_vinculos;

    -- Migrar cada vínculo a tutor_alumno como responsable financiero principal
    EXECUTE $migration$
        INSERT INTO tutor_alumno (
            padre_id, alumno_id, tipo_relacion,
            es_responsable_financiero, puede_recoger, recibe_notificaciones, activo
        )
        SELECT padre_id, alumno_id, 'tutor', TRUE, TRUE, TRUE, TRUE
        FROM alumno
        WHERE padre_id IS NOT NULL
        ON CONFLICT (padre_id, alumno_id) DO NOTHING
    $migration$;

    GET DIAGNOSTICS v_total_migrados = ROW_COUNT;
    RAISE NOTICE 'Filas insertadas en tutor_alumno: %', v_total_migrados;

    -- Verificación de integridad: que no quede ningún alumno con padre_id
    -- sin su correspondiente entrada en tutor_alumno
    EXECUTE $check$
        SELECT COUNT(*) FROM alumno a
        WHERE a.padre_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM tutor_alumno ta
              WHERE ta.alumno_id = a.alumno_id
                AND ta.padre_id  = a.padre_id
                AND ta.es_responsable_financiero = TRUE
          )
    $check$ INTO v_huerfanos;

    IF v_huerfanos > 0 THEN
        RAISE EXCEPTION 'Verificación falló: % alumnos quedaron sin vínculo en tutor_alumno. Abortando.', v_huerfanos;
    END IF;

    RAISE NOTICE 'Verificación OK: todos los vínculos migrados correctamente.';

    -- Ahora sí, eliminar la columna padre_id
    EXECUTE 'ALTER TABLE alumno DROP COLUMN padre_id';
    RAISE NOTICE 'Columna alumno.padre_id eliminada.';

    -- Eliminar también el índice antiguo si existía
    EXECUTE 'DROP INDEX IF EXISTS idx_alumno_padre';
    RAISE NOTICE 'Índice idx_alumno_padre eliminado (ya no aplica).';
END $$;

-- ---------------------------------------------------------------------
-- Paso 3  Verificación final
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_total_tutores       INT;
    v_total_responsables  INT;
    v_columna_existe      BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO v_total_tutores      FROM tutor_alumno;
    SELECT COUNT(*) INTO v_total_responsables FROM tutor_alumno WHERE es_responsable_financiero = TRUE;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='alumno' AND column_name='padre_id')
           INTO v_columna_existe;

    RAISE NOTICE '====== Migración 1:N → N:M completada ======';
    RAISE NOTICE 'Tutores totales en tutor_alumno: %', v_total_tutores;
    RAISE NOTICE 'Responsables financieros:        %', v_total_responsables;
    RAISE NOTICE 'Columna alumno.padre_id existe:  %', v_columna_existe;
    RAISE NOTICE '==============================================';

    IF v_columna_existe THEN
        RAISE EXCEPTION 'La columna padre_id sigue existiendo. La migración no se completó correctamente.';
    END IF;
END $$;

COMMIT;

-- =====================================================================
-- Post-migración (manual, opcional):
--   * Los pagos existentes mantienen su pago.padre_id. Esa FK no cambia
--     (un pago siempre apunta a UN padre que pagó).
--   * Las facturas existentes mantienen su factura.padre_id. Tampoco
--     cambia.
--   * Las queries que usaban alumno.padre_id deben actualizarse para
--     usar JOIN con tutor_alumno filtrando por es_responsable_financiero.
-- =====================================================================
