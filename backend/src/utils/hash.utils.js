/**
 * SAE — Utilidades de Hash (bcryptjs)
 * Centraliza el hashing y verificación de contraseñas.
 */

'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config/env');

/**
 * Genera el hash de una contraseña.
 * @param {string} plainPassword - Contraseña en texto plano
 * @returns {Promise<string>} Hash de bcrypt
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, config.security.bcryptRounds);
}

/**
 * Compara una contraseña en texto plano contra un hash.
 * @param {string} plainPassword - Contraseña ingresada por el usuario
 * @param {string} hashedPassword - Hash almacenado en DB
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = { hashPassword, comparePassword };
