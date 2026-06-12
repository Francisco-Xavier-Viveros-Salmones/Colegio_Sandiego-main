'use strict';

const { body } = require('express-validator');
const { CONCEPTOS_PAGO_VALIDOS, METODOS_PAGO_VALIDOS } = require('../constants');

const crearPagoValidators = [
  body('alumnoId')
    .isInt({ min: 1 }).withMessage('El alumnoId debe ser un número entero válido.'),

  body('concepto')
    .notEmpty().withMessage('El concepto del pago es obligatorio.')
    .isIn(CONCEPTOS_PAGO_VALIDOS)
    .withMessage(`El concepto debe ser uno de: ${CONCEPTOS_PAGO_VALIDOS.join(', ')}.`),

  body('monto')
    .isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0.'),

  body('fecha')
    .notEmpty().withMessage('La fecha del pago es obligatoria.')
    .isISO8601().withMessage('La fecha debe tener formato ISO 8601 (YYYY-MM-DD).'),

  body('metodoPago')
    .optional({ nullable: true })
    .isIn(METODOS_PAGO_VALIDOS)
    .withMessage(`El método de pago debe ser uno de: ${METODOS_PAGO_VALIDOS.join(', ')}.`),

  body('observaciones')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Las observaciones no pueden exceder 500 caracteres.'),
];

module.exports = { crearPagoValidators };
