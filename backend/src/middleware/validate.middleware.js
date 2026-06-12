/**
 * SAE — Middleware de Validación de Inputs
 * Integra con express-validator para ejecutar y verificar
 * los resultados de validación definidos en cada ruta.
 *
 * Uso en rutas:
 *   router.post('/', authValidators.login, validate, controller.login)
 */

'use strict';

const { validationResult } = require('express-validator');

/**
 * Ejecuta la verificación de validaciones de express-validator.
 * Si hay errores, responde 422 con el detalle de cada campo.
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      ok: false,
      message: 'Datos de entrada inválidos.',
      errors: errors.array().map((e) => ({
        campo: e.path,
        mensaje: e.msg,
        valor: e.value,
      })),
    });
  }

  next();
}

module.exports = { validate };
