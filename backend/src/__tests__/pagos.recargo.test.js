/**
 * SAE — Test: Regla de recargo automático en pagos
 *
 * Regla de negocio crítica:
 *   - Si el pago de COLEGIATURA se realiza DESPUÉS del día 5 → recargo $400
 *   - Si se realiza en el día 5 o antes → sin recargo
 *   - Otros conceptos (INSCRIPCION, MATERIAL_DIDACTICO) → nunca aplica recargo
 *   - Si el alumno tiene diaLimitePago propio, ese prevalece sobre el global
 *
 * Estrategia de mock: vi.spyOn() sobre módulos reales (CJS compatible).
 */

'use strict';

process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

// Carga real — Prisma no conecta en el require, solo en queries
const alumnosRepo  = require('../repositories/alumnos/alumnos.repository');
const pagosRepo    = require('../repositories/pagos/pagos.repository');
const prisma       = require('../config/database');
const pagosService = require('../services/pagos/pagos.service');

// ── Fixture ───────────────────────────────────────────────────
const alumnoBase = {
  id: 1, nombre: 'Test Alumno', matricula: 'TST-001',
  activo: true, diaLimitePago: null,
};

const configValues = {
  'recargo_dia_tope_mes':      '5',
  'recargo_colegiatura_monto': '400',
};

describe('pagos.service — regla de recargo automático', () => {
  beforeEach(() => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoBase);
    vi.spyOn(pagosRepo, 'create').mockResolvedValue({ id: 99, alumnoId: 1 });
    vi.spyOn(prisma.configuracionSistema, 'findFirst').mockImplementation(({ where }) => {
      const valor = configValues[where.clave];
      return Promise.resolve(valor ? { valor } : null);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('día 5 (exacto) → sin recargo', async () => {
    await pagosService.registrar({ alumnoId: 1, concepto: 'COLEGIATURA', monto: 4000, fecha: '2026-09-05' }, 1);
    const { tieneRecargo, montoRecargo } = pagosRepo.create.mock.calls[0][0];
    expect(tieneRecargo).toBe(false);
    expect(montoRecargo).toBe(0);
  });

  test('día 1 → sin recargo', async () => {
    await pagosService.registrar({ alumnoId: 1, concepto: 'COLEGIATURA', monto: 4000, fecha: '2026-09-01' }, 1);
    const { tieneRecargo } = pagosRepo.create.mock.calls[0][0];
    expect(tieneRecargo).toBe(false);
  });

  test('día 6 → recargo $400', async () => {
    await pagosService.registrar({ alumnoId: 1, concepto: 'COLEGIATURA', monto: 4000, fecha: '2026-09-06' }, 1);
    const { tieneRecargo, montoRecargo } = pagosRepo.create.mock.calls[0][0];
    expect(tieneRecargo).toBe(true);
    expect(montoRecargo).toBe(400);
  });

  test('día 30 → recargo $400', async () => {
    await pagosService.registrar({ alumnoId: 1, concepto: 'COLEGIATURA', monto: 4000, fecha: '2026-09-30' }, 1);
    const { tieneRecargo, montoRecargo } = pagosRepo.create.mock.calls[0][0];
    expect(tieneRecargo).toBe(true);
    expect(montoRecargo).toBe(400);
  });

  test('concepto INSCRIPCION → sin recargo aunque sea día 20', async () => {
    await pagosService.registrar({ alumnoId: 1, concepto: 'INSCRIPCION', monto: 5000, fecha: '2026-09-20' }, 1);
    const { tieneRecargo } = pagosRepo.create.mock.calls[0][0];
    expect(tieneRecargo).toBe(false);
  });

  test('concepto MATERIAL_DIDACTICO → sin recargo', async () => {
    await pagosService.registrar({ alumnoId: 1, concepto: 'MATERIAL_DIDACTICO', monto: 800, fecha: '2026-09-20' }, 1);
    const { tieneRecargo } = pagosRepo.create.mock.calls[0][0];
    expect(tieneRecargo).toBe(false);
  });

  test('alumno con diaLimitePago=10, pago en día 8 → sin recargo', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue({ ...alumnoBase, diaLimitePago: 10 });
    await pagosService.registrar({ alumnoId: 1, concepto: 'COLEGIATURA', monto: 4000, fecha: '2026-09-08' }, 1);
    const { tieneRecargo } = pagosRepo.create.mock.calls[0][0];
    expect(tieneRecargo).toBe(false);
  });

  test('alumno con diaLimitePago=10, pago en día 11 → recargo', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue({ ...alumnoBase, diaLimitePago: 10 });
    await pagosService.registrar({ alumnoId: 1, concepto: 'COLEGIATURA', monto: 4000, fecha: '2026-09-11' }, 1);
    const { tieneRecargo } = pagosRepo.create.mock.calls[0][0];
    expect(tieneRecargo).toBe(true);
  });

  test('alumno inexistente → lanza 404', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(null);
    await expect(
      pagosService.registrar({ alumnoId: 999, concepto: 'COLEGIATURA', monto: 4000, fecha: '2026-09-01' }, 1)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
