const { execSync } = require('child_process');

console.log('Esperando a que Docker Desktop inicie...');
const interval = setInterval(() => {
  try {
    execSync('docker info', { stdio: 'ignore' });
    console.log('¡Docker está corriendo!');
    console.log('Iniciando base de datos postgres_sae...');
    execSync('docker compose up -d postgres_sae', { stdio: 'inherit' });
    clearInterval(interval);
    process.exit(0);
  } catch (err) {
    console.log('Docker aún no responde. Reintentando en 5 segundos...');
  }
}, 5000);

setTimeout(() => {
  console.log('Tiempo de espera agotado. Docker no inició.');
  clearInterval(interval);
  process.exit(1);
}, 120000);
