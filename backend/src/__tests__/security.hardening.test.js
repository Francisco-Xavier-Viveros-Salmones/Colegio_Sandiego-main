/**
 * SAE — security.hardening.test.js
 * Tests de endurecimiento de seguridad (Sesión 13 — Security Finalization)
 *
 * Cubre gaps no presentes en suites anteriores:
 *
 *   1. verifyIgnoreExpiration() — token expirado, firma falsa, payloads manipulados,
 *      tokens vacíos/truncados/null, issuer incorrecto
 *
 *   2. auth.controller.me() — usuario desactivado/eliminado en BD → 401
 *
 *   3. auth.controller.refresh() — ventana de gracia 2h, firma inválida,
 *      token expirado fuera de gracia, limpieza de iss/iat/exp del payload
 *
 *   4. usuarios.controller.actualizar() — anti auto-degradación de rol
 *      (ADMIN no puede cambiar su propio rol)
 *
 * Estrategia: mocks con vi.spyOn() — no requiere BD ni servidor HTTP.
 */

'use strict';

process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

const jwt              = require('jsonwebtoken');
const jwtUtils         = require('../utils/jwt.utils');
const authService      = require('../services/auth/auth.service');
const authController   = require('../controllers/auth/auth.controller');
const usuariosCtrl     = require('../controllers/usuarios/usuarios.controller');

// ── Constantes de test ─────────────────────────────────────────
const SECRET_TEST = 'test-secret-key-para-vitest-minimo-32-chars';
const ISSUER      = 'sae-sandiego';

// ── Helper ─────────────────────────────────────────────────────
function mockRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

// ─────────────────────────────────────────────────────────────
// 1. verifyIgnoreExpiration() — edge cases de seguridad
// ─────────────────────────────────────────────────────────────

describe('jwtUtils.verifyIgnoreExpiration() — edge cases', () => {
  test('token válido → retorna payload con campos correctos', () => {
    const token  = jwtUtils.generateToken({ id: 5, username: 'u', nombre: 'U', rol: 'GESTOR' });
    const result = jwtUtils.verifyIgnoreExpiration(token);
    expect(result).not.toBeNull();
    expect(result.id).toBe(5);
    expect(result.rol).toBe('GESTOR');
  });

  test('token expirado con firma válida → retorna payload (ignoreExpiration = true)', () => {
    // Crear token que expiró hace 1 hora con la misma secret e issuer
    const expiredToken = jwt.sign(
      { id: 99, username: 'x.exp', nombre: 'Exp', rol: 'MAESTRA' },
      SECRET_TEST,
      { issuer: ISSUER, expiresIn: '-1h' }
    );
    const result = jwtUtils.verifyIgnoreExpiration(expiredToken);
    expect(result).not.toBeNull();
    expect(result.id).toBe(99);
    expect(result.rol).toBe('MAESTRA');
  });

  test('token con firma falsificada → null (rechaza la manipulación)', () => {
    const token = jwtUtils.generateToken({ id: 1, username: 'a', nombre: 'A', rol: 'ADMIN' });
    const [h, p] = token.split('.');
    expect(jwtUtils.verifyIgnoreExpiration(`${h}.${p}.firma-falsa-xxx`)).toBeNull();
  });

  test('token con payload manipulado (rol escalado a ADMIN) → null', () => {
    const token = jwtUtils.generateToken({ id: 1, username: 'a', nombre: 'A', rol: 'MAESTRA' });
    const [h, , s] = token.split('.');
    const fakePayload = Buffer.from(
      JSON.stringify({ id: 1, rol: 'ADMIN', iss: ISSUER, exp: 9999999999 })
    ).toString('base64url');
    // La firma original no coincide con el nuevo payload — debe rechazarse
    expect(jwtUtils.verifyIgnoreExpiration(`${h}.${fakePayload}.${s}`)).toBeNull();
  });

  test('token con issuer distinto → null (auditoría de issuer activa)', () => {
    const wrongIssuerToken = jwt.sign(
      { id: 1, rol: 'ADMIN' },
      SECRET_TEST,
      { issuer: 'otro-sistema', expiresIn: '1h' }
    );
    expect(jwtUtils.verifyIgnoreExpiration(wrongIssuerToken)).toBeNull();
  });

  test('token con secret distinto → null (firma no pertenece a SAE)', () => {
    const otherSecretToken = jwt.sign(
      { id: 1, rol: 'ADMIN' },
      'otra-secret-completamente-diferente-xxx',
      { issuer: ISSUER, expiresIn: '1h' }
    );
    expect(jwtUtils.verifyIgnoreExpiration(otherSecretToken)).toBeNull();
  });

  test('token vacío (string "") → null', () => {
    expect(jwtUtils.verifyIgnoreExpiration('')).toBeNull();
  });

  test('token null → null', () => {
    expect(jwtUtils.verifyIgnoreExpiration(null)).toBeNull();
  });

  test('token con solo 1 segmento → null', () => {
    expect(jwtUtils.verifyIgnoreExpiration('solo.una')).toBeNull();
  });

  test('token truncado sin firma → null', () => {
    const token  = jwtUtils.generateToken({ id: 1, username: 'a', nombre: 'A', rol: 'ADMIN' });
    const truncado = token.split('.').slice(0, 2).join('.');
    expect(jwtUtils.verifyIgnoreExpiration(truncado)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// 2. auth.controller.me() — validación usuario activo en BD
// ─────────────────────────────────────────────────────────────

describe('auth.controller — me() — usuario inactivo/eliminado en BD', () => {
  afterEach(() => vi.restoreAllMocks());

  test('usuario eliminado (findUsuarioActivo → null) → 401', async () => {
    vi.spyOn(authService, 'findUsuarioActivo').mockResolvedValue(null);
    const req = { usuario: { id: 7, rol: 'GESTOR', username: 'g', nombre: 'G' } };
    const res = mockRes();

    await authController.me(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false })
    );
  });

  test('usuario desactivado (activo=false) → findUsuarioActivo devuelve null → 401', async () => {
    // findUsuarioActivo filtra `activo: true` — devuelve null si el usuario está desactivado
    vi.spyOn(authService, 'findUsuarioActivo').mockResolvedValue(null);
    const req = { usuario: { id: 3, rol: 'MAESTRA', username: 'm', nombre: 'M' } };
    const res = mockRes();

    await authController.me(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('usuario activo y no eliminado → 200 con perfil JWT', async () => {
    vi.spyOn(authService, 'findUsuarioActivo').mockResolvedValue({ usuarioId: 1 });
    const req = { usuario: { id: 1, rol: 'ADMIN', username: 'admin', nombre: 'Admin' } };
    const res = mockRes();

    await authController.me(req, res, vi.fn());

    // success() NO llama res.status(401) — la respuesta es ok:true
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true })
    );
  });

  test('findUsuarioActivo recibe el id del payload JWT (no otro)', async () => {
    const spy = vi.spyOn(authService, 'findUsuarioActivo').mockResolvedValue({ usuarioId: 42 });
    const req = { usuario: { id: 42, rol: 'ADMIN', username: 'a', nombre: 'A' } };

    await authController.me(req, mockRes(), vi.fn());

    expect(spy).toHaveBeenCalledWith(42);
  });
});

// ─────────────────────────────────────────────────────────────
// 3. auth.controller.refresh() — ventana de gracia y firma
// ─────────────────────────────────────────────────────────────

describe('auth.controller — refresh() — edge cases de seguridad', () => {
  afterEach(() => vi.restoreAllMocks());

  test('sin header Authorization → 401', async () => {
    const req = { headers: {} };
    const res = mockRes();
    await authController.refresh(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('header sin prefijo Bearer → 401', async () => {
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = mockRes();
    await authController.refresh(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('token con firma inválida (verifyIgnoreExpiration → null) → 401', async () => {
    vi.spyOn(jwtUtils, 'verifyIgnoreExpiration').mockReturnValue(null);
    const req = { headers: { authorization: 'Bearer token.invalido.firma' } };
    const res = mockRes();
    await authController.refresh(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, message: expect.stringContaining('inválido') })
    );
  });

  test('token expirado hace > 2h → 401 (fuera de ventana de gracia)', async () => {
    const ahora = Math.floor(Date.now() / 1000);
    vi.spyOn(jwtUtils, 'verifyIgnoreExpiration').mockReturnValue({
      id: 1, username: 'x', nombre: 'X', rol: 'ADMIN',
      exp: ahora - 7201, // expiró hace 7201s (> 2h = 7200s)
      iat: ahora - 7201 - 28800,
    });
    const req = { headers: { authorization: 'Bearer token.expirado.antiguo' } };
    const res = mockRes();
    await authController.refresh(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('expirada') })
    );
  });

  test('token expirado hace < 2h → 200 con token renovado (ventana de gracia activa)', async () => {
    const ahora = Math.floor(Date.now() / 1000);
    vi.spyOn(jwtUtils, 'verifyIgnoreExpiration').mockReturnValue({
      id: 1, username: 'x', nombre: 'X', rol: 'ADMIN',
      exp: ahora - 3600, // expiró hace 1h (dentro de los 7200s de gracia)
      iat: ahora - 3600 - 28800,
    });
    vi.spyOn(jwtUtils, 'generateToken').mockReturnValue('nuevo.token.renovado');

    const req = { headers: { authorization: 'Bearer token.expirado.reciente' } };
    const res = mockRes();
    await authController.refresh(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok:   true,
        data: expect.objectContaining({ token: 'nuevo.token.renovado' }),
      })
    );
  });

  test('token aún válido (no expirado) → 200 con token renovado', async () => {
    const ahora = Math.floor(Date.now() / 1000);
    vi.spyOn(jwtUtils, 'verifyIgnoreExpiration').mockReturnValue({
      id: 2, username: 'g', nombre: 'G', rol: 'GESTOR',
      exp: ahora + 900, // expira en 15 min
      iat: ahora - 100,
    });
    vi.spyOn(jwtUtils, 'generateToken').mockReturnValue('token.proactivo.nuevo');

    const req = { headers: { authorization: 'Bearer token.activo' } };
    const res = mockRes();
    await authController.refresh(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true })
    );
  });

  test('generateToken recibe payload SIN iss, iat, exp (limpieza antes de re-emitir)', async () => {
    const ahora      = Math.floor(Date.now() / 1000);
    const generateSpy = vi.spyOn(jwtUtils, 'generateToken').mockReturnValue('tok');
    vi.spyOn(jwtUtils, 'verifyIgnoreExpiration').mockReturnValue({
      id: 1, username: 'x', nombre: 'X', rol: 'ADMIN',
      exp: ahora + 300, iat: ahora - 100, iss: ISSUER,
    });

    const req = { headers: { authorization: 'Bearer token.activo' } };
    await authController.refresh(req, mockRes(), vi.fn());

    const payloadPasado = generateSpy.mock.calls[0][0];
    expect(payloadPasado).not.toHaveProperty('iss');
    expect(payloadPasado).not.toHaveProperty('iat');
    expect(payloadPasado).not.toHaveProperty('exp');
    // Pero sí debe tener id y rol
    expect(payloadPasado).toHaveProperty('id', 1);
    expect(payloadPasado).toHaveProperty('rol', 'ADMIN');
  });
});

// ─────────────────────────────────────────────────────────────
// 4. usuarios.controller.actualizar() — anti auto-degradación
// ─────────────────────────────────────────────────────────────

describe('usuarios.controller — actualizar() — role self-protection', () => {
  afterEach(() => vi.restoreAllMocks());

  test('ADMIN intenta cambiar su propio rol → 403', async () => {
    const req = {
      body:    { rol: 'GESTOR' },
      params:  { id: '1' },
      usuario: { id: 1, rol: 'ADMIN' },
    };
    const res = mockRes();
    await usuariosCtrl.actualizar(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false })
    );
  });

  test('ADMIN intenta degradarse a MAESTRA → 403', async () => {
    const req = {
      body:    { rol: 'MAESTRA' },
      params:  { id: '5' },
      usuario: { id: 5, rol: 'ADMIN' },
    };
    const res = mockRes();
    await usuariosCtrl.actualizar(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('ADMIN cambia rol de OTRO usuario → no bloquea (pasa al service)', async () => {
    const usuariosService = require('../services/usuarios/usuarios.service');
    vi.spyOn(usuariosService, 'actualizar').mockResolvedValue({ id: 2, rol: 'GESTOR' });

    const req = {
      body:    { rol: 'GESTOR' },
      params:  { id: '2' },          // id diferente del ADMIN (1 ≠ 2)
      usuario: { id: 1, rol: 'ADMIN' },
    };
    const res = mockRes();
    await usuariosCtrl.actualizar(req, res, vi.fn());

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(usuariosService.actualizar).toHaveBeenCalled();
  });

  test('actualizar sin campo rol → guard no activa (pasa al service)', async () => {
    const usuariosService = require('../services/usuarios/usuarios.service');
    vi.spyOn(usuariosService, 'actualizar').mockResolvedValue({ id: 1 });

    const req = {
      body:    { nombre: 'Nombre Cambiado' }, // sin campo rol
      params:  { id: '1' },
      usuario: { id: 1, rol: 'ADMIN' },
    };
    const res = mockRes();
    await usuariosCtrl.actualizar(req, res, vi.fn());

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(usuariosService.actualizar).toHaveBeenCalled();
  });

  test('payload con id como string (desde params) vs number (desde JWT) → guard funciona igual', async () => {
    // req.params.id llega siempre como string; req.usuario.id es number (del JWT)
    // El controller usa Number(req.params.id) para comparar
    const req = {
      body:    { rol: 'GESTOR' },
      params:  { id: '10' },         // string "10"
      usuario: { id: 10, rol: 'ADMIN' }, // number 10
    };
    const res = mockRes();
    await usuariosCtrl.actualizar(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
