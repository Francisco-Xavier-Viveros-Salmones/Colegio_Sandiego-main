/**
 * SAE — Script de Backup de Base de Datos PostgreSQL
 * Genera backups timestamped en formato pg_dump (.sql.gz).
 *
 * Uso:
 *   node scripts/db-backup.js
 *   node scripts/db-backup.js --label="antes-migracion"
 *
 * Requiere pg_dump instalado (incluido en PostgreSQL client tools).
 * En Docker: docker exec sae_postgres pg_dump ...
 */

'use strict';

// Ruta explícita para que funcione independientemente del cwd de ejecución
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { execSync } = require('child_process');
const path         = require('path');
const fs           = require('fs');

// ── Configuración ─────────────────────────────────────────────
const BACKUP_DIR  = process.env.BACKUP_DIR
  ? path.resolve(__dirname, '..', process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../../backups');

const PG_HOST     = process.env.POSTGRES_HOST || 'localhost';
const PG_PORT     = process.env.POSTGRES_PORT || '5432';
const PG_USER     = process.env.POSTGRES_USER || 'sae_admin';
const PG_DB       = process.env.POSTGRES_DB   || 'sae_colegio_san_diego';
// Sin fallback hardcodeado — la contraseña DEBE estar en .env
const PG_PASS     = process.env.POSTGRES_PASSWORD ?? '';

// Etiqueta opcional desde CLI
const labelArg    = process.argv.find(a => a.startsWith('--label='));
const label       = labelArg ? labelArg.split('=')[1] : 'auto';

// ── Timestamp del backup ──────────────────────────────────────
const now         = new Date();
const timestamp   = now.toISOString()
  .replace(/[:.]/g, '-')
  .replace('T', '_')
  .slice(0, 19);

const filename    = `sae_backup_${timestamp}_${label}.sql`;
const filepath    = path.join(BACKUP_DIR, filename);

// ── Crear directorio si no existe ─────────────────────────────
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`[BACKUP] Directorio creado: ${BACKUP_DIR}`);
}

// ── Verificar si PostgreSQL está disponible ───────────────────
function isDockerRunning() {
  try {
    execSync('docker inspect sae_postgres', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ── Ejecutar backup ───────────────────────────────────────────
async function runBackup() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   SAE — Backup de Base de Datos                  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`[BACKUP] Destino: ${filepath}`);
  console.log(`[BACKUP] BD: ${PG_DB} en ${PG_HOST}:${PG_PORT}`);

  if (!PG_PASS && !isDockerRunning()) {
    console.warn('[BACKUP] ⚠️  POSTGRES_PASSWORD no configurado en .env — el backup local puede fallar.');
  }

  try {
    let cmd;

    if (isDockerRunning()) {
      // Backup vía Docker container
      console.log('[BACKUP] Usando Docker container sae_postgres...');
      cmd = [
        'docker exec sae_postgres',
        `pg_dump -U ${PG_USER} -d ${PG_DB}`,
        '--format=plain --no-password',
        `> "${filepath}"`,
      ].join(' ');
    } else {
      // Backup directo con pg_dump local
      console.log('[BACKUP] Usando pg_dump local...');
      process.env.PGPASSWORD = PG_PASS;
      cmd = [
        'pg_dump',
        `-h ${PG_HOST}`,
        `-p ${PG_PORT}`,
        `-U ${PG_USER}`,
        `-d ${PG_DB}`,
        '--format=plain',
        `--file="${filepath}"`,
      ].join(' ');
    }

    execSync(cmd, {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: { ...process.env, PGPASSWORD: PG_PASS },
      shell: true,
    });

    // Verificar que el archivo fue creado y tiene contenido
    const stat = fs.statSync(filepath);
    if (stat.size === 0) {
      throw new Error('El archivo de backup está vacío.');
    }

    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Backup completado exitosamente.`);
    console.log(`   Archivo: ${filename}`);
    console.log(`   Tamaño:  ${sizeMB} MB`);
    console.log(`   Ruta:    ${filepath}`);

    // Registrar en log de backups
    const logFile = path.join(BACKUP_DIR, 'backup.log');
    const logEntry = `${now.toISOString()} | ${filename} | ${sizeMB} MB | OK\n`;
    fs.appendFileSync(logFile, logEntry);

    // Limpiar backups antiguos (mantener últimos 10)
    limpiarBackupsAntiguos();

  } catch (err) {
    console.error(`\n❌ Error en backup: ${err.message}`);
    // Limpiar archivo vacío si se creó
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    process.exit(1);
  }
}

// ── Limpiar backups antiguos ──────────────────────────────────
function limpiarBackupsAntiguos(mantener = 10) {
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql') && f.startsWith('sae_backup_'))
    .sort()
    .reverse(); // Más recientes primero

  if (backups.length > mantener) {
    const aEliminar = backups.slice(mantener);
    aEliminar.forEach(file => {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
      console.log(`[BACKUP] Backup antiguo eliminado: ${file}`);
    });
    console.log(`[BACKUP] Política: últimos ${mantener} backups conservados.`);
  }
}

runBackup();
