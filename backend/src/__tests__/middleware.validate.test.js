/**
 * SAE — Test: middleware/validate.middleware.js — validate()
 *
 * Casos cubiertos:
 *   - Cero errores de validación → llama next() sin responder
 *   - Un campo requerido vacío → 422 y NO llama next()
 *   - Múltiples campos inválidos → 422 con array de errores
 *   - Estructura de respuesta: ok:false, message, errors[{campo, mensaje}]
 *   - loginValidators reales + body inválido → 422
 *   - loginValidators reales + body válido → next()
 *
 * Estrategia: ejecutar los validators de express-validator mediante `.run(req)`
 * programático y luego llamar directamente al middleware validate().
 * No requiere servidor HTTP ni BD.
 */

'use strict';

process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

const { body }              = require('express-validator');
const { validate }          = require('../middleware/validate.middleware');
const { loginValidators }   = require('../utils/validators/auth.validator');

// ── Helper ─────────────────────────────────────────────────────

function mockRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

/**
 * Ejecuta un array de express-validator chains sobre un body simulado.
 * Retorna el req enriquecido con el contexto de validación.
 */
async function runValidators(validators, reqBody = {}) {
  const req = {
    body:    reqBody,
    query:   {},
    params:  {},
    headers: {},
    cookies: {},
  };
  for (const v of validators) {
    await v.run(req);
  }
  return req;
}

// ── Suite — validate() directo ────────────────────────────────
describe('middleware — validate', () => {
  // ── Sin errores ──────────────────────────────────────────────

  test('sin errores de validación → llama next()', async () => {
    const next      = vi.fn();
    const validator = body('campo').notEmpty();
    const req       = await runValidators([validator], { campo: 'valor' });
    const res       = mockRes();

    validate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('múltiples campos válidos → llama next()', async () => {
    const next = vi.fn();
    const validators = [
      body('username').notEmpty(),
      body('password').notEmpty().isLength({ min: 6 }),
    ];
    const req = await runValidators(validators, { username: 'admin', password: 'pass123' });
    const res = mockRes();

    validate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  // ── Con errores ──────────────────────────────────────────────

  test('campo requerido vacío → responde 422', async () => {
    const next      = vi.fn();
    const validator = body('username').notEmpty().withMessage('Username requerido');
    const req       = await runValidators([validator], { username: '' });
    const res       = mockRes();

    validate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  test('campo requerido ausente → 422 y NO llama next()', async () => {
    const next      = vi.fn();
    const validator = body('email').isEmail().withMessage('Email inválido');
    const req       = await runValidators([validator], {}); // sin email
    const res       = mockRes();

    validate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Estructura de respuesta 422 ──────────────────────────────

  test('respuesta 422 tiene ok:false y message', async () => {
    const next      = vi.fn();
    const validator = body('campo').notEmpty().withMessage('Campo requerido');
    const req       = await runValidators([validator], { campo: '' });
    const res       = mockRes();

    validate(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok:      false,
        message: 'Datos de entrada inválidos.',
      })
    );
  });

  test('respuesta 422 tiene array errors con {campo, mensaje}', async () => {
    const next      = vi.fn();
    const validator = body('email').isEmail().withMessage('Email inválido');
    const req       = await runValidators([validator], { email: 'no-es-email' });
    const res       = mockRes();

    validate(req, res, next);

    const body_resp = res.json.mock.calls[0][0];
    expect(Array.isArray(body_resp.errors)).toBe(true);
    expect(body_resp.errors[0]).toMatchObject({
      campo:   'email',
      mensaje: 'Email inválido',
    });
  });

  test('múltiples errores → errors contiene uno por cada campo inválido', async () => {
    const next = vi.fn();
    const validators = [
      body('username').notEmpty().withMessage('Username requerido'),
      body('password').isLength({ min: 6 }).withMessage('Password muy corto'),
    ];
    const req = await runValidators(validators, { username: '', password: '123' });
    const res = mockRes();

    validate(req, res, next);

    const body_resp = res.json.mock.calls[0][0];
    expect(body_resp.errors.length).toBeGreaterThanOrEqual(2);
  });

  // ── loginValidators reales ────────────────────────────────────

  test('loginValidators + body válido → llama next()', async () => {
    const next = vi.fn();
    const req  = await runValidators(loginValidators, {
      username: 'admin.test',
      password: 'Contraseña123',
    });
    const res = mockRes();

    validate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  test('loginValidators + username vacío → 422', async () => {
    const next = vi.fn();
    const req  = await runValidators(loginValidators, {
      username: '',
      password: 'Contraseña123',
    });
    const res = mockRes();

    validate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  test('loginValidators + password corta (< 6 chars) → 422', async () => {
    const next = vi.fn();
    const req  = await runValidators(loginValidators, {
      username: 'admin',
      password: '123',
    });
    const res = mockRes();

    validate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  test('loginValidators + body completamente vacío → 422', async () => {
    const next = vi.fn();
    const req  = await runValidators(loginValidators, {});
    const res  = mockRes();

    validate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });
});
