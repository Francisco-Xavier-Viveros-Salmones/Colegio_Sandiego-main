/**
 * SAE — Test: hash.utils.js
 *
 * Tests unitarios para hashPassword / comparePassword (bcryptjs).
 * Usa BCRYPT_ROUNDS=1 (env) para velocidad en CI.
 * globals: true → vi disponible sin require. Paths: src/__tests__/ → ../
 */

'use strict';

process.env.JWT_SECRET    = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL  = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV      = 'test';
process.env.BCRYPT_ROUNDS = '1'; // Acelerar hash en tests

// No vi.mock necesario — hash.utils no depende de BD ni de mocks
// Cargamos directamente con la env ya configurada
const { hashPassword, comparePassword } = require('../utils/hash.utils');

describe('hash.utils — hashPassword / comparePassword', () => {
  const PASSWORD_PLAIN = 'MiContraseña123!';
  let hashGenerado;

  // Genera el hash una sola vez y lo reutiliza en los tests de comparación
  beforeAll(async () => {
    hashGenerado = await hashPassword(PASSWORD_PLAIN);
  });

  test('hashPassword retorna un string no vacío', () => {
    expect(typeof hashGenerado).toBe('string');
    expect(hashGenerado.length).toBeGreaterThan(0);
  });

  test('hashPassword genera hash bcrypt (inicia con $2b$ o $2a$)', () => {
    expect(hashGenerado).toMatch(/^\$2[ab]\$/);
  });

  test('hashPassword genera hashes distintos por cada llamada (salt único)', async () => {
    const hash2 = await hashPassword(PASSWORD_PLAIN);
    expect(hashGenerado).not.toBe(hash2);
  });

  test('comparePassword retorna true para contraseña correcta', async () => {
    const resultado = await comparePassword(PASSWORD_PLAIN, hashGenerado);
    expect(resultado).toBe(true);
  });

  test('comparePassword retorna false para contraseña incorrecta', async () => {
    const resultado = await comparePassword('ContraseñaEquivocada!', hashGenerado);
    expect(resultado).toBe(false);
  });

  test('comparePassword retorna false para string vacío', async () => {
    const resultado = await comparePassword('', hashGenerado);
    expect(resultado).toBe(false);
  });
});
