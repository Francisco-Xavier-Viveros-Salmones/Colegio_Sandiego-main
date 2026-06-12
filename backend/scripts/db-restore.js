/**
 * SAE — Script de Restauración de Base de Datos PostgreSQL
 * Restaura un backup específico con confirmación explícita.
 *
 * Uso:
 *   node scripts/db-restore.js --file="sae_backup_2026-05-27_12-00-00_auto.sql"
 *   node scripts/db-restore.js --list   (listar backups disponibles)
 *
 * ADVERTENCIA: sobrescribe la BD actual. No se puede deshacer.
 */

'use strict';

// Ruta explícita para que funcione independientemente del cwd de ejecución
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { execSync } = require('child_process');
const path         = require('path');
const fs           = require('fs');
const readline     = require('readline');

// ── Configuración ─────────────────────────────────────────────
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(__dirname, '..', process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../../backups');

const PG_HOST    = process.env.POSTGRES_HOST || 'localhost';
const PG_PORT    = process.env.POSTGRES_PORT || '5432';
const PG_USER    = process.env.POSTGRES_USER || 'sae_admin';
const PG_DB      = process.env.POSTGRES_DB   || 'sae_colegio_san_diego';
// Sin fallback hardcodeado — la contraseña DEBE estar en .env
const PG_PASS    = process.env.POSTGRES_PASSWORD ?? '';

// ── Parsear argumentos CLI ────────────────────────────────────
const args     = process.argv.slice(2);
const listMode = args.includes('--list');
const fileArg  = args.find(a => a.startsWith('--file='));
const filename = fileArg ? fileArg.split('=')[1] : null;

// ── Modo listado ──────────────────────────────────────────────
if (listMode) {
  console.log('\n📦 Backups disponibles:\n');
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('  (directorio de backups no existe)');
    process.exit(0);
  }
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql') && f.startsWith('sae_backup_'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.log('  (no hay backups disponibles)');
  } else {
    backups.forEach((f, i) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      const mb   = (stat.size / 1024 / 1024).toFixed(2);
      console.log(`  ${i + 1}. ${f} [${mb} MB]`);
    });
  }
  process.exit(0);
}

// ── Validar archivo ───────────────────────────────────────────
if (!filename) {
  console.error('❌ Debes especificar un archivo con --file="nombre.sql"');
  console.error('   Usa --list para ver los backups disponibles.');
  process.exit(1);
}

const filepath = path.join(BACKUP_DIR, filename);
if (!fs.existsSync(filepath)) {
  console.error(`❌ Archivo no encontrado: ${filepath}`);
  process.exit(1);
}

// ── Confirmación interactiva ──────────────────────────────────
async function confirmar(pregunta) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(pregunta, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ── Verificar Docker ──────────────────────────────────────────
function isDockerRunning() {
  try {
    execSync('docker inspect sae_postgres', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ── Ejecutar restore ──────────────────────────────────────────
async function runRestore() {
  const stat   = fs.statSync(filepath);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   SAE — Restauración de Base de Datos            ║');
  console.log('║   ⚠️  ESTA ACCIÓN SOBRESCRIBE LA BD ACTUAL        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n  Archivo:  ${filename}`);
  console.log(`  Tamaño:   ${sizeMB} MB`);
  console.log(`  BD destino: ${PG_DB} en ${PG_HOST}:${PG_PORT}\n`);

  const resp = await confirmar('¿Confirmas la restauración? Escribe CONFIRMAR para continuar: ');
  if (resp !== 'confirmar') {
    console.log('\n❌ Restauración cancelada.');
    process.exit(0);
  }

  console.log('\n[RESTORE] Iniciando restauración...');

  try {
    let cmd;
    if (isDockerRunning()) {
      console.log('[RESTORE] Usando Docker container sae_postgres...');
      // Copiar el archivo al contenedor y restaurar
      execSync(`docker cp "${filepath}" sae_postgres:/tmp/restore.sql`, { stdio: 'inherit' });
      cmd = `docker exec sae_postgres psql -U ${PG_USER} -d ${PG_DB} -f /tmp/restore.sql`;
    } else {
      console.log('[RESTORE] Usando psql local...');
      cmd = [
        'psql',
        `-h ${PG_HOST}`,
        `-p ${PG_PORT}`,
        `-U ${PG_USER}`,
        `-d ${PG_DB}`,
        `--file="${filepath}"`,
      ].join(' ');
    }

    execSync(cmd, {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: { ...process.env, PGPASSWORD: PG_PASS },
      shell: true,
    });

    console.log('\n✅ Restauración completada exitosamente.');
    console.log('   Recuerda reiniciar el backend: npm run dev');

  } catch (err) {
    console.error(`\n❌ Error en la restauración: ${err.message}`);
    process.exit(1);
  }
}

runRestore();
