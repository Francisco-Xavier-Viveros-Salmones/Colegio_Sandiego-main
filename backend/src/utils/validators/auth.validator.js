'use strict';

const { body } = require('express-validator');

const loginValidators = [
  body('username')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es obligatorio.')
    .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres.'),

  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
];

module.exports = { loginValidators };
