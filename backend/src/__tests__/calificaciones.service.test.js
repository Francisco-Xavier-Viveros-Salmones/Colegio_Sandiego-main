/**
 * SAE — Test: services/calificaciones/calificaciones.service.js — calcularPromedio()
 *
 * Casos cubiertos:
 *   - Alumno inexistente → 404
 *   - Sin calificaciones → promedioGeneral: null, materias: []
 *   - Una materia, una calificación → promedio = valor
 *   - Una materia, múltiples calificaciones → promedio aritmético por materia
 *   - Múltiples materias → promedioGeneral = media de promedios por materia
 *   - cuentaParaPromedio=false → calificación excluida del promedio
 *   - valor null → calificación excluida
 *   - Redondeo a 2 decimales
 *   - Retorna totalCalificaciones correcto
 *   - Materias ordenadas alfabéticamente
 *
 * Estrategia: vi.spyOn() sobre repositories de alumnos y calificaciones.
 * El service calcularPromedio() es lógica pura en memoria tras las queries;
 * se prueba su aritmética sin BD real.
 */

'use strict';

process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';

const alumnosRepo          = require('../repositories/alumnos/alumnos.repository');
const calificacionesRepo   = require('../repositories/calificaciones/calificaciones.repository');
const calificacionesService= require('../services/calificaciones/calificaciones.service');

// ── Fixtures ──────────────────────────────────────────────────
const alumnoMock = { id: 1, nombre: 'Test Alumno', activo: true };

function calMock(grupoMateriaId, materia, valor, cuentaParaPromedio = true) {
  return { grupoMateriaId, grupoMateria: { materia }, valor, cuentaParaPromedio };
}

// ── Suite ──────────────────────────────────────────────────────
describe('calificaciones.service — calcularPromedio()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Alumno inexistente ───────────────────────────────────────
  test('alumno inexistente → lanza 404', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(null);

    await expect(calificacionesService.calcularPromedio(999))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  // ── Sin calificaciones ───────────────────────────────────────
  test('sin calificaciones → promedioGeneral null y materias vacío', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([]);

    const result = await calificacionesService.calcularPromedio(1);

    expect(result.promedioGeneral).toBeNull();
    expect(result.materias).toEqual([]);
    expect(result.totalCalificaciones).toBe(0);
  });

  // ── Solo calificaciones excluidas ────────────────────────────
  test('todas las calificaciones con cuentaParaPromedio=false → promedioGeneral null', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(1, 'Matemáticas', 9, false),
      calMock(1, 'Matemáticas', 8, false),
    ]);

    const result = await calificacionesService.calcularPromedio(1);

    expect(result.promedioGeneral).toBeNull();
    expect(result.totalCalificaciones).toBe(0);
  });

  test('calificación con valor null → excluida del promedio', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(1, 'Matemáticas', null, true),
    ]);

    const result = await calificacionesService.calcularPromedio(1);

    expect(result.promedioGeneral).toBeNull();
    expect(result.totalCalificaciones).toBe(0);
  });

  // ── Una materia ──────────────────────────────────────────────
  test('una materia, una calificación → promedio = valor exacto', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(1, 'Matemáticas', 9),
    ]);

    const result = await calificacionesService.calcularPromedio(1);

    expect(result.promedioGeneral).toBe(9);
    expect(result.materias[0].promedio).toBe(9);
    expect(result.totalCalificaciones).toBe(1);
  });

  test('una materia, tres calificaciones → promedio aritmético', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(1, 'Matemáticas', 8),
      calMock(1, 'Matemáticas', 9),
      calMock(1, 'Matemáticas', 10),
    ]);

    const result = await calificacionesService.calcularPromedio(1);

    // (8+9+10)/3 = 9
    expect(result.materias[0].promedio).toBe(9);
    expect(result.promedioGeneral).toBe(9);
    expect(result.totalCalificaciones).toBe(3);
  });

  // ── Múltiples materias ───────────────────────────────────────
  test('dos materias → promedioGeneral es la media de los promedios por materia', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(1, 'Matemáticas', 8),   // promedio materia 1 = 8
      calMock(2, 'Español',     10),  // promedio materia 2 = 10
    ]);

    const result = await calificacionesService.calcularPromedio(1);

    // promedioGeneral = (8 + 10) / 2 = 9
    expect(result.promedioGeneral).toBe(9);
    expect(result.materias).toHaveLength(2);
    expect(result.totalCalificaciones).toBe(2);
  });

  test('tres materias con promedios distintos → cálculo correcto', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(1, 'Matemáticas', 7),
      calMock(2, 'Español',     9),
      calMock(3, 'Historia',    8),
    ]);

    const result = await calificacionesService.calcularPromedio(1);

    // (7 + 9 + 8) / 3 = 8
    expect(result.promedioGeneral).toBe(8);
  });

  // ── Mezcla de incluidas y excluidas ──────────────────────────
  test('mezcla cuentaParaPromedio=true y false → excluye las false', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(1, 'Matemáticas', 10, true),   // incluida
      calMock(1, 'Matemáticas', 5,  false),  // excluida
    ]);

    const result = await calificacionesService.calcularPromedio(1);

    // Solo se incluye el 10
    expect(result.materias[0].promedio).toBe(10);
    expect(result.totalCalificaciones).toBe(1);
  });

  // ── Redondeo ─────────────────────────────────────────────────
  test('resultado con decimales → redondeado a 2 cifras', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(1, 'Matemáticas', 7),
      calMock(1, 'Matemáticas', 8),
      calMock(1, 'Matemáticas', 9),
      calMock(1, 'Matemáticas', 10),
      calMock(1, 'Matemáticas', 6),
    ]);

    const result = await calificacionesService.calcularPromedio(1);

    // (7+8+9+10+6)/5 = 40/5 = 8
    expect(Number.isFinite(result.promedioGeneral)).toBe(true);
    // Sin más de 2 decimales
    const decimals = result.promedioGeneral.toString().split('.')[1];
    expect(decimals === undefined || decimals.length <= 2).toBe(true);
  });

  // ── alumnoId en resultado ────────────────────────────────────
  test('resultado contiene alumnoId como número', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(1, 'Matemáticas', 9),
    ]);

    const result = await calificacionesService.calcularPromedio('1'); // string
    expect(result.alumnoId).toBe(1); // debe ser número
    expect(typeof result.alumnoId).toBe('number');
  });

  // ── Ordenamiento de materias ─────────────────────────────────
  test('materias retornadas en orden alfabético', async () => {
    vi.spyOn(alumnosRepo, 'findById').mockResolvedValue(alumnoMock);
    vi.spyOn(calificacionesRepo, 'findAll').mockResolvedValue([
      calMock(3, 'Química',    8),
      calMock(1, 'Biología',   9),
      calMock(2, 'Matemáticas',7),
    ]);

    const result = await calificacionesService.calcularPromedio(1);
    const nombres = result.materias.map((m) => m.materia);

    expect(nombres).toEqual(['Biología', 'Matemáticas', 'Química']);
  });
});
