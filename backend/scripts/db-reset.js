/**
 * SAE — Script de Reset Seguro de Base de Datos
 * Hace backup automático y luego ejecuta migrate reset + seed.
 *
 * Uso: npm run db:reset
 * Solo para DESARROLLO. No usar en producción.
 */

'use strict';

// Ruta explícita para que funcione independientemente del cwd de ejecución
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { execSync } = require('child_process');
const readline     = require('readline');
const path         = require('path');

const IS_PROD = process.env.NODE_ENV === 'production';

async function confirmar(pregunta) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(pregunta, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   SAE — Reset de Base de Datos                   ║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (IS_PROD) {
    console.error('\n❌ PROHIBIDO: db:reset no se puede ejecutar en producción.');
    process.exit(1);
  }

  console.log('\n⚠️  Este comando:');
  console.log('   1. Hace un backup automático de la BD actual');
  console.log('   2. Elimina TODOS los datos');
  console.log('   3. Aplica todas las migraciones');
  console.log('   4. Ejecuta el seed de datos iniciales\n');

  const resp = await confirmar('¿Confirmas el reset? Escribe RESET para continuar: ');
  if (resp !== 'reset') {
    console.log('\n❌ Reset cancelado.');
    process.exit(0);
  }

  // Paso 1: Backup automático
  console.log('\n[RESET] Paso 1/4: Haciendo backup de seguridad...');
  try {
    execSync('node scripts/db-backup.js --label=pre-reset', {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
    });
  } catch {
    console.warn('[RESET] ⚠️  Backup fallido — continuando de todas formas...');
  }

  // Paso 2: Reset de migraciones
  console.log('\n[RESET] Paso 2/4: Reseteando migraciones...');
  execSync('npx prisma migrate reset --force', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });

  // Paso 3: Aplicar migraciones
  console.log('\n[RESET] Paso 3/4: Aplicando migraciones...');
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });

  // Paso 4: Seed
  console.log('\n[RESET] Paso 4/4: Ejecutando seed...');
  execSync('node prisma/seed.js', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });

  console.log('\n✅ Reset completado. La BD está lista con datos iniciales.');
}

main().catch(err => {
  console.error('\n❌ Error en db:reset:', err.message);
  process.exit(1);
});
