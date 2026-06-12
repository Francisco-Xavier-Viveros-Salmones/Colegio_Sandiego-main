/**
 * SAE — db-validate.js
 * Valida que la conexión con PostgreSQL sea estable y que el schema esté
 * correctamente aplicado (33 tablas + datos de seed mínimos).
 *
 * Uso:
 *   node scripts/db-validate.js
 *
 * Códigos de salida:
 *   0 → Todo OK
 *   1 → Error de conexión o schema incompleto
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [] });

// ── Tablas que deben existir (33 modelos del schema v6) ────────
const TABLAS_REQUERIDAS = [
  'usuario', 'rol', 'usuario_rol',
  'nivel_educativo', 'ciclo_escolar', 'grupo', 'materia', 'grupo_materia',
  'periodo_evaluacion', 'tutor', 'alumno', 'tutor_alumno',
  'plan_pago', 'inscripcion_ciclo',
  'calificacion', 'asistencia',
  'tarifa', 'calendario_pago', 'pago', 'aplicacion_pago', 'recargo',
  'movimiento_saldo', 'factura', 'factura_pago',
  'beca', 'solicitud_beca', 'asignacion_beca',
  'ventana_inscripcion_temprana',
  'documento', 'notificacion',
  'intento_login', 'log_auditoria', 'configuracion_sistema',
];

// ── Colores ANSI para el terminal ─────────────────────────────
const OK  = '\x1b[32m✔\x1b[0m';
const ERR = '\x1b[31m✘\x1b[0m';
const INF = '\x1b[36mℹ\x1b[0m';

async function validate() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SAE — Validación de Base de Datos PostgreSQL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let errores = 0;

  // ── 1. Verificar conexión ────────────────────────────────────
  process.stdout.write(`  [1/4] Conexión a PostgreSQL... `);
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log(`${OK} Conectado`);
  } catch (err) {
    console.log(`${ERR} FALLO — ${err.message}`);
    console.log(`\n  ${INF} DATABASE_URL: ${process.env.DATABASE_URL ? '***configurada***' : '⚠️ NO CONFIGURADA'}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  // ── 2. Verificar versión de PostgreSQL ───────────────────────
  process.stdout.write(`  [2/4] Versión de PostgreSQL...  `);
  try {
    const [{ version }] = await prisma.$queryRaw`SELECT version()`;
    const match = version.match(/PostgreSQL (\d+\.\d+)/);
    const ver   = match ? match[1] : version.slice(0, 30);
    const major = parseInt(ver.split('.')[0], 10);
    if (major < 14) {
      console.log(`${ERR} ${ver} — se requiere PostgreSQL 14+`);
      errores++;
    } else {
      console.log(`${OK} ${ver}`);
    }
  } catch (err) {
    console.log(`${ERR} No se pudo leer la versión — ${err.message}`);
    errores++;
  }

  // ── 3. Verificar tablas del schema ───────────────────────────
  console.log(`  [3/4] Verificando ${TABLAS_REQUERIDAS.length} tablas del schema...\n`);
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM   information_schema.tables
      WHERE  table_schema = 'public'
        AND  table_type   = 'BASE TABLE'
      ORDER  BY table_name
    `;
    const tablasExistentes = new Set(result.map(r => r.table_name));

    let tablasFaltantes = [];
    for (const tabla of TABLAS_REQUERIDAS) {
      const existe = tablasExistentes.has(tabla);
      console.log(`       ${existe ? OK : ERR} ${tabla}`);
      if (!existe) { tablasFaltantes.push(tabla); errores++; }
    }

    if (tablasFaltantes.length === 0) {
      console.log(`\n       ${OK} Todas las ${TABLAS_REQUERIDAS.length} tablas presentes`);
    } else {
      console.log(`\n       ${ERR} Faltan ${tablasFaltantes.length} tabla(s): ${tablasFaltantes.join(', ')}`);
    }
  } catch (err) {
    console.log(`       ${ERR} Error al consultar tablas — ${err.message}`);
    errores++;
  }

  // ── 4. Verificar datos mínimos del seed ─────────────────────
  console.log(`\n  [4/4] Verificando datos de seed mínimos...\n`);
  const checks = [
    { label: 'Roles del sistema (≥4)',         query: () => prisma.rol.count(),              min: 4  },
    { label: 'Usuarios activos (≥1)',           query: () => prisma.usuario.count({ where: { activo: true } }), min: 1 },
    { label: 'Niveles educativos (≥1)',         query: () => prisma.nivelEducativo.count(),  min: 1  },
    { label: 'Ciclo escolar activo (≥1)',       query: () => prisma.cicloEscolar.count({ where: { activo: true } }), min: 1 },
    { label: 'Configuración sistema (≥1)',      query: () => prisma.configuracionSistema.count(), min: 1 },
  ];

  for (const check of checks) {
    try {
      const count = await check.query();
      const pasa  = count >= check.min;
      console.log(`       ${pasa ? OK : ERR} ${check.label} — encontrado: ${count}`);
      if (!pasa) errores++;
    } catch (err) {
      console.log(`       ${ERR} ${check.label} — error: ${err.message}`);
      errores++;
    }
  }

  // ── Resultado final ──────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (errores === 0) {
    console.log(`  ${OK} VALIDACIÓN EXITOSA — Base de datos lista para producción\n`);
  } else {
    console.log(`  ${ERR} VALIDACIÓN FALLIDA — ${errores} error(es) encontrado(s)`);
    console.log('  Revisa el schema y el seed antes de levantar el sistema.\n');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
  process.exit(errores > 0 ? 1 : 0);
}

validate().catch(async (err) => {
  console.error(`\n  ${ERR} Error fatal — ${err.message}\n`);
  await prisma.$disconnect();
  process.exit(1);
});
