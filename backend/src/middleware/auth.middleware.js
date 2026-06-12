/**
 * SAE — Middleware de Autenticación JWT
 * Verifica el token Bearer en el header Authorization.
 * Inyecta req.usuario con el payload del token validado.
 */

'use strict';

const { verifyToken } = require('../utils/jwt.utils');

/**
 * Middleware principal de autenticación.
 * Rechaza con 401 cualquier petición sin token válido.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      message: 'No autorizado. Se requiere token de acceso.',
    });
  }

  const token = authHeader.split(' ')[1];

  const { valid, payload, error } = verifyToken(token);

  if (!valid) {
    const message =
      error === 'TokenExpiredError'
        ? 'Sesión expirada. Vuelve a iniciar sesión.'
        : 'Token inválido. No autorizado.';

    return res.status(401).json({ ok: false, message });
  }

  // Inyectar datos del usuario en la request
  req.usuario = payload;
  next();
}

module.exports = { authenticate };
