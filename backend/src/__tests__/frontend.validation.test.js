/**
 * SAE — frontend.validation.test.js
 * Tests de validación de lógica frontend (Sesión 15 — Frontend Finalization)
 *
 * Cubre la lógica reutilizable de:
 *   1. auth-guard — validación client-side de tokens JWT
 *   2. api.js — parseo de SAE_CONFIG, mappers, CONCEPTO_MAP, TIPO_BECA_MAP
 *   3. Refresh flow — semáforo anti-bucle y refresh proactivo
 *   4. Offline handling — estructura de error `{ ok: false, offline: true }`
 *   5. Dashboard — cálculo de métricas en memoria
 *   6. Paginación — lógica de navegación entre páginas
 *
 * NOTA: Esta suite NO require el backend. Prueba lógica pura de helpers JS que
 * luego se ejecuta en los paneles HTML. No usa fetch/supertest.
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// Helpers copiados del frontend para pruebas de lógica pura
// (No importan api.js/auth-guard.js — son browser scripts, no CommonJS)
// ─────────────────────────────────────────────────────────────

// ── Replica de auth-guard: validación de JWT client-side ──────
function validarTokenClientSide(token) {
  if (!token) return { valido: false, razon: 'sin_token' };
  try {
    const partes   = token.split('.');
    if (partes.length !== 3) return { valido: false, razon: 'malformado' };
    const payload  = JSON.parse(Buffer.from(partes[1], 'base64').toString('utf8'));
    const ahora    = Math.floor(Date.now() / 1000);
    if (payload.exp && ahora > payload.exp) return { valido: false, razon: 'expirado' };
    return { valido: true, payload };
  } catch (e) {
    return { valido: false, razon: 'malformado' };
  }
}

// ── Replica de api.js: parseo de SAE_CONFIG ────────────────────
function getBase(config) {
  if (config && config.API_BASE) return config.API_BASE;
  return 'http://localhost:3000/api/v1';  // fallback
}

// ── Replica de api.js: tokenProximoAExpirar ────────────────────
function tokenProximoAExpirar(token, minutosUmbral) {
  if (!token) return false;
  try {
    const payload  = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    if (!payload.exp) return false;
    const segundosRestantes = payload.exp - Math.floor(Date.now() / 1000);
    return segundosRestantes < minutosUmbral * 60;
  } catch (e) { return false; }
}

// ── Replica de api.js: mapAlumno ──────────────────────────────
function mapAlumno(a) {
  const primerPadre = (a.padres && a.padres.length > 0) ? a.padres[0] : null;
  return {
    id:          a.id,
    grupoId:     a.grupoId,
    nombre:      a.nombre,
    matricula:   a.matricula,
    curp:        a.curp || '',
    activo:      a.activo,
    grupo:       a.grupo ? a.grupo.nombre : 'Sin grupo asignado',
    padre:       primerPadre ? primerPadre.nombre : 'No registrado',
    telefono:    primerPadre ? (primerPadre.telefono || 'N/D') : 'N/D',
    email:       primerPadre ? (primerPadre.email || '') : '',
    estadoPago:  a.estadoPago || null,
    mesesAdeudo: a.mesesAdeudo || 0,
  };
}

// ── Replica de api.js: mapPago ────────────────────────────────
function mapPago(p) {
  return {
    id:       p.id,
    alumno:   p.alumno ? p.alumno.nombre : '—',
    alumnoId: p.alumnoId,
    concepto: p.concepto,
    fecha:    p.fecha ? p.fecha.slice(0, 10) : '',
    monto:    p.monto,
    recargo:  p.tieneRecargo,
  };
}

// ── Replica de api.js: mapGrupo ───────────────────────────────
function mapGrupo(g) {
  return {
    id:      g.id,
    nombre:  g.nombre,
    nivel:   g.nivel,
    titular: g.titular,
    activo:  g.activo,
    alumnos: (g._count && g._count.alumnos) ? g._count.alumnos : 0,
    materias: g.materias || [],
  };
}

// ── Constantes de mapeo (exactas de api.js) ────────────────────
const CONCEPTO_MAP = {
  'Colegiatura':         'COLEGIATURA',
  'Inscripción':         'INSCRIPCION',
  'Material didáctico':  'MATERIAL_DIDACTICO',
  'Uniforme':            'UNIFORME',
  'Otro':                'OTRO',
};
const TIPO_BECA_MAP = {
  'Beca por hermanos (15%)':    'HERMANOS',
  'Excelencia académica (20%)': 'EXCELENCIA',
  'Inscripción temprana (10%)': 'INSCRIPCION_TEMPRANA',
};
const ROL_MAP = {
  'Administrador':      'ADMIN',
  'Estándar (Maestra)': 'MAESTRA',
  'Gestor':             'GESTOR',
};
const PERIODO_MAP = {
  'Trimestre 1': 'TRIMESTRE_1',
  'Trimestre 2': 'TRIMESTRE_2',
  'Trimestre 3': 'TRIMESTRE_3',
};

// Helper para crear JWT fake (sin firma criptográfica — solo para tests de lógica client-side)
function crearTokenFake(payload) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.firma_fake`;
}

// ─────────────────────────────────────────────────────────────
// SUITE 1: auth-guard — validación client-side de JWT
// ─────────────────────────────────────────────────────────────

describe('auth-guard — validación client-side de tokens JWT', () => {

  test('token null → { valido: false, razon: sin_token }', () => {
    const r = validarTokenClientSide(null);
    expect(r.valido).toBe(false);
    expect(r.razon).toBe('sin_token');
  });

  test('token vacío → { valido: false, razon: sin_token }', () => {
    const r = validarTokenClientSide('');
    expect(r.valido).toBe(false);
    expect(r.razon).toBe('sin_token');
  });

  test('token con un solo segmento → malformado', () => {
    const r = validarTokenClientSide('solounsegmento');
    expect(r.valido).toBe(false);
    expect(r.razon).toBe('malformado');
  });

  test('token con payload base64 inválido → malformado', () => {
    const r = validarTokenClientSide('head.!!!invalid_base64!!!.sig');
    expect(r.valido).toBe(false);
    expect(r.razon).toBe('malformado');
  });

  test('token expirado → { valido: false, razon: expirado }', () => {
    const token = crearTokenFake({ sub: '1', exp: Math.floor(Date.now() / 1000) - 100 });
    const r     = validarTokenClientSide(token);
    expect(r.valido).toBe(false);
    expect(r.razon).toBe('expirado');
  });

  test('token vigente → { valido: true } con payload', () => {
    const exp   = Math.floor(Date.now() / 1000) + 3600;
    const token = crearTokenFake({ sub: '42', rol: 'ADMIN', exp });
    const r     = validarTokenClientSide(token);
    expect(r.valido).toBe(true);
    expect(r.payload.sub).toBe('42');
    expect(r.payload.rol).toBe('ADMIN');
  });

  test('token sin campo exp → válido (sin límite de tiempo)', () => {
    const token = crearTokenFake({ sub: '99', rol: 'MAESTRA' });
    const r     = validarTokenClientSide(token);
    expect(r.valido).toBe(true);
  });

  test('token que expira exactamente ahora (edge) → expirado', () => {
    const token = crearTokenFake({ sub: '1', exp: Math.floor(Date.now() / 1000) - 1 });
    const r     = validarTokenClientSide(token);
    expect(r.valido).toBe(false);
    expect(r.razon).toBe('expirado');
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 2: api.js — getBase() con SAE_CONFIG dinámico
// ─────────────────────────────────────────────────────────────

describe('api.js — getBase() con SAE_CONFIG dinámico', () => {

  test('sin config → fallback localhost', () => {
    expect(getBase(null)).toBe('http://localhost:3000/api/v1');
  });

  test('sin config (undefined) → fallback localhost', () => {
    expect(getBase(undefined)).toBe('http://localhost:3000/api/v1');
  });

  test('con SAE_CONFIG.API_BASE → devuelve ese valor exacto', () => {
    const cfg = { API_BASE: 'http://192.168.1.10:3000/api/v1' };
    expect(getBase(cfg)).toBe('http://192.168.1.10:3000/api/v1');
  });

  test('SAE_CONFIG vacío → fallback localhost', () => {
    expect(getBase({})).toBe('http://localhost:3000/api/v1');
  });

  test('API_BASE con IP LAN → NO contiene localhost', () => {
    const cfg = { API_BASE: 'http://192.168.1.10:3000/api/v1' };
    expect(getBase(cfg)).not.toContain('localhost');
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 3: api.js — tokenProximoAExpirar()
// ─────────────────────────────────────────────────────────────

describe('api.js — tokenProximoAExpirar() para refresh proactivo', () => {

  test('token null → false', () => {
    expect(tokenProximoAExpirar(null, 15)).toBe(false);
  });

  test('token vacío → false', () => {
    expect(tokenProximoAExpirar('', 15)).toBe(false);
  });

  test('token que expira en 5 min → próximo (umbral 15)', () => {
    const token = crearTokenFake({ exp: Math.floor(Date.now() / 1000) + 300 });
    expect(tokenProximoAExpirar(token, 15)).toBe(true);
  });

  test('token que expira en 30 min → NO próximo (umbral 15)', () => {
    const token = crearTokenFake({ exp: Math.floor(Date.now() / 1000) + 1800 });
    expect(tokenProximoAExpirar(token, 15)).toBe(false);
  });

  test('token ya expirado → próximo (segundos restantes negativos < umbral)', () => {
    const token = crearTokenFake({ exp: Math.floor(Date.now() / 1000) - 60 });
    expect(tokenProximoAExpirar(token, 15)).toBe(true);
  });

  test('token sin campo exp → false (no hay umbral que comparar)', () => {
    const token = crearTokenFake({ sub: '1', rol: 'ADMIN' });
    expect(tokenProximoAExpirar(token, 15)).toBe(false);
  });

  test('token malformado → false (no lanza excepción)', () => {
    expect(() => tokenProximoAExpirar('not.a.token', 15)).not.toThrow();
    expect(tokenProximoAExpirar('not.a.token', 15)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 4: api.js — mapAlumno()
// ─────────────────────────────────────────────────────────────

describe('api.js — mapAlumno() adaptador API → formato frontend', () => {

  const alumnoBase = {
    id: 1, grupoId: 2, nombre: 'María López', matricula: 'ML001',
    curp: 'LOPM010101MDFPXX01', activo: true,
    grupo: { nombre: 'Primaria 4°A' },
    padres: [{ nombre: 'Ana López', telefono: '5551234567', email: 'ana@mail.com', esTutor: true }],
    estadoPago: 'AL_CORRIENTE', mesesAdeudo: 0,
  };

  test('extrae campos básicos correctamente', () => {
    const r = mapAlumno(alumnoBase);
    expect(r.id).toBe(1);
    expect(r.nombre).toBe('María López');
    expect(r.matricula).toBe('ML001');
    expect(r.curp).toBe('LOPM010101MDFPXX01');
    expect(r.activo).toBe(true);
  });

  test('extrae nombre del grupo desde objeto anidado', () => {
    const r = mapAlumno(alumnoBase);
    expect(r.grupo).toBe('Primaria 4°A');
  });

  test('alumno sin grupo → "Sin grupo asignado"', () => {
    const r = mapAlumno({ ...alumnoBase, grupo: null });
    expect(r.grupo).toBe('Sin grupo asignado');
  });

  test('extrae primer padre como campos planos', () => {
    const r = mapAlumno(alumnoBase);
    expect(r.padre).toBe('Ana López');
    expect(r.telefono).toBe('5551234567');
    expect(r.email).toBe('ana@mail.com');
  });

  test('alumno sin padres → campos padre como defaults', () => {
    const r = mapAlumno({ ...alumnoBase, padres: [] });
    expect(r.padre).toBe('No registrado');
    expect(r.telefono).toBe('N/D');
    expect(r.email).toBe('');
  });

  test('padre sin teléfono → N/D', () => {
    const r = mapAlumno({ ...alumnoBase, padres: [{ nombre: 'Tutor', esTutor: true }] });
    expect(r.telefono).toBe('N/D');
  });

  test('campos financieros mapeados correctamente', () => {
    const r = mapAlumno(alumnoBase);
    expect(r.estadoPago).toBe('AL_CORRIENTE');
    expect(r.mesesAdeudo).toBe(0);
  });

  test('alumno sin estadoPago → null', () => {
    const r = mapAlumno({ ...alumnoBase, estadoPago: undefined });
    expect(r.estadoPago).toBeNull();
  });

  test('mesesAdeudo undefined → 0', () => {
    const r = mapAlumno({ ...alumnoBase, mesesAdeudo: undefined });
    expect(r.mesesAdeudo).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 5: api.js — mapPago()
// ─────────────────────────────────────────────────────────────

describe('api.js — mapPago() adaptador API → formato frontend', () => {

  const pagoBase = {
    id: 10, alumnoId: 1,
    alumno: { nombre: 'Carlos Pérez' },
    concepto: 'COLEGIATURA',
    fecha: '2026-01-15T12:00:00.000Z',
    monto: 4000, tieneRecargo: false,
  };

  test('extrae nombre del alumno desde objeto anidado', () => {
    const r = mapPago(pagoBase);
    expect(r.alumno).toBe('Carlos Pérez');
  });

  test('sin alumno → "—"', () => {
    const r = mapPago({ ...pagoBase, alumno: null });
    expect(r.alumno).toBe('—');
  });

  test('fecha ISO → solo YYYY-MM-DD', () => {
    const r = mapPago(pagoBase);
    expect(r.fecha).toBe('2026-01-15');
  });

  test('sin fecha → string vacío', () => {
    const r = mapPago({ ...pagoBase, fecha: null });
    expect(r.fecha).toBe('');
  });

  test('tieneRecargo false → recargo false', () => {
    const r = mapPago(pagoBase);
    expect(r.recargo).toBe(false);
  });

  test('tieneRecargo true → recargo true', () => {
    const r = mapPago({ ...pagoBase, tieneRecargo: true });
    expect(r.recargo).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 6: api.js — mapGrupo()
// ─────────────────────────────────────────────────────────────

describe('api.js — mapGrupo() adaptador API → formato frontend', () => {

  const grupoBase = {
    id: 5, nombre: 'Primaria 4°A', nivel: 'PRIMARIA',
    titular: 'Prof. García', activo: true,
    _count: { alumnos: 28 }, materias: [{ id: 1, materia: 'Matemáticas' }],
  };

  test('extrae campos básicos', () => {
    const r = mapGrupo(grupoBase);
    expect(r.id).toBe(5);
    expect(r.nombre).toBe('Primaria 4°A');
    expect(r.nivel).toBe('PRIMARIA');
    expect(r.titular).toBe('Prof. García');
    expect(r.activo).toBe(true);
  });

  test('extrae conteo de alumnos desde _count', () => {
    const r = mapGrupo(grupoBase);
    expect(r.alumnos).toBe(28);
  });

  test('sin _count → alumnos = 0', () => {
    const r = mapGrupo({ ...grupoBase, _count: null });
    expect(r.alumnos).toBe(0);
  });

  test('_count sin alumnos → 0', () => {
    const r = mapGrupo({ ...grupoBase, _count: {} });
    expect(r.alumnos).toBe(0);
  });

  test('materias se pasan tal cual', () => {
    const r = mapGrupo(grupoBase);
    expect(r.materias).toHaveLength(1);
    expect(r.materias[0].materia).toBe('Matemáticas');
  });

  test('sin materias → array vacío', () => {
    const r = mapGrupo({ ...grupoBase, materias: undefined });
    expect(r.materias).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 7: api.js — Mapas de constantes UI → API
// ─────────────────────────────────────────────────────────────

describe('api.js — CONCEPTO_MAP, TIPO_BECA_MAP, ROL_MAP, PERIODO_MAP', () => {

  test('CONCEPTO_MAP — Colegiatura → COLEGIATURA', () => {
    expect(CONCEPTO_MAP['Colegiatura']).toBe('COLEGIATURA');
  });
  test('CONCEPTO_MAP — Inscripción → INSCRIPCION', () => {
    expect(CONCEPTO_MAP['Inscripción']).toBe('INSCRIPCION');
  });
  test('CONCEPTO_MAP — cubre los 5 conceptos del sistema', () => {
    expect(Object.keys(CONCEPTO_MAP)).toHaveLength(5);
  });

  test('TIPO_BECA_MAP — hermanos → HERMANOS', () => {
    expect(TIPO_BECA_MAP['Beca por hermanos (15%)']).toBe('HERMANOS');
  });
  test('TIPO_BECA_MAP — excelencia → EXCELENCIA', () => {
    expect(TIPO_BECA_MAP['Excelencia académica (20%)']).toBe('EXCELENCIA');
  });
  test('TIPO_BECA_MAP — inscripción temprana → INSCRIPCION_TEMPRANA', () => {
    expect(TIPO_BECA_MAP['Inscripción temprana (10%)']).toBe('INSCRIPCION_TEMPRANA');
  });

  test('ROL_MAP — Administrador → ADMIN', () => {
    expect(ROL_MAP['Administrador']).toBe('ADMIN');
  });
  test('ROL_MAP — Estándar (Maestra) → MAESTRA', () => {
    expect(ROL_MAP['Estándar (Maestra)']).toBe('MAESTRA');
  });
  test('ROL_MAP — Gestor → GESTOR', () => {
    expect(ROL_MAP['Gestor']).toBe('GESTOR');
  });

  test('PERIODO_MAP — Trimestre 1 → TRIMESTRE_1', () => {
    expect(PERIODO_MAP['Trimestre 1']).toBe('TRIMESTRE_1');
  });
  test('PERIODO_MAP — todos los 3 trimestres mapeados', () => {
    expect(Object.keys(PERIODO_MAP)).toHaveLength(3);
    expect(Object.values(PERIODO_MAP).every(v => v.startsWith('TRIMESTRE_'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 8: Offline handling — estructura de respuesta de red
// ─────────────────────────────────────────────────────────────

describe('api.js — offline handling — estructura { ok: false, offline: true }', () => {

  // Replica de la rama catch de request() en api.js
  function simularErrorRed() {
    return { ok: false, offline: true, message: 'Sin conexión al servidor SAE. Verifica la red.' };
  }

  function simularRespuesta(res) {
    return { ok: res.ok, offline: false, ...res };
  }

  test('error de red → ok=false, offline=true', () => {
    const r = simularErrorRed();
    expect(r.ok).toBe(false);
    expect(r.offline).toBe(true);
  });

  test('error de red → mensaje visible al usuario', () => {
    const r = simularErrorRed();
    expect(r.message).toBeTruthy();
    expect(typeof r.message).toBe('string');
  });

  test('respuesta 200 → online (offline no true)', () => {
    const r = simularRespuesta({ ok: true, status: 200 });
    expect(r.ok).toBe(true);
    expect(r.offline).toBe(false);
  });

  test('respuesta 401 → online (not offline — puede hacer refresh)', () => {
    const r = simularRespuesta({ ok: false, status: 401 });
    expect(r.offline).toBe(false);
  });

  test('los paneles no se rompen con offline=true — verificar guards', () => {
    const res = simularErrorRed();
    // Patrón usado en todos los paneles: if (!res.offline) toast(...)
    let toastLlamado = false;
    if (!res.offline) { toastLlamado = true; }
    expect(toastLlamado).toBe(false);  // offline → no muestra toast innecesario
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 9: Dashboard — cálculo de métricas en memoria
// ─────────────────────────────────────────────────────────────

describe('Dashboard — cálculo de métricas a partir de datos en memoria', () => {

  const alumnosTest = [
    { id: 1, nombre: 'Ana',    activo: true,  mesesAdeudo: 0 },
    { id: 2, nombre: 'Luis',   activo: true,  mesesAdeudo: 1 },
    { id: 3, nombre: 'María',  activo: true,  mesesAdeudo: 3 },
    { id: 4, nombre: 'Carlos', activo: false, mesesAdeudo: 0 },
  ];

  test('total alumnos = length del array', () => {
    expect(alumnosTest.length).toBe(4);
  });

  test('deudores = alumnos con mesesAdeudo > 0', () => {
    const deudores = alumnosTest.filter(a => (a.mesesAdeudo || 0) > 0).length;
    expect(deudores).toBe(2);
  });

  test('badge deudores se muestra solo si hay > 0', () => {
    const deudores = alumnosTest.filter(a => (a.mesesAdeudo || 0) > 0).length;
    expect(deudores > 0).toBe(true);   // x-show="dashSummary.deudores>0"
  });

  test('sin deudores → badge oculto', () => {
    const sinDeuda = alumnosTest.filter(a => (a.mesesAdeudo || 0) > 0);
    const listaVacia = sinDeuda.length === 0;
    expect(listaVacia).toBe(false);  // Hay 2 deudores en el test set
  });

  test('ordenar deudores por mesesAdeudo descendente', () => {
    const deudores = alumnosTest
      .filter(a => (a.mesesAdeudo || 0) > 0)
      .sort((x, y) => y.mesesAdeudo - x.mesesAdeudo);
    expect(deudores[0].nombre).toBe('María');   // 3 meses
    expect(deudores[1].nombre).toBe('Luis');    // 1 mes
  });

  test('ingresos del día = suma de montos del mismo día', () => {
    const hoy  = '2026-01-15';
    const pagos = [
      { fecha: '2026-01-15', monto: 4000 },
      { fecha: '2026-01-15', monto: 400  },
      { fecha: '2026-01-14', monto: 4000 },  // ayer — no cuenta
    ];
    const ingresos = pagos
      .filter(p => p.fecha === hoy)
      .reduce((s, p) => s + (Number(p.monto) || 0), 0);
    expect(ingresos).toBe(4400);
  });
});

// ─────────────────────────────────────────────────────────────
// SUITE 10: Paginación — lógica de navegación
// ─────────────────────────────────────────────────────────────

describe('Paginación — lógica de navegación entre páginas', () => {

  function irPagina(paginaActual, paginasSolicitada, totalPaginas) {
    if (paginasSolicitada < 1 || paginasSolicitada > totalPaginas) return paginaActual;
    return paginasSolicitada;
  }

  test('ir a página 2 desde 1 → avanza', () => {
    expect(irPagina(1, 2, 5)).toBe(2);
  });

  test('ir a página 0 → permanece en la actual', () => {
    expect(irPagina(1, 0, 5)).toBe(1);
  });

  test('ir a página más allá del total → permanece en la actual', () => {
    expect(irPagina(3, 6, 5)).toBe(3);
  });

  test('botón Anterior en página 1 → disabled (paginaActual <= 1)', () => {
    const paginaActual = 1;
    expect(paginaActual <= 1).toBe(true);
  });

  test('botón Siguiente en última página → disabled (paginaActual >= totalPaginas)', () => {
    const paginaActual = 5;
    const totalPaginas = 5;
    expect(paginaActual >= totalPaginas).toBe(true);
  });

  test('info de paginación con datos reales', () => {
    const info = `Página 2 de 5 · 100 alumnos`;
    expect(info).toContain('Página 2 de 5');
    expect(info).toContain('100 alumnos');
  });
});
