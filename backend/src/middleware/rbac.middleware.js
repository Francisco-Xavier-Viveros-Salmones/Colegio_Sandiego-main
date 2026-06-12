/**
 * SAE — Middleware de Control de Acceso por Rol (RBAC)
 * Verifica que el usuario autenticado tenga el rol requerido.
 *
 * Roles del sistema (orden jerárquico descendente):
 *   ADMIN   → acceso total
 *   GESTOR  → acceso administrativo parcial
 *   MAESTRA → acceso académico restringido
 *
 * Uso en rutas:
 *   router.post('/usuarios', authenticate, authorize('ADMIN'), controller.crear)
 *   router.get('/alumnos', authenticate, authorize('ADMIN', 'GESTOR'), controller.listar)
 */

'use strict';

/**
 * Genera un middleware que valida el rol del usuario.
 * @param {...string} rolesPermitidos - Roles que pueden acceder a la ruta
 * @returns {Function} Middleware Express
 */
function authorize(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        message: 'No autenticado. Ejecuta authenticate antes de authorize.',
      });
    }

    const rolUsuario = req.usuario.rol;

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        ok: false,
        message: `Acceso denegado. Tu rol (${rolUsuario}) no tiene permisos para esta acción.`,
        rolesRequeridos: rolesPermitidos,
      });
    }

    next();
  };
}

/**
 * Atajos de autorización por combinaciones de roles frecuentes
 */
const soloAdmin           = authorize('ADMIN');
const adminOGestor        = authorize('ADMIN', 'GESTOR');
const todosLosRoles       = authorize('ADMIN', 'GESTOR', 'MAESTRA');

module.exports = { authorize, soloAdmin, adminOGestor, todosLosRoles };
