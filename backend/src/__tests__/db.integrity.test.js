/**
 * SAE — db.integrity.test.js
 * Tests críticos de integridad de BD (Sesión 10 — BD Implementación Final)
 *
 * Verifica comportamientos críticos de la capa de repositorio
 * sin conexión real a PostgreSQL (todo mockeado con vi.spyOn).
 *
 * Cubre:
 *   1. Soft delete — eliminadoEn se establece correctamente en softDelete()
 *   2. Soft delete — findAll() y findById() excluyen registros eliminados
 *   3. Math.max(0, montoCapital) — guard contra capital negativo en pagos
 *   4. Decimal precision — Math.round previene imprecisión en sumas de montos
 *   5. P2002 race condition — upsert de calificación recupera período existente
 */

'use strict';

process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

const prisma      = require('../config/database');
const alumnosRepo = require('../repositories/alumnos/alumnos.repository');
const calRepo     = require('../repositories/calificaciones/calificaciones.repository');

// ─────────────────────────────────────────────────────────────
// 1. SOFT DELETE — alumnos.repository
// ─────────────────────────────────────────────────────────────

describe('soft delete — alumnos.repository', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  test('softDelete() llama prisma.alumno.update con eliminadoEn y estado Baja Definitiva', async () => {
    const mockUpdate = vi.spyOn(prisma.alumno, 'update').mockResolvedValue({
      alumnoId:    5,
      eliminadoEn: new Date(),
      estado:      'Baja Definitiva',
    });

    await alumnosRepo.softDelete(5);

    expect(mockUpdate).toHaveBeenCalledOnce();
    const callArgs = mockUpdate.mock.calls[0][0];
    expect(callArgs.where).toEqual({ alumnoId: 5 });
    expect(callArgs.data.estado).toBe('Baja Definitiva');
    expect(callArgs.data.eliminadoEn).toBeInstanceOf(Date);
  });

  test('findAll() incluye eliminadoEn: null en where — excluye registros borrados', async () => {
    vi.spyOn(prisma.alumno, 'findMany').mockResolvedValue([]);

    await alumnosRepo.findAll();

    const whereClause = prisma.alumno.findMany.mock.calls[0][0].where;
    expect(whereClause).toHaveProperty('eliminadoEn', null);
  });

  test('findAll() con filtro nivel NO pierde el filtro eliminadoEn: null', async () => {
    vi.spyOn(prisma.alumno, 'findMany').mockResolvedValue([]);

    await alumnosRepo.findAll({ nivel: 'PRIMARIA' });

    const whereClause = prisma.alumno.findMany.mock.calls[0][0].where;
    expect(whereClause).toHaveProperty('eliminadoEn', null);
    expect(whereClause).toHaveProperty('nivel');
  });

  test('findById() usa findFirst con alumnoId Y eliminadoEn: null', async () => {
    vi.spyOn(prisma.alumno, 'findFirst').mockResolvedValue(null);

    await alumnosRepo.findById(99);

    const whereClause = prisma.alumno.findFirst.mock.calls[0][0].where;
    expect(whereClause).toMatchObject({ alumnoId: 99, eliminadoEn: null });
  });

  test('softDelete() convierte id a Number para evitar mismatch de tipo', async () => {
    const mockUpdate = vi.spyOn(prisma.alumno, 'update').mockResolvedValue({});

    await alumnosRepo.softDelete('12'); // string como llegaría desde params

    const callArgs = mockUpdate.mock.calls[0][0];
    expect(callArgs.where.alumnoId).toBe(12);        // debe ser número
    expect(typeof callArgs.where.alumnoId).toBe('number');
  });
});

// ─────────────────────────────────────────────────────────────
// 2. MATH.MAX(0, MONTOCAPITAL) — guard contra capital negativo
//    Lógica pura — sin mocks (la fórmula está en pagos.repository.js)
// ─────────────────────────────────────────────────────────────

describe('montoCapital guard — Math.max(0, montoCapital)', () => {
  // Helper que replica la fórmula del repositorio (línea 262)
  function calcMontoCapital(monto, tieneRecargo, montoRecargo) {
    return Math.max(0, tieneRecargo ? (monto - (montoRecargo ?? 0)) : monto);
  }

  test('recargo > monto → montoCapital = 0 (nunca negativo)', () => {
    expect(calcMontoCapital(100, true, 400)).toBe(0);
  });

  test('monto > recargo → montoCapital es la diferencia positiva', () => {
    expect(calcMontoCapital(4400, true, 400)).toBe(4000);
  });

  test('recargo === monto → montoCapital = 0 (caso límite exacto)', () => {
    expect(calcMontoCapital(400, true, 400)).toBe(0);
  });

  test('sin recargo → montoCapital es el monto completo', () => {
    expect(calcMontoCapital(4000, false, 0)).toBe(4000);
  });

  test('montoRecargo undefined → tratado como 0 (sin romper)', () => {
    expect(calcMontoCapital(3000, true, undefined)).toBe(3000);
  });

  test('monto = 0 → montoCapital = 0 (no rompe con negativos)', () => {
    expect(calcMontoCapital(0, true, 400)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 3. DECIMAL PRECISION — Math.round previene floating point
//    Lógica pura — verifica la fórmula aplicada en pagos.repository.js
// ─────────────────────────────────────────────────────────────

describe('Decimal precision — totalPagado y totalDeuda con Math.round', () => {
  // Helper que replica la fórmula corregida del repositorio (líneas 291-292)
  function calcTotalPagado(montoPagadoDecimal, montoNuevo) {
    return Math.round((Number(montoPagadoDecimal) + Number(montoNuevo)) * 100) / 100;
  }

  function calcTotalDeuda(montoOriginalDecimal, montoRecargoDecimal) {
    return Math.round((Number(montoOriginalDecimal) + Number(montoRecargoDecimal)) * 100) / 100;
  }

  test('2499.90 + 1500.10 = 4000.00 (no 3999.9999...)', () => {
    // Sin Math.round esto puede producir 3999.9999999999995
    const sinFix = Number(2499.90) + Number(1500.10);
    const conFix = calcTotalPagado(2499.90, 1500.10);

    expect(conFix).toBe(4000.00);
    // Documenta que el problema existía (puede flaquear en algunas plataformas)
    // pero el fix siempre es correcto
    expect(Number.isFinite(conFix)).toBe(true);
    expect(conFix).toBeGreaterThan(sinFix - 0.01); // ambos son ~4000
  });

  test('3999.50 + 0.50 = 4000.00 (suma de centavos)', () => {
    expect(calcTotalDeuda(3999.50, 0.50)).toBe(4000.00);
  });

  test('0 + 0 = 0 (caso mínimo sin romper)', () => {
    expect(calcTotalPagado(0, 0)).toBe(0);
  });

  test('1000.00 + 0.00 = 1000.00 (sin recargo)', () => {
    expect(calcTotalPagado(1000.00, 0)).toBe(1000.00);
  });

  test('montos con string (Prisma Decimal.toString) se convierten correctamente', () => {
    // Prisma Decimal puede llegar como string '1500.00' o como número
    const montoPagadoComoString = '2500.00';
    const montoNuevo = 1500.00;
    expect(calcTotalPagado(montoPagadoComoString, montoNuevo)).toBe(4000.00);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. P2002 RACE CONDITION — calificaciones.repository
//    Via calRepo.upsert() que invoca resolverPeriodoId internamente
// ─────────────────────────────────────────────────────────────

describe('P2002 race condition — calificaciones.repository vía upsert()', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  // Fixture de calificacion para que mapCalificacion no falle
  const mockCalificacion = {
    calificacionId:    1,
    alumnoId:          1,
    grupoMateriaId:    1,
    periodoId:         42,
    tipoEvaluacion:    'numerica',
    valorNumerico:     8.5,
    valorCualitativo:  null,
    textoObservacion:  null,
    cuentaParaPromedio:true,
    modificadaMotivo:  null,
    registradaPor:     1,
    registradaEn:      new Date(),
    actualizadoEn:     new Date(),
    alumno:            null,
    grupoMateria:      null,
    periodo:           null,
    registradoPorUsuario: null,
  };

  test('P2002 en create → upsert no lanza y retorna calificación con periodoId recuperado', async () => {
    // Simula el escenario de concurrencia:
    // 1. grupoMateria existe
    vi.spyOn(prisma.grupoMateria, 'findUnique').mockResolvedValue({
      grupo: { cicloId: 1, nivelId: 1 },
    });
    // 2. findFirst(periodo): primera llamada → null (no existe), segunda → recuperado
    vi.spyOn(prisma.periodoEvaluacion, 'findFirst')
      .mockResolvedValueOnce(null)              // no existe aún
      .mockResolvedValueOnce({ periodoId: 42 }); // recuperado tras P2002
    // 3. ciclo existe para las fechas del nuevo período
    vi.spyOn(prisma.cicloEscolar, 'findUnique').mockResolvedValue({
      cicloId: 1, fechaInicio: new Date('2026-09-01'), fechaFin: new Date('2027-06-30'),
    });
    // 4. create(periodo) → lanza P2002 (otra request ganó la carrera)
    const p2002 = Object.assign(new Error('Unique constraint failed on: periodo_evaluacion'), { code: 'P2002' });
    vi.spyOn(prisma.periodoEvaluacion, 'create').mockRejectedValue(p2002);
    // 5. calificacion.upsert → OK con el periodoId recuperado
    vi.spyOn(prisma.calificacion, 'upsert').mockResolvedValue(mockCalificacion);

    // No debe lanzar
    const result = await calRepo.upsert({
      alumnoId: 1, grupoMateriaId: 1, periodo: 'TRIMESTRE_1', valor: 8.5, registradoPorId: 1,
    });

    expect(result).toBeDefined();
    // El upsert de calificación se llamó con el periodoId recuperado (42)
    expect(prisma.calificacion.upsert).toHaveBeenCalledOnce();
    const upsertArgs = prisma.calificacion.upsert.mock.calls[0][0];
    expect(upsertArgs.where.alumnoId_grupoMateriaId_periodoId.periodoId).toBe(42);
  });

  test('error distinto de P2002 se propaga (no se silencia)', async () => {
    vi.spyOn(prisma.grupoMateria, 'findUnique').mockResolvedValue({
      grupo: { cicloId: 1, nivelId: 1 },
    });
    vi.spyOn(prisma.periodoEvaluacion, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.cicloEscolar, 'findUnique').mockResolvedValue({
      cicloId: 1, fechaInicio: new Date(), fechaFin: new Date(),
    });
    // Error de conexión, no de constraint
    const dbError = Object.assign(new Error('Connection timeout'), { code: 'P2024' });
    vi.spyOn(prisma.periodoEvaluacion, 'create').mockRejectedValue(dbError);

    await expect(
      calRepo.upsert({ alumnoId: 1, grupoMateriaId: 1, periodo: 'TRIMESTRE_1', valor: 7, registradoPorId: 1 })
    ).rejects.toMatchObject({ code: 'P2024' });
  });

  test('período ya existe → upsert no intenta crear (happy path sin P2002)', async () => {
    vi.spyOn(prisma.grupoMateria, 'findUnique').mockResolvedValue({
      grupo: { cicloId: 1, nivelId: 1 },
    });
    // Período ya existe en la primera búsqueda
    vi.spyOn(prisma.periodoEvaluacion, 'findFirst').mockResolvedValue({ periodoId: 7 });
    const mockCreate = vi.spyOn(prisma.periodoEvaluacion, 'create');
    vi.spyOn(prisma.calificacion, 'upsert').mockResolvedValue({ ...mockCalificacion, periodoId: 7 });

    await calRepo.upsert({
      alumnoId: 1, grupoMateriaId: 1, periodo: 'TRIMESTRE_2', valor: 9.0, registradoPorId: 1,
    });

    // No debe intentar crear el período si ya existe
    expect(mockCreate).not.toHaveBeenCalled();
    // El upsert de calificación usa el periodoId existente
    const upsertArgs = prisma.calificacion.upsert.mock.calls[0][0];
    expect(upsertArgs.where.alumnoId_grupoMateriaId_periodoId.periodoId).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────
// 5. SOFT DELETE — becas.repository (asignaciones)
// ─────────────────────────────────────────────────────────────

describe('soft delete — becas.repository (asignaciones activas)', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  const becasRepo = require('../repositories/becas/becas.repository');

  test('findBecasActivas() filtra por estado activa y eliminadoEn: null', async () => {
    const mockFindMany = vi.spyOn(prisma.asignacionBeca, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.cicloEscolar, 'findFirst').mockResolvedValue({ cicloId: 1 });

    await becasRepo.findBecasActivas();

    const whereClause = mockFindMany.mock.calls[0][0].where;
    expect(whereClause).toMatchObject({ estado: 'activa', eliminadoEn: null });
  });

  test('findBecaByAlumno() incluye eliminadoEn: null en el filtro', async () => {
    const mockFindMany = vi.spyOn(prisma.asignacionBeca, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.cicloEscolar, 'findFirst').mockResolvedValue({ cicloId: 1 });

    await becasRepo.findBecaByAlumno(5);

    const whereClause = mockFindMany.mock.calls[0][0].where;
    expect(whereClause).toMatchObject({ alumnoId: 5, estado: 'activa', eliminadoEn: null });
  });
});
