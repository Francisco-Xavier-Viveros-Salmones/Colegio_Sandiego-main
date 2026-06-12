-- =====================================================================
-- 02_calendario_pendiente_alumno.sql  (v5 - alineado con esquema v5)
-- SAE - Colegio San Diego | Consulta operativa para Backend
--
-- Cambios respecto a v4:
--   * Filtro AND cp.eliminado_en IS NULL en calendario_pago
--     (cargos eliminados administrativamente no aparecen).
--   * Filtro defensivo en ciclo_escolar.
--   * En la Versión B comentada, mismo filtro + alumno.eliminado_en IS NULL.
--
-- Parámetros:
--   $1 : alumno_id (INT)
--
-- Versión utilizada: A — vencimiento por fecha de calendario.
-- =====================================================================

-- =====================================================================
-- VERSIÓN A (PRINCIPAL): Vencimiento por fecha de calendario
-- =====================================================================
SELECT
    cp.calendario_pago_id,
    cp.concepto,
    cp.mes,
    cp.fecha_vencimiento,
    cp.monto_original,
    cp.monto_pagado,
    cp.monto_recargo,
    cp.saldo_pendiente,
    cp.estado_cobro,
    (CURRENT_DATE - cp.fecha_vencimiento)::INT AS dias_atraso,
    CASE
        WHEN cp.estado_cobro IN ('pagado','condonado') THEN FALSE
        WHEN cp.fecha_vencimiento < CURRENT_DATE       THEN TRUE
        ELSE FALSE
    END AS vencido,
    ce.nombre AS ciclo_nombre
FROM calendario_pago cp
INNER JOIN ciclo_escolar ce
       ON ce.ciclo_id     = cp.ciclo_id
      AND ce.eliminado_en IS NULL
WHERE cp.alumno_id      = $1
  AND cp.eliminado_en   IS NULL
  AND cp.estado_cobro   NOT IN ('pagado','condonado')
  AND cp.saldo_pendiente > 0
ORDER BY cp.fecha_vencimiento ASC;

-- =====================================================================
-- VERSIÓN B (ALTERNATIVA, COMENTADA): Vencimiento por dia_limite_pago
-- =====================================================================
-- WITH dia_limite_global AS (
--     SELECT valor::INT AS dia
--     FROM configuracion_sistema
--     WHERE clave = 'recargo_dia_tope_mes' AND ciclo_id IS NULL
-- )
-- SELECT
--     cp.calendario_pago_id,
--     cp.concepto,
--     cp.mes,
--     cp.fecha_vencimiento,
--     cp.monto_original,
--     cp.monto_pagado,
--     cp.monto_recargo,
--     cp.saldo_pendiente,
--     cp.estado_cobro,
--     COALESCE(a.dia_limite_pago, (SELECT dia FROM dia_limite_global)) AS dia_limite_efectivo,
--     CASE
--         WHEN cp.estado_cobro IN ('pagado','condonado') THEN FALSE
--         WHEN cp.concepto = 'colegiatura'
--              AND date_trunc('month', cp.fecha_vencimiento) = date_trunc('month', CURRENT_DATE)
--              AND EXTRACT(DAY FROM CURRENT_DATE) >
--                  COALESCE(a.dia_limite_pago, (SELECT dia FROM dia_limite_global))
--         THEN TRUE
--         WHEN cp.fecha_vencimiento < CURRENT_DATE THEN TRUE
--         ELSE FALSE
--     END AS vencido_por_dia_limite
-- FROM calendario_pago cp
-- INNER JOIN alumno a
--        ON a.alumno_id     = cp.alumno_id
--       AND a.eliminado_en  IS NULL
-- INNER JOIN ciclo_escolar ce
--        ON ce.ciclo_id     = cp.ciclo_id
--       AND ce.eliminado_en IS NULL
-- WHERE cp.alumno_id      = $1
--   AND cp.eliminado_en   IS NULL
--   AND cp.estado_cobro   NOT IN ('pagado','condonado')
--   AND cp.saldo_pendiente > 0
-- ORDER BY cp.fecha_vencimiento ASC;