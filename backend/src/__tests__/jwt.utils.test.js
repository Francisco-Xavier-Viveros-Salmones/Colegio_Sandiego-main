/**
 * SAE — Test: Utilidades JWT
 *
 * Verifica generación y verificación de tokens con el payload correcto.
 * No requiere BD.
 */

'use strict';

// Configurar variables de entorno antes de cargar el módulo
process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

// Ruta: src/__tests__/ → ../utils/
const { generateToken, verifyToken } = require('../utils/jwt.utils');

const payloadMock = {
  id:       42,
  nombre:   'Test Usuario',
  username: 'test.user',
  rol:      'ADMIN',
};

describe('jwt.utils — generateToken', () => {
  test('genera un token JWT con formato correcto (3 partes separadas por puntos)', () => {
    const token = generateToken(payloadMock);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('jwt.utils — verifyToken', () => {
  let token;

  beforeEach(() => {
    token = generateToken(payloadMock);
  });

  test('verifica un token válido y retorna { valid: true, payload }', () => {
    const result = verifyToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.payload.id).toBe(42);
    expect(result.payload.rol).toBe('ADMIN');
    expect(result.payload.username).toBe('test.user');
  });

  test('el payload incluye iat (issued at) y exp (expires)', () => {
    const { payload } = verifyToken(token);
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  test('retorna { valid: false } con token inválido (cadena aleatoria)', () => {
    const result = verifyToken('token.invalido.aqui');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('retorna { valid: false } con firma manipulada', () => {
    const [h, p] = token.split('.');
    const tokenFalso = `${h}.${p}.firma-falsa-xxx`;
    const result = verifyToken(tokenFalso);
    expect(result.valid).toBe(false);
  });
});
