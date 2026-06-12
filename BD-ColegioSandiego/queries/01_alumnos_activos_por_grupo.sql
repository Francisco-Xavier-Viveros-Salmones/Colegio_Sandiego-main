-- =====================================================================
-- 01_alumnos_activos_por_grupo.sql  (v5 - alineado con esquema v5)
-- SAE - Colegio San Diego | Consulta operativa para Backend
--
-- Cambios respecto a v4:
--   * Rename: padre → tutor; padre_id → tutor_id (interno de tutor_alumno).
--   * Filtros eliminado_en IS NULL en: alumno, inscripcion_ciclo,
--     tutor_alumno, tutor (todas Categoría C, requieren el filtro).
--   * grupo, ciclo_escolar, nivel_educativo también filtran defensivamente.
--
-- Parámetros:
--   $1 : grupo_id (INT)
--
-- Garantías:
--   * alumno.estado = 'Activo' AND alumno.eliminado_en IS NULL
--   * inscripcion_ciclo.estado_en_ciclo = 'activa' AND eliminado_en IS NULL
--   * tutor_alumno.es_responsable_financiero = TRUE AND activo AND eliminado_en IS NULL
--   * Si hay varios responsables financieros, devuelve el más antiguo y
--     reporta el conteo en cantidad_responsables_financieros.
-- =====================================================================

SELECT
    a.alumno_id,
    a.matricula,
    a.nombre_completo                       AS alumno_nombre,
    a.curp,
    a.fecha_nacimiento,
    a.sexo,
    -- Tutor responsable financiero principal
    t.tutor_id                              AS tutor_id,
    t.nombre_completo                       AS tutor_nombre,
    t.telefono                              AS tutor_telefono,
    t.correo_electronico                    AS tutor_correo,
    t.requiere_factura                      AS tutor_requiere_factura,
    tutor_meta.tipo_relacion                AS tutor_tipo_relacion,
    COALESCE(resp_count.total, 0)           AS cantidad_responsables_financieros,
    -- Datos de la inscripción
    ic.plan_pago,
    ic.fecha_ingreso,
    ic.estado_en_ciclo,
    -- Día tope de pago efectivo
    COALESCE(
        a.dia_limite_pago,
        (SELECT valor::INT
           FROM configuracion_sistema
          WHERE clave = 'recargo_dia_tope_mes' AND ciclo_id IS NULL)
    )                                       AS dia_limite_pago_efectivo,
    -- Contexto del grupo
    g.nombre                                AS grupo_nombre,
    ne.nombre                               AS nivel_nombre,
    ce.nombre                               AS ciclo_nombre
FROM alumno a
INNER JOIN inscripcion_ciclo ic ON ic.alumno_id = a.alumno_id
INNER JOIN grupo g              ON g.grupo_id   = ic.grupo_id
INNER JOIN ciclo_escolar ce     ON ce.ciclo_id  = ic.ciclo_id
INNER JOIN nivel_educativo ne   ON ne.nivel_id  = g.nivel_id
LEFT JOIN LATERAL (
    SELECT ta.tutor_id, ta.tipo_relacion
    FROM tutor_alumno ta
    WHERE ta.alumno_id                = a.alumno_id
      AND ta.es_responsable_financiero = TRUE
      AND ta.activo                    = TRUE
      AND ta.eliminado_en              IS NULL
    ORDER BY ta.creado_en ASC
    LIMIT 1
) tutor_meta ON TRUE
LEFT JOIN tutor t
       ON t.tutor_id     = tutor_meta.tutor_id
      AND t.eliminado_en IS NULL
LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS total
    FROM tutor_alumno ta
    WHERE ta.alumno_id                = a.alumno_id
      AND ta.es_responsable_financiero = TRUE
      AND ta.activo                    = TRUE
      AND ta.eliminado_en              IS NULL
) resp_count ON TRUE
WHERE g.grupo_id            = $1
  AND a.estado              = 'Activo'
  AND a.eliminado_en        IS NULL
  AND ic.estado_en_ciclo    = 'activa'
  AND ic.eliminado_en       IS NULL
  AND g.eliminado_en        IS NULL
  AND ce.eliminado_en       IS NULL
  AND ne.eliminado_en       IS NULL
ORDER BY a.nombre_completo;