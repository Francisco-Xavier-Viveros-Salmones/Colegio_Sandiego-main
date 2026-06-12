/**
 * SAE — Utilidades de Respuesta HTTP
 * Estandariza el formato de todas las respuestas de la API.
 *
 * Formato estándar:
 *   { ok: true,  data: ..., message: '...' }
 *   { ok: false, message: '...' }
 */

'use strict';

/**
 * Respuesta exitosa (2xx)
 */
function success(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    ok: true,
    message,
    data,
  });
}

/**
 * Respuesta de creación exitosa (201)
 */
function created(res, data = null, message = 'Recurso creado correctamente') {
  return success(res, data, message, 201);
}

/**
 * Respuesta de error de cliente (4xx)
 */
function clientError(res, message = 'Petición inválida', statusCode = 400) {
  return res.status(statusCode).json({
    ok: false,
    message,
  });
}

/**
 * Respuesta 404
 */
function notFound(res, message = 'Recurso no encontrado') {
  return clientError(res, message, 404);
}

/**
 * Respuesta 403 Forbidden
 */
function forbidden(res, message = 'No tienes permisos para esta acción') {
  return clientError(res, message, 403);
}

/**
 * Respuesta de error del servidor (500)
 */
function serverError(res, message = 'Error interno del servidor') {
  return res.status(500).json({
    ok: false,
    message,
  });
}

module.exports = { success, created, clientError, notFound, forbidden, serverError };
