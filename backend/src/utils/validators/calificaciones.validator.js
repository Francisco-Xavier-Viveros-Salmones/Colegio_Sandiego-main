'use strict';

const { body } = require('express-validator');
const { PERIODOS_VALIDOS } = require('../constants');

const guardarCalificacionValidators = [
  body('alumnoId')
    .isInt({ min: 1 }).withMessage('El alumnoId es obligatorio.'),

  body('grupoMateriaId')
    .isInt({ min: 1 }).withMessage('El grupoMateriaId es obligatorio.'),

  body('periodo')
    .notEmpty().withMessage('El periodo es obligatorio.')
    .isIn(PERIODOS_VALIDOS)
    .withMessage(`El periodo debe ser: ${PERIODOS_VALIDOS.join(', ')}.`),

  body('valor')
    .isFloat({ min: 0, max: 10 }).withMessage('La calificación debe ser un número entre 0 y 10.'),
];

const guardarCalificacionesLoteValidators = [
  body('calificaciones')
    .isArray({ min: 1 }).withMessage('Se requiere un array de calificaciones.'),

  body('calificaciones.*.alumnoId')
    .isInt({ min: 1 }).withMessage('Cada calificación requiere un alumnoId válido.'),

  body('calificaciones.*.grupoMateriaId')
    .isInt({ min: 1 }).withMessage('Cada calificación requiere un grupoMateriaId válido.'),

  body('calificaciones.*.periodo')
    .isIn(PERIODOS_VALIDOS)
    .withMessage('Periodo inválido en algún registro.'),

  body('calificaciones.*.valor')
    .isFloat({ min: 0, max: 10 }).withMessage('Valor de calificación inválido.'),
];

module.exports = { guardarCalificacionValidators, guardarCalificacionesLoteValidators };
