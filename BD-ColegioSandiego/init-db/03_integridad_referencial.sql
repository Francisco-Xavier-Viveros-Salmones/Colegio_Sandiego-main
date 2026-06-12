-- =====================================================================
-- 03_integridad_referencial.sql  (v2 - alineado con esquema v2)
-- SAE - Colegio San Diego | Plomería entre 01 y 02
--
-- Propósito:
--   El archivo 02_configuracion.sql crea la tabla configuracion_sistema
--   con dos columnas FK comentadas:
--     * ciclo_id        -> ciclo_escolar(ciclo_id)
--     * actualizado_por -> usuario(usuario_id)
--
--   Aquí las activamos una vez que ciclo_escolar y usuario existen.
--
-- Cambios respecto a v1:
--   * La verificación defensiva ahora confirma también la existencia de
--     las tablas críticas del nuevo modelo (rol, usuario_rol) para
--     detectar despliegues incompletos.
--   * Las FK reales hacia configuracion_sistema NO cambian: siguen
--     apuntando a ciclo_escolar(ciclo_id) y usuario(usuario_id).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Verificación defensiva
-- ---------------------------------------------------------------------
DO $$
BEGIN
    -- Tablas que este archivo necesita para aplicar FKs
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name='configuracion_sistema') THEN
        RAISE EXCEPTION 'No existe configuracion_sistema. Ejecuta 02_configuracion.sql primero.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name='ciclo_escolar') THEN
        RAISE EXCEPTION 'No existe ciclo_escolar. Ejecuta 01_esquema_base.sql primero.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name='usuario') THEN
        RAISE EXCEPTION 'No existe usuario. Ejecuta 01_esquema_base.sql primero.';
    END IF;

    -- Validación extra: confirmamos que el nuevo modelo de roles está activo
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name='rol') THEN
        RAISE WARNING 'No existe la tabla rol. El esquema parece incompleto.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name='usuario_rol') THEN
        RAISE WARNING 'No existe la tabla usuario_rol. El esquema parece incompleto.';
    END IF;

    -- Aviso defensivo: si alguien dejó la tabla docente obsoleta, lo detectamos
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='docente') THEN
        RAISE WARNING 'Tabla obsoleta "docente" detectada. En el modelo v2 los docentes son usuarios con rol.';
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. FK: configuracion_sistema.ciclo_id -> ciclo_escolar(ciclo_id)
-- ---------------------------------------------------------------------
ALTER TABLE configuracion_sistema
    DROP CONSTRAINT IF EXISTS fk_configuracion_ciclo;

ALTER TABLE configuracion_sistema
    ADD CONSTRAINT fk_configuracion_ciclo
    FOREIGN KEY (ciclo_id)
    REFERENCES ciclo_escolar(ciclo_id)
    ON DELETE SET NULL;
-- ON DELETE SET NULL: si se borra un ciclo, los overrides regresan a globales.

-- ---------------------------------------------------------------------
-- 3. FK: configuracion_sistema.actualizado_por -> usuario(usuario_id)
-- ---------------------------------------------------------------------
ALTER TABLE configuracion_sistema
    DROP CONSTRAINT IF EXISTS fk_configuracion_usuario;

ALTER TABLE configuracion_sistema
    ADD CONSTRAINT fk_configuracion_usuario
    FOREIGN KEY (actualizado_por)
    REFERENCES usuario(usuario_id)
    ON DELETE SET NULL;
-- ON DELETE SET NULL: si se borra un usuario, su rastro en la bitácora
-- queda como "autor desconocido" en lugar de eliminarse en cascada.

-- ---------------------------------------------------------------------
-- 4. Verificación final
-- ---------------------------------------------------------------------
DO $$
DECLARE
    total_fk INT;
BEGIN
    SELECT COUNT(*) INTO total_fk
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'configuracion_sistema'
      AND constraint_type = 'FOREIGN KEY';

    RAISE NOTICE 'configuracion_sistema tiene % foreign keys activas.', total_fk;
END $$;

-- =====================================================================
-- FIN del archivo 03_integridad_referencial.sql v2
-- =====================================================================