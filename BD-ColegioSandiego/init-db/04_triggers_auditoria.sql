-- =====================================================================
-- 04_triggers_auditoria.sql  (v5 - alineado con esquema v5)
-- SAE - Colegio San Diego | Auditoría de cambios vía Triggers
--
-- Propósito:
--   Registrar en log_auditoria cada INSERT, UPDATE y DELETE en las
--   tablas críticas. La función fn_audit_trigger() es genérica.
--
-- Cumple: RF-08, RNF-14.
--
-- Cambios respecto a v4:
--   * Refresh estético: comentarios y mensajes mencionan "tutor" en
--     lugar de "padre" para coherencia con el rename del v4.
--   * Sin cambios funcionales: la función auditora opera sobre cualquier
--     tabla independiente del rename.
--
-- Contrato con Backend:
--   El backend DEBE setear estos parámetros al inicio de cada
--   transacción que toque tablas auditadas:
--       SET LOCAL "sae.usuario_id"   = '<id del usuario que opera>';
--       SET LOCAL "sae.direccion_ip" = '<IP del cliente HTTP>';
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Función genérica de auditoría
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_usuario_id INT;
    v_ip         INET;
    v_pk_name    TEXT;
    v_pk_value   TEXT;
    v_antes      JSONB;
    v_despues    JSONB;
BEGIN
    -- 1.1 Nombre del PK pasado como argumento del trigger
    v_pk_name := TG_ARGV[0];
    IF v_pk_name IS NULL THEN
        RAISE EXCEPTION 'fn_audit_trigger requiere el nombre del PK como argumento';
    END IF;

    -- 1.2 Contexto de sesión (seteado por el backend con SET LOCAL)
    BEGIN
        v_usuario_id := current_setting('sae.usuario_id', true)::INT;
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := NULL;
    END;

    BEGIN
        v_ip := current_setting('sae.direccion_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
    END;

    -- 1.3 Snapshots según operación
    IF TG_OP = 'INSERT' THEN
        v_antes    := NULL;
        v_despues  := to_jsonb(NEW);
        v_pk_value := v_despues ->> v_pk_name;

    ELSIF TG_OP = 'UPDATE' THEN
        v_antes    := to_jsonb(OLD);
        v_despues  := to_jsonb(NEW);
        IF v_antes = v_despues THEN
            RETURN NEW;
        END IF;
        v_pk_value := v_despues ->> v_pk_name;

    ELSIF TG_OP = 'DELETE' THEN
        v_antes    := to_jsonb(OLD);
        v_despues  := NULL;
        v_pk_value := v_antes ->> v_pk_name;
    END IF;

    -- 1.4 Enmascarar campos sensibles. password_hash NUNCA debe quedar
    --     replicado en el log.
    IF TG_TABLE_NAME = 'usuario' THEN
        IF v_antes   IS NOT NULL THEN v_antes   := v_antes   - 'password_hash'; END IF;
        IF v_despues IS NOT NULL THEN v_despues := v_despues - 'password_hash'; END IF;
    END IF;

    -- 1.5 Insertar en log_auditoria (best effort: si falla, no rompe la
    --     transacción de negocio)
    BEGIN
        INSERT INTO log_auditoria (
            usuario_id,
            accion,
            tabla_afectada,
            registro_id,
            valores_antes,
            valores_despues,
            direccion_ip,
            descripcion
        ) VALUES (
            v_usuario_id,
            TG_OP,
            TG_TABLE_NAME,
            v_pk_value,
            v_antes,
            v_despues,
            v_ip,
            'Auditoría automática vía trigger fn_audit_trigger'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falló auditoría en %.%: %', TG_TABLE_NAME, TG_OP, SQLERRM;
    END;

    -- 1.6 Retornar registro apropiado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

COMMENT ON FUNCTION fn_audit_trigger() IS
'Función genérica de auditoría. Registra INSERT/UPDATE/DELETE en log_auditoria.
Lee usuario_id e IP desde sae.usuario_id y sae.direccion_ip seteados por el
backend con SET LOCAL al inicio de cada transacción.';

-- ---------------------------------------------------------------------
-- 2. Triggers en las tablas auditadas
-- ---------------------------------------------------------------------

-- 2.1  Pago (financiero crítico, RF-08, RNF-14)
DROP TRIGGER IF EXISTS trg_audit_pago ON pago;
CREATE TRIGGER trg_audit_pago
    AFTER INSERT OR UPDATE OR DELETE ON pago
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_trigger('pago_id');

COMMENT ON TRIGGER trg_audit_pago ON pago IS
'Audita alta, modificación o eliminación de pagos.';

-- 2.2  Alumno (RF-08)
DROP TRIGGER IF EXISTS trg_audit_alumno ON alumno;
CREATE TRIGGER trg_audit_alumno
    AFTER INSERT OR UPDATE OR DELETE ON alumno
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_trigger('alumno_id');

COMMENT ON TRIGGER trg_audit_alumno ON alumno IS
'Audita registro, modificación y baja de expedientes de alumnos.';

-- 2.3  Usuario (RF-08, RNF-14)
DROP TRIGGER IF EXISTS trg_audit_usuario ON usuario;
CREATE TRIGGER trg_audit_usuario
    AFTER INSERT OR UPDATE OR DELETE ON usuario
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_trigger('usuario_id');

COMMENT ON TRIGGER trg_audit_usuario ON usuario IS
'Audita creación, modificación y desactivación de cuentas. password_hash enmascarado.';

-- 2.4  Usuario_rol: asignación y retiro de roles (RNF-14)
DROP TRIGGER IF EXISTS trg_audit_usuario_rol ON usuario_rol;
CREATE TRIGGER trg_audit_usuario_rol
    AFTER INSERT OR UPDATE OR DELETE ON usuario_rol
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_trigger('usuario_rol_id');

COMMENT ON TRIGGER trg_audit_usuario_rol ON usuario_rol IS
'Audita asignación y retiro de roles. Crítico para trazabilidad de permisos.';

-- ---------------------------------------------------------------------
-- 3. Cómo agregar más tablas (referencia rápida)
-- ---------------------------------------------------------------------
-- Para auditar otra tabla, dos líneas siguiendo el patrón:
--
--   DROP TRIGGER IF EXISTS trg_audit_tutor_alumno ON tutor_alumno;
--   CREATE TRIGGER trg_audit_tutor_alumno
--       AFTER INSERT OR UPDATE OR DELETE ON tutor_alumno
--       FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger('tutor_alumno_id');
--
-- El argumento entre comillas es el nombre EXACTO de la columna PK.

-- ---------------------------------------------------------------------
-- 4. Verificación final
-- ---------------------------------------------------------------------
DO $$
DECLARE
    total_triggers INT;
BEGIN
    SELECT COUNT(DISTINCT trigger_name) INTO total_triggers
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name LIKE 'trg_audit_%';

    RAISE NOTICE 'Triggers de auditoría activos: % (esperados 4: pago, alumno, usuario, usuario_rol)', total_triggers;
    RAISE NOTICE 'El backend debe setear sae.usuario_id y sae.direccion_ip en cada transacción.';
END $$;

-- =====================================================================
-- FIN del archivo 04_triggers_auditoria.sql v5
-- =====================================================================