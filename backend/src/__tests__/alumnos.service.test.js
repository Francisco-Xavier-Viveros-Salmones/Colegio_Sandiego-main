/**
 * SAE — Test: services/alumnos/alumnos.service.js
 *
 * Casos cubiertos:
 *   obtenerPorId():
 *     - Alumno existente → retorna objeto alumno
 *     - Alumno inexistente → lanza 404
 *   crear():
 *     - Matrícula única → llama repository.create y retorna el nuevo alumno
 *     - Matrícula duplicada → lanza 409 sin llamar create
 *   actualizar():
 *     - Alumno existente → llama repository.update
 *     - Alumno inexistente → lanza 404 sin llamar update
 *   eliminar():
 *     - Alumno existente → llama repository.softDelete
 *     - Alumno inexistente → lanza 404 sin llamar softDelete
 *
 * Estrategia: vi.spyOn() sobre el repository.
 * El service usa la arquitectura real; solo se mockean las queries a BD.
 */

'use strict';

process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

const alumnosRepo    = require('../repositories/alumnos/alumnos.repository');
const alumnosService = require('../services/alumnos/alumnos.service');

// ── Fixture ───────────────────────────────────────────────────
const alumnoMock = {
  id:        1,
  nombre:    'Test Alumno',
  matricula: 'TST-001',
  activo:    true,
  grupoId:   null,
};

// ── Suite ──────────────────────────────────────────────────────
describe('alumnos.service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── obtenerPorId() ───────────────────────────────────────────
  describe('obtenerPorId()', () => {
    test('alumno existente → retorna el alumno', async () => {
      vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
      const result = await alumnosService.obtenerPorId(1);
      expect(result).toEqual(alumnoMock);
      expect(alumnosRepo.findById).toHaveBeenCalledWith(1);
    });

    test('alumno inexistente → lanza error 404', async () => {
      vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(null);
      await expect(alumnosService.obtenerPorId(999))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    test('alumno inexistente → mensaje de error descriptivo', async () => {
      vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(null);
      await expect(alumnosService.obtenerPorId(999))
        .rejects.toThrow('Alumno no encontrado.');
    });
  });

  // ── crear() ──────────────────────────────────────────────────
  describe('crear()', () => {
    test('matrícula única → llama create y retorna nuevo alumno', async () => {
      vi.spyOn(alumnosRepo, 'findByMatricula').mockResolvedValue(null);
      vi.spyOn(alumnosRepo, 'create').mockResolvedValue(alumnoMock);

      const result = await alumnosService.crear({
        nombre:    'Nuevo Alumno',
        matricula: 'TST-001',
      });

      expect(alumnosRepo.findByMatricula).toHaveBeenCalledWith('TST-001');
      expect(alumnosRepo.create).toHaveBeenCalledOnce();
      expect(result).toEqual(alumnoMock);
    });

    test('matrícula duplicada → lanza 409', async () => {
      vi.spyOn(alumnosRepo, 'findByMatricula').mockResolvedValue(alumnoMock);
      vi.spyOn(alumnosRepo, 'create').mockResolvedValue(null);

      await expect(
        alumnosService.crear({ nombre: 'Otro Alumno', matricula: 'TST-001' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    test('matrícula duplicada → NO llama repository.create', async () => {
      vi.spyOn(alumnosRepo, 'findByMatricula').mockResolvedValue(alumnoMock);
      const createSpy = vi.spyOn(alumnosRepo, 'create').mockResolvedValue(null);

      await alumnosService.crear({ matricula: 'TST-001' }).catch(() => {});

      expect(createSpy).not.toHaveBeenCalled();
    });

    test('matrícula duplicada → mensaje incluye la matrícula conflictiva', async () => {
      vi.spyOn(alumnosRepo, 'findByMatricula').mockResolvedValue(alumnoMock);
      vi.spyOn(alumnosRepo, 'create').mockResolvedValue(null);

      await expect(
        alumnosService.crear({ matricula: 'TST-001' })
      ).rejects.toThrow('TST-001');
    });
  });

  // ── actualizar() ─────────────────────────────────────────────
  describe('actualizar()', () => {
    test('alumno existente → llama repository.update con datos correctos', async () => {
      vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
      vi.spyOn(alumnosRepo, 'update').mockResolvedValue({ ...alumnoMock, nombre: 'Nuevo Nombre' });

      const result = await alumnosService.actualizar(1, { nombre: 'Nuevo Nombre' });

      expect(alumnosRepo.update).toHaveBeenCalledWith(1, { nombre: 'Nuevo Nombre' });
      expect(result.nombre).toBe('Nuevo Nombre');
    });

    test('alumno inexistente → lanza 404 sin llamar update', async () => {
      vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(null);
      const updateSpy = vi.spyOn(alumnosRepo, 'update').mockResolvedValue(null);

      await expect(
        alumnosService.actualizar(999, { nombre: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  // ── eliminar() ───────────────────────────────────────────────
  describe('eliminar()', () => {
    test('alumno existente → llama repository.softDelete', async () => {
      vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
      const softDeleteSpy = vi.spyOn(alumnosRepo, 'softDelete').mockResolvedValue({ ...alumnoMock, activo: false });

      await alumnosService.eliminar(1);

      expect(softDeleteSpy).toHaveBeenCalledWith(1);
    });

    test('alumno inexistente → lanza 404 sin llamar softDelete', async () => {
      vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(null);
      const softDeleteSpy = vi.spyOn(alumnosRepo, 'softDelete').mockResolvedValue(null);

      await expect(alumnosService.eliminar(999))
        .rejects.toMatchObject({ statusCode: 404 });

      expect(softDeleteSpy).not.toHaveBeenCalled();
    });
  });
});
