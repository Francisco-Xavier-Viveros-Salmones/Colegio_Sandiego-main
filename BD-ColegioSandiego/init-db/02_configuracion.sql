-- =====================================================================
-- 02_configuracion.sql
-- SAE - Colegio San Diego | Inicialización de la tabla de configuración
--
-- Propósito:
--   Crear la tabla `configuracion_sistema` (clave-valor genérica) y poblarla
--   con los parámetros de negocio extraídos de los RF/RNF v3.2.
--
--   Esta tabla actúa como "termostato" del sistema: el backend lee de aquí
--   los valores ($400 de recargo, día 5 tope, 3 meses para baja, etc.) en
--   lugar de quemarlos en el código. Modificar un parámetro NO requiere
--   recompilar ni redesplegar; solo un UPDATE.
--
-- Orden de ejecución:
--   Este archivo se ejecuta automáticamente la primera vez que el
--   contenedor de PostgreSQL arranca (mecanismo de docker-entrypoint-initdb.d).
--   Si las tablas `ciclo_escolar` y `usuario` aún no existen, las FK de la
--   sección final se omiten o se aplican posteriormente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Definición de la tabla
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    config_id        SERIAL       PRIMARY KEY,
    clave            VARCHAR(80)  NOT NULL,
    valor            TEXT         NOT NULL,
    tipo_dato        VARCHAR(20)  NOT NULL DEFAULT 'string'
                     CHECK (tipo_dato IN ('string','int','decimal','bool','json')),
    descripcion      TEXT,
    ciclo_id         INT          NULL,
    actualizado_en   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_por  INT          NULL,
    -- Una clave puede ser global (ciclo_id NULL) o tener un override
    -- por ciclo, pero nunca duplicarse dentro del mismo ciclo.
    CONSTRAINT uq_configuracion_clave_ciclo UNIQUE (clave, ciclo_id)
);

COMMENT ON TABLE  configuracion_sistema IS
'Parámetros configurables del sistema. El backend lee de aquí en lugar de
hardcodear valores. Soporta override por ciclo escolar (NULL = global).';

COMMENT ON COLUMN configuracion_sistema.clave IS
'Identificador del parámetro en snake_case. Ej: recargo_colegiatura_monto';

COMMENT ON COLUMN configuracion_sistema.valor IS
'Contenido siempre como texto. El backend lo convierte segun tipo_dato.';

COMMENT ON COLUMN configuracion_sistema.tipo_dato IS
'Indica al backend cómo parsear el valor: int, decimal, bool, json o string.';

COMMENT ON COLUMN configuracion_sistema.ciclo_id IS
'NULL = parámetro global. Si tiene valor, es override para ese ciclo.';

-- ---------------------------------------------------------------------
-- 2. Índices auxiliares
-- ---------------------------------------------------------------------
-- Búsqueda más común del backend: "dame el valor global de esta clave".
CREATE INDEX IF NOT EXISTS idx_configuracion_clave_global
    ON configuracion_sistema (clave)
    WHERE ciclo_id IS NULL;

-- ---------------------------------------------------------------------
-- 3. Seeds: valores iniciales del negocio
--    Todos globales (ciclo_id IS NULL) en el arranque.
-- ---------------------------------------------------------------------

-- 3.1  Recargos (RF-22, RF-33)
INSERT INTO configuracion_sistema (clave, valor, tipo_dato, descripcion) VALUES
    ('recargo_colegiatura_monto', '400.00', 'decimal',
     'RF-22: monto fijo de recargo aplicado cuando la colegiatura se paga después del día tope.'),
    ('recargo_dia_tope_mes',      '5',      'int',
     'RF-22: día del mes a partir del cual se considera atrasado el pago de colegiatura.')
ON CONFLICT (clave, ciclo_id) DO NOTHING;

-- 3.2  Bajas automáticas y plazos (RF-30, RF-45)
INSERT INTO configuracion_sistema (clave, valor, tipo_dato, descripcion) VALUES
    ('baja_temporal_meses_adeudo', '3',  'int',
     'RF-30: meses consecutivos de adeudo que disparan baja temporal automática.'),
    ('inscripcion_dias_gracia',    '60', 'int',
     'RF-45: plazo en días para liquidar inscripción, aranceles y materiales.')
ON CONFLICT (clave, ciclo_id) DO NOTHING;

-- 3.3  Notificaciones automáticas (RF-44, RF-46)
INSERT INTO configuracion_sistema (clave, valor, tipo_dato, descripcion) VALUES
    ('notif_dias_previos_pago',          '[5,3]', 'json',
     'RF-44: días previos al vencimiento en que se envía recordatorio al tutor.'),
    ('notif_dias_previos_inscripcion',   '5',     'int',
     'RF-45: días antes del vencimiento del plazo de 60 días para alertar al tutor.')
ON CONFLICT (clave, ciclo_id) DO NOTHING;

-- 3.4  Seguridad y acceso (RF-05, RNF-11)
INSERT INTO configuracion_sistema (clave, valor, tipo_dato, descripcion) VALUES
    ('login_max_intentos',       '5',  'int',
     'RF-05 / RNF-11: intentos fallidos consecutivos antes de bloquear la cuenta.'),
    ('login_minutos_bloqueo',    '30', 'int',
     'Duración (minutos) del bloqueo automático de la cuenta tras superar el máximo.')
ON CONFLICT (clave, ciclo_id) DO NOTHING;

-- 3.5  Notificaciones por correo SMTP (RNF-22)
--      Se dejan vacíos: el administrador los configurará desde el panel.
INSERT INTO configuracion_sistema (clave, valor, tipo_dato, descripcion) VALUES
    ('smtp_host',             '',    'string',
     'RNF-22: host del servidor SMTP de salida.'),
    ('smtp_puerto',           '587', 'int',
     'RNF-22: puerto SMTP (587 = STARTTLS, estándar).'),
    ('smtp_usuario',          '',    'string',
     'RNF-22: cuenta de servicio del SMTP.'),
    ('smtp_password_cifrado', '',    'string',
     'RNF-22: contraseña cifrada (NUNCA texto plano en producción).'),
    ('smtp_remitente_nombre', 'Colegio San Diego', 'string',
     'Nombre que aparece como remitente en los correos enviados.')
ON CONFLICT (clave, ciclo_id) DO NOTHING;

-- 3.6  Respaldos (RNF-08, RNF-23)
INSERT INTO configuracion_sistema (clave, valor, tipo_dato, descripcion) VALUES
    ('backup_ruta_local',  '',     'string',
     'RNF-23: ruta local donde se guardan los respaldos automáticos diarios.'),
    ('backup_hora_diaria', '02:00','string',
     'RNF-23: hora del día (formato HH:MM, 24h) para ejecutar el respaldo.')
ON CONFLICT (clave, ciclo_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Foreign keys diferidas (activar cuando existan ciclo_escolar y usuario)
-- ---------------------------------------------------------------------
-- Estas FK aseguran integridad referencial. Se dejan comentadas porque
-- las tablas referenciadas se crean en archivos posteriores. Cuando el
-- esquema base esté completo, descomenta o aplícalas vía migración.
--
-- ALTER TABLE configuracion_sistema
--     ADD CONSTRAINT fk_configuracion_ciclo
--     FOREIGN KEY (ciclo_id) REFERENCES ciclo_escolar(ciclo_id);
--
-- ALTER TABLE configuracion_sistema
--     ADD CONSTRAINT fk_configuracion_usuario
--     FOREIGN KEY (actualizado_por) REFERENCES usuario(usuario_id);

-- ---------------------------------------------------------------------
-- 5. Verificación rápida (no falla si todo está OK)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    total INT;
BEGIN
    SELECT COUNT(*) INTO total FROM configuracion_sistema;
    RAISE NOTICE 'configuracion_sistema inicializada con % parámetros.', total;
END $$;

-- =====================================================================
-- FIN del archivo
-- =====================================================================
