/**
 * SAE — Test: Flujo RF-21 de becas
 *
 * Regla de negocio RF-21:
 *   - GESTOR solicita → estado: PENDIENTE
 *   - ADMIN aprueba → repository crea asignacion_beca (service NO debe llamar createBeca)
 *   - ADMIN rechaza → sin asignacion_beca
 *   - No se puede resolver una solicitud ya resuelta → 409
 *   - Alumno inexistente → 404
 *
 * Estrategia de mock: vi.spyOn() sobre módulos reales (CJS compatible).
 * Los módulos se cargan normalmente (Prisma no conecta hasta primera query).
 * vi.restoreAllMocks() en afterEach restaura las implementaciones originales.
 */

'use strict';

process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

// Carga real — no hay conexión a DB en el require, solo en queries
const alumnosRepo  = require('../repositories/alumnos/alumnos.repository');
const becasRepo    = require('../repositories/becas/becas.repository');
const becasService = require('../services/becas/becas.service');

const alumnoMock = { id: 1, nombre: 'Test Alumno', activo: true };

describe('becas.service — flujo RF-21', () => {
  beforeEach(() => {
    // Set up todos los spies necesarios en cada test
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(becasRepo, 'createSolicitud').mockResolvedValue({ id: 10, estado: 'PENDIENTE' });
    vi.spyOn(becasRepo, 'findSolicitudById').mockResolvedValue(null);
    vi.spyOn(becasRepo, 'resolverSolicitud').mockResolvedValue(null);
    vi.spyOn(becasRepo, 'createBeca').mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Solicitar beca (GESTOR) ────────────────────────────────

  test('crea solicitud con porcentaje correcto para HERMANOS (15%)', async () => {
    await becasService.solicitarBeca(
      { alumnoId: 1, tipo: 'HERMANOS', motivo: 'Segundo hijo en el colegio' },
      5 // solicitadoPorId (GESTOR)
    );

    expect(becasRepo.createSolicitud).toHaveBeenCalledWith(
      expect.objectContaining({ porcentaje: 15, tipo: 'HERMANOS', solicitadoPorId: 5 })
    );
  });

  test('crea solicitud con porcentaje correcto para EXCELENCIA (20%)', async () => {
    await becasService.solicitarBeca(
      { alumnoId: 1, tipo: 'EXCELENCIA', motivo: 'Promedio 9.8' }, 5
    );

    expect(becasRepo.createSolicitud).toHaveBeenCalledWith(
      expect.objectContaining({ porcentaje: 20 })
    );
  });

  test('lanza 404 si alumno no existe al solicitar', async () => {
    alumnosRepo.findById.mockResolvedValue(null);

    await expect(
      becasService.solicitarBeca({ alumnoId: 999, tipo: 'HERMANOS', motivo: 'Test' }, 5)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(becasRepo.createSolicitud).not.toHaveBeenCalled();
  });

  // ── Resolver solicitud (ADMIN) ──────────────────────────────

  test('ADMIN aprueba: llama resolverSolicitud sin llamar createBeca', async () => {
    becasRepo.findSolicitudById.mockResolvedValue({ id: 10, alumnoId: 1, estado: 'PENDIENTE' });
    becasRepo.resolverSolicitud.mockResolvedValue({ id: 10, estado: 'APROBADA' });

    const result = await becasService.resolverSolicitud(
      10, { estado: 'APROBADA', observaciones: 'OK' }, 1
    );

    expect(becasRepo.resolverSolicitud).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ estado: 'APROBADA', aprobadoPorId: 1, observaciones: 'OK' })
    );
    // CRÍTICO: el service NO debe llamar createBeca (el repository ya lo hace internamente)
    expect(becasRepo.createBeca).not.toHaveBeenCalled();
    expect(result.estado).toBe('APROBADA');
  });

  test('ADMIN rechaza: no llama createBeca', async () => {
    becasRepo.findSolicitudById.mockResolvedValue({ id: 10, alumnoId: 1, estado: 'PENDIENTE' });
    becasRepo.resolverSolicitud.mockResolvedValue({ id: 10, estado: 'RECHAZADA' });

    const result = await becasService.resolverSolicitud(
      10, { estado: 'RECHAZADA', observaciones: 'No cumple' }, 1
    );

    expect(result.estado).toBe('RECHAZADA');
    expect(becasRepo.createBeca).not.toHaveBeenCalled();
  });

  test('lanza 404 si la solicitud no existe', async () => {
    becasRepo.findSolicitudById.mockResolvedValue(null);

    await expect(
      becasService.resolverSolicitud(999, { estado: 'APROBADA' }, 1)
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(becasRepo.resolverSolicitud).not.toHaveBeenCalled();
  });

  test('lanza 409 si la solicitud ya fue resuelta (APROBADA)', async () => {
    becasRepo.findSolicitudById.mockResolvedValue({ id: 10, alumnoId: 1, estado: 'APROBADA' });

    await expect(
      becasService.resolverSolicitud(10, { estado: 'APROBADA' }, 1)
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(becasRepo.resolverSolicitud).not.toHaveBeenCalled();
  });

  test('lanza 409 si la solicitud ya fue resuelta (RECHAZADA)', async () => {
    becasRepo.findSolicitudById.mockResolvedValue({ id: 10, alumnoId: 1, estado: 'RECHAZADA' });

    await expect(
      becasService.resolverSolicitud(10, { estado: 'APROBADA' }, 1)
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
