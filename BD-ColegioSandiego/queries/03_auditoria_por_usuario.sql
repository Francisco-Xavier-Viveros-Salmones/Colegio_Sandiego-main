-- =====================================================================
-- 03_auditoria_por_usuario.sql  (v5 - alineado con esquema v5)
-- SAE - Colegio San Diego | Consulta operativa para Backend
--
-- Cambios respecto a v4:
--   * log_auditoria es Categoría A (histórica pura): NO tiene eliminado_en
--     y NO requiere filtro. Los logs son inmutables por diseño.
--   * usuario es Categoría C (tiene eliminado_en). Como se usa con
--     LEFT JOIN para enriquecer con el nombre del operador, NO se filtra
--     por eliminado_en: queremos seguir viendo el historial de acciones
--     aunque la cuenta del operador haya sido eliminada. El nombre
--     aparecerá como NULL si la cuenta ya no existe.
--
-- Parámetros (sin cambios):
--   $1 : usuario_id
--   $2 : fecha_desde (TIMESTAMPTZ, nullable)
--   $3 : fecha_hasta (TIMESTAMPTZ, nullable)
--   $4 : limite (INT)
--   $5 : offset (INT)
-- =====================================================================

SELECT
    la.log_id,
    la.fecha_hora,
    la.accion,
    la.tabla_afectada,
    la.registro_id,
    la.direccion_ip,
    la.descripcion,
    la.valores_antes,
    la.valores_despues,
    la.usuario_id,
    u.nombre_usuario,
    u.nombre_completo AS usuario_nombre,
    -- Indicador defensivo: si la cuenta fue eliminada después de la acción
    (u.eliminado_en IS NOT NULL) AS usuario_eliminado_posteriormente
FROM log_auditoria la
LEFT JOIN usuario u ON u.usuario_id = la.usuario_id
WHERE la.usuario_id = $1
  AND ($2::TIMESTAMPTZ IS NULL OR la.fecha_hora >= $2)
  AND ($3::TIMESTAMPTZ IS NULL OR la.fecha_hora <= $3)
ORDER BY la.fecha_hora DESC, la.log_id DESC
LIMIT  $4
OFFSET $5;