-- =====================================================================
-- 04_deudores_por_familia.sql  (v5 - alineado con esquema v5)
-- SAE - Colegio San Diego | Consulta operativa para Backend
--
-- Cambios respecto a v4:
--   * Rename: padre → tutor; p.padre_id → t.tutor_id en todo.
--   * Filtros eliminado_en IS NULL en: calendario_pago, alumno,
--     inscripcion_ciclo, tutor_alumno, tutor (todas Categoría C).
--   * Filtros defensivos en ciclo_escolar.
--
-- Modelo de "familia": Opción 1 — responsable financiero principal.
-- Criterio de morosidad: moderada (1+ días por defecto vía $2).
--
-- Parámetros:
--   $1 : ciclo_id (nullable, NULL = ciclo activo)
--   $2 : dias_atraso_minimo (INT, recomendado: 1)
-- =====================================================================

WITH ciclo_objetivo AS (
    SELECT ciclo_id
    FROM ciclo_escolar
    WHERE ciclo_id = COALESCE(
              $1,
              (SELECT ciclo_id FROM ciclo_escolar
               WHERE activo = TRUE AND eliminado_en IS NULL
               LIMIT 1))
      AND eliminado_en IS NULL
),
cargos_vencidos AS (
    SELECT
        cp.alumno_id,
        cp.calendario_pago_id,
        cp.concepto,
        cp.mes,
        cp.fecha_vencimiento,
        cp.saldo_pendiente,
        (CURRENT_DATE - cp.fecha_vencimiento)::INT AS dias_atraso
    FROM calendario_pago cp
    WHERE cp.ciclo_id        = (SELECT ciclo_id FROM ciclo_objetivo)
      AND cp.eliminado_en    IS NULL
      AND cp.estado_cobro    NOT IN ('pagado','condonado')
      AND cp.saldo_pendiente > 0
      AND cp.fecha_vencimiento < CURRENT_DATE
      AND (CURRENT_DATE - cp.fecha_vencimiento) >= $2
)
SELECT
    t.tutor_id                                   AS tutor_id,
    t.nombre_completo                            AS tutor_nombre,
    t.telefono                                   AS tutor_telefono,
    t.correo_electronico                         AS tutor_correo,
    t.requiere_factura                           AS tutor_requiere_factura,
    SUM(cv.saldo_pendiente)                      AS deuda_total,
    MAX(cv.dias_atraso)                          AS dias_atraso_maximo,
    MIN(cv.fecha_vencimiento)                    AS fecha_mas_antigua_vencida,
    COUNT(DISTINCT cv.alumno_id)                 AS cantidad_hijos_con_adeudo,
    COUNT(*)                                     AS cantidad_cargos_vencidos,
    STRING_AGG(DISTINCT a.nombre_completo, ', ' ORDER BY a.nombre_completo) AS alumnos_con_adeudo,
    (SELECT cv2.concepto || ' ' || COALESCE(cv2.mes, '')
       FROM cargos_vencidos cv2
       JOIN tutor_alumno ta2
         ON ta2.alumno_id = cv2.alumno_id
       WHERE ta2.tutor_id = t.tutor_id
         AND ta2.es_responsable_financiero = TRUE
         AND ta2.activo = TRUE
         AND ta2.eliminado_en IS NULL
       ORDER BY cv2.fecha_vencimiento ASC
       LIMIT 1)                                  AS cargo_mas_antiguo
FROM cargos_vencidos cv
INNER JOIN alumno a
        ON a.alumno_id    = cv.alumno_id
       AND a.eliminado_en IS NULL
INNER JOIN inscripcion_ciclo ic
        ON ic.alumno_id    = a.alumno_id
       AND ic.ciclo_id     = (SELECT ciclo_id FROM ciclo_objetivo)
       AND ic.eliminado_en IS NULL
INNER JOIN tutor_alumno ta
        ON ta.alumno_id    = a.alumno_id
       AND ta.eliminado_en IS NULL
INNER JOIN tutor t
        ON t.tutor_id      = ta.tutor_id
       AND t.eliminado_en  IS NULL
WHERE a.estado                       = 'Activo'
  AND ic.estado_en_ciclo             = 'activa'
  AND ta.es_responsable_financiero   = TRUE
  AND ta.activo                      = TRUE
GROUP BY t.tutor_id, t.nombre_completo, t.telefono, t.correo_electronico, t.requiere_factura
ORDER BY dias_atraso_maximo DESC, deuda_total DESC;


-- =====================================================================
-- OPCIÓN 3 (ALTERNATIVA, COMENTADA): por alumno con tutores concatenados
-- =====================================================================
-- WITH ciclo_objetivo AS (
--     SELECT ciclo_id
--     FROM ciclo_escolar
--     WHERE ciclo_id = COALESCE(
--               $1,
--               (SELECT ciclo_id FROM ciclo_escolar
--                WHERE activo = TRUE AND eliminado_en IS NULL
--                LIMIT 1))
--       AND eliminado_en IS NULL
-- )
-- SELECT
--     a.alumno_id,
--     a.matricula,
--     a.nombre_completo                        AS alumno_nombre,
--     g.nombre                                 AS grupo_nombre,
--     ne.nombre                                AS nivel_nombre,
--     SUM(cp.saldo_pendiente)                  AS deuda_total_alumno,
--     MAX((CURRENT_DATE - cp.fecha_vencimiento)::INT) AS dias_atraso_maximo,
--     MIN(cp.fecha_vencimiento)                AS fecha_mas_antigua_vencida,
--     COUNT(*)                                 AS cantidad_cargos_vencidos,
--     (SELECT STRING_AGG(t.nombre_completo, ', ' ORDER BY t.nombre_completo)
--        FROM tutor_alumno ta
--        JOIN tutor t ON t.tutor_id = ta.tutor_id AND t.eliminado_en IS NULL
--        WHERE ta.alumno_id = a.alumno_id
--          AND ta.es_responsable_financiero = TRUE
--          AND ta.activo = TRUE
--          AND ta.eliminado_en IS NULL)         AS tutores_responsables,
--     (SELECT STRING_AGG(t.telefono, ' / ')
--        FROM tutor_alumno ta
--        JOIN tutor t ON t.tutor_id = ta.tutor_id AND t.eliminado_en IS NULL
--        WHERE ta.alumno_id = a.alumno_id
--          AND ta.es_responsable_financiero = TRUE
--          AND ta.activo = TRUE
--          AND ta.eliminado_en IS NULL
--          AND t.telefono IS NOT NULL)          AS telefonos_responsables
-- FROM alumno a
-- INNER JOIN inscripcion_ciclo ic
--         ON ic.alumno_id     = a.alumno_id
--        AND ic.ciclo_id      = (SELECT ciclo_id FROM ciclo_objetivo)
--        AND ic.eliminado_en  IS NULL
-- INNER JOIN grupo g
--         ON g.grupo_id       = ic.grupo_id
--        AND g.eliminado_en   IS NULL
-- INNER JOIN nivel_educativo ne
--         ON ne.nivel_id      = g.nivel_id
--        AND ne.eliminado_en  IS NULL
-- INNER JOIN calendario_pago cp
--         ON cp.alumno_id     = a.alumno_id
--        AND cp.ciclo_id      = (SELECT ciclo_id FROM ciclo_objetivo)
--        AND cp.eliminado_en  IS NULL
-- WHERE a.estado                       = 'Activo'
--   AND a.eliminado_en                 IS NULL
--   AND ic.estado_en_ciclo             = 'activa'
--   AND cp.estado_cobro                NOT IN ('pagado','condonado')
--   AND cp.saldo_pendiente             > 0
--   AND cp.fecha_vencimiento           < CURRENT_DATE
--   AND (CURRENT_DATE - cp.fecha_vencimiento) >= $2
-- GROUP BY a.alumno_id, a.matricula, a.nombre_completo, g.nombre, ne.nombre
-- ORDER BY dias_atraso_maximo DESC, deuda_total_alumno DESC;