/**
 * SAE — Test: middleware/rbac.middleware.js — authorize()
 *
 * Casos cubiertos:
 *   - Sin req.usuario (authenticate no ejecutado antes) → 401
 *   - ADMIN en ruta soloAdmin → permitido (next)
 *   - GESTOR en ruta soloAdmin → 403
 *   - MAESTRA en ruta soloAdmin → 403
 *   - ADMIN en ruta adminOGestor → permitido
 *   - GESTOR en ruta adminOGestor → permitido
 *   - MAESTRA en ruta adminOGestor → 403
 *   - Todos los roles en todosLosRoles → permitido
 *   - Respuesta 403 incluye rolesRequeridos en el body
 *   - PATCH /auth/usuarios/:id/reset-password — solo ADMIN (soloAdmin)
 *
 * Estrategia: llamada directa al middleware generado por authorize().
 * No requiere BD, tokens ni servidor HTTP.
 */

'use strict';

process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

const { authorize, soloAdmin, adminOGestor, todosLosRoles } = require('../middleware/rbac.middleware');

// ── Helper ─────────────────────────────────────────────────────
function mockRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function reqConRol(rol) {
  return { usuario: { id: 1, username: 'test', nombre: 'Test', rol } };
}

// ── Suite ──────────────────────────────────────────────────────
describe('middleware — authorize (RBAC)', () => {
  let next;

  beforeEach(() => {
    next = vi.fn();
  });

  // ── Sin autenticación previa ─────────────────────────────────

  test('req.usuario undefined → 401 (authenticate no ejecutado)', () => {
    const req = {}; // sin usuario
    const res = mockRes();
    soloAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('req.usuario null → 401', () => {
    const req = { usuario: null };
    const res = mockRes();
    soloAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ── soloAdmin ────────────────────────────────────────────────

  test('ADMIN en ruta soloAdmin → llama next()', () => {
    soloAdmin(reqConRol('ADMIN'), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  test('GESTOR en ruta soloAdmin → 403', () => {
    const res = mockRes();
    soloAdmin(reqConRol('GESTOR'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('MAESTRA en ruta soloAdmin → 403', () => {
    const res = mockRes();
    soloAdmin(reqConRol('MAESTRA'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ── adminOGestor ─────────────────────────────────────────────

  test('ADMIN en ruta adminOGestor → llama next()', () => {
    adminOGestor(reqConRol('ADMIN'), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  test('GESTOR en ruta adminOGestor → llama next()', () => {
    adminOGestor(reqConRol('GESTOR'), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  test('MAESTRA en ruta adminOGestor → 403', () => {
    const res = mockRes();
    adminOGestor(reqConRol('MAESTRA'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ── todosLosRoles ────────────────────────────────────────────

  test.each(['ADMIN', 'GESTOR', 'MAESTRA'])(
    'rol %s en todosLosRoles → llama next()',
    (rol) => {
      const localNext = vi.fn();
      todosLosRoles(reqConRol(rol), mockRes(), localNext);
      expect(localNext).toHaveBeenCalledOnce();
    }
  );

  // ── Formato de respuesta 403 ─────────────────────────────────

  test('respuesta 403 tiene ok:false y rolesRequeridos', () => {
    const res = mockRes();
    soloAdmin(reqConRol('GESTOR'), res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok:              false,
        rolesRequeridos: ['ADMIN'],
      })
    );
  });

  test('respuesta 403 incluye el rol del usuario en el mensaje', () => {
    const res = mockRes();
    soloAdmin(reqConRol('MAESTRA'), res, next);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toContain('MAESTRA');
  });

  // ── PATCH /auth/usuarios/:id/reset-password — soloAdmin ─────
  // Valida que este endpoint crítico rechaza roles no-ADMIN

  test('reset-password: GESTOR intenta acceder → 403 (simula soloAdmin)', () => {
    const res = mockRes();
    // Simula el middleware que protege PATCH /auth/usuarios/:id/reset-password
    soloAdmin(reqConRol('GESTOR'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('reset-password: MAESTRA intenta acceder → 403 (simula soloAdmin)', () => {
    const res = mockRes();
    soloAdmin(reqConRol('MAESTRA'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('reset-password: ADMIN puede acceder (simula soloAdmin)', () => {
    soloAdmin(reqConRol('ADMIN'), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  // ── authorize() directo (fábrica) ────────────────────────────

  test('authorize() con roles dinámicos funciona correctamente', () => {
    const mw = authorize('ADMIN', 'GESTOR');
    mw(reqConRol('ADMIN'), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  test('authorize() rechaza rol no incluido en la lista', () => {
    const mw  = authorize('ADMIN');
    const res = mockRes();
    mw(reqConRol('GESTOR'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
