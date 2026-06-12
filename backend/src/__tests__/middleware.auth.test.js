/**
 * SAE — Test: middleware/auth.middleware.js — authenticate()
 *
 * Casos cubiertos:
 *   - Sin header Authorization → 401
 *   - Header presente pero sin prefijo "Bearer " → 401
 *   - Token inválido (string aleatorio) → 401
 *   - Token con firma falsificada → 401
 *   - Token válido → inyecta req.usuario y llama next()
 *   - Token válido → req.usuario contiene id, username, nombre, rol
 *
 * Estrategia: llamada directa al middleware con objetos mock de req/res/next.
 * No requiere BD. Usa tokens generados con la misma clave de test.
 */

'use strict';

process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

const { authenticate } = require('../middleware/auth.middleware');
const { generateToken } = require('../utils/jwt.utils');

// ── Helper ─────────────────────────────────────────────────────
function mockRes() {
  const res = {
    status: vi.fn(),
    json:   vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

const PAYLOAD_MOCK = {
  id:       1,
  nombre:   'Admin Test',
  username: 'admin.test',
  rol:      'ADMIN',
};

// ── Suite ──────────────────────────────────────────────────────
describe('middleware — authenticate', () => {
  let next;

  beforeEach(() => {
    next = vi.fn();
  });

  // ── Sin token ───────────────────────────────────────────────

  test('sin header Authorization → responde 401', () => {
    const req = { headers: {} };
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false })
    );
  });

  test('sin header Authorization → NO llama next()', () => {
    const req = { headers: {} };
    const res = mockRes();
    authenticate(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Header mal formado ───────────────────────────────────────

  test('header "Token abc" (sin prefijo Bearer) → 401', () => {
    const req = { headers: { authorization: 'Token abc123' } };
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('header "Basic base64" → 401', () => {
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Token inválido ───────────────────────────────────────────

  test('token inválido (string aleatorio) → 401', () => {
    const req = { headers: { authorization: 'Bearer token.invalido.aqui' } };
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('token con firma falsificada → 401', () => {
    const token = generateToken(PAYLOAD_MOCK);
    const [header, payload] = token.split('.');
    const tokenFalso = `${header}.${payload}.firmaFalsificada`;
    const req = { headers: { authorization: `Bearer ${tokenFalso}` } };
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('token con payload manipulado → 401', () => {
    const payloadManipulado = Buffer.from(
      JSON.stringify({ id: 999, rol: 'ADMIN', iss: 'sae-sandiego' })
    ).toString('base64url');
    const token   = generateToken(PAYLOAD_MOCK);
    const [h, , s] = token.split('.');
    const tokenManipulado = `${h}.${payloadManipulado}.${s}`;
    const req = { headers: { authorization: `Bearer ${tokenManipulado}` } };
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Token válido ─────────────────────────────────────────────

  test('token válido → llama next() una vez', () => {
    const token = generateToken(PAYLOAD_MOCK);
    const req   = { headers: { authorization: `Bearer ${token}` } };
    const res   = mockRes();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('token válido → inyecta req.usuario con id correcto', () => {
    const token = generateToken(PAYLOAD_MOCK);
    const req   = { headers: { authorization: `Bearer ${token}` } };
    authenticate(req, mockRes(), next);
    expect(req.usuario).toBeDefined();
    expect(req.usuario.id).toBe(PAYLOAD_MOCK.id);
  });

  test('token válido → inyecta req.usuario con rol y username correctos', () => {
    const token = generateToken(PAYLOAD_MOCK);
    const req   = { headers: { authorization: `Bearer ${token}` } };
    authenticate(req, mockRes(), next);
    expect(req.usuario.rol).toBe('ADMIN');
    expect(req.usuario.username).toBe('admin.test');
  });

  test('token válido para GESTOR → inyecta rol GESTOR', () => {
    const token = generateToken({ ...PAYLOAD_MOCK, rol: 'GESTOR' });
    const req   = { headers: { authorization: `Bearer ${token}` } };
    authenticate(req, mockRes(), next);
    expect(req.usuario.rol).toBe('GESTOR');
    expect(next).toHaveBeenCalledOnce();
  });

  test('token válido para MAESTRA → inyecta rol MAESTRA', () => {
    const token = generateToken({ ...PAYLOAD_MOCK, rol: 'MAESTRA' });
    const req   = { headers: { authorization: `Bearer ${token}` } };
    authenticate(req, mockRes(), next);
    expect(req.usuario.rol).toBe('MAESTRA');
    expect(next).toHaveBeenCalledOnce();
  });
});
