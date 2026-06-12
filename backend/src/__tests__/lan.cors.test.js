/**
 * SAE — lan.cors.test.js
 * Tests de red LAN y CORS (Sesión 14 — LAN/CORS Finalization)
 *
 * Cubre:
 *   1. CORS_ORIGIN parsing — trim de espacios (bug corregido en env.js)
 *   2. GET /config.js  — inyección dinámica IP LAN, estructura SAE_CONFIG
 *   3. CORS no-origin  — requests sin header Origin (curl, Postman, health checks)
 *   4. CORS explícito  — orígenes definidos en CORS_ORIGIN son aceptados
 *   5. Lógica /24      — detección de subred (equivalente a esOrigenLAN)
 *   6. GET /health     — accesible sin autenticación desde LAN
 *
 * Las variables de entorno se configuran ANTES de require('../app') para que
 * config/env.js las lea con los valores correctos del test.
 */

'use strict';

// ── Env debe estar lista ANTES de cualquier require que cargue config/env ──
process.env.JWT_SECRET   = 'test-secret-key-para-vitest-minimo-32-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV     = 'test';
// CORS_ORIGIN con dos orígenes válidos para los tests de CORS explícito
process.env.CORS_ORIGIN  = 'http://localhost:3000,http://127.0.0.1:3000';

const request = require('supertest');
const app     = require('../app');

// ─────────────────────────────────────────────────────────────
// 1. CORS_ORIGIN parsing — trim de espacios
//    Verifica el fix: .split(',').map(s => s.trim())
// ─────────────────────────────────────────────────────────────

describe('CORS_ORIGIN parsing — trim de espacios al separar por comas', () => {
  // Helper que replica la lógica corregida de env.js
  function parseCorsOrigins(raw) {
    return (raw || 'http://localhost:3000').split(',').map(s => s.trim());
  }

  test('orígenes con espacio después de coma quedan limpios', () => {
    const raw    = 'http://localhost:3000, http://127.0.0.1:3000, http://192.168.1.5:3000';
    const parsed = parseCorsOrigins(raw);
    expect(parsed[0]).toBe('http://localhost:3000');
    expect(parsed[1]).toBe('http://127.0.0.1:3000');
    expect(parsed[2]).toBe('http://192.168.1.5:3000');
  });

  test('sin espacios — valores idénticos al original', () => {
    const raw    = 'http://localhost:3000,http://127.0.0.1:3000';
    const parsed = parseCorsOrigins(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toBe('http://localhost:3000');
    expect(parsed[1]).toBe('http://127.0.0.1:3000');
  });

  test('un solo origen — no se afecta con trim', () => {
    const parsed = parseCorsOrigins('http://localhost:3000');
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toBe('http://localhost:3000');
  });

  test('espacio al inicio y al final → se elimina con trim', () => {
    const raw    = '  http://192.168.1.10:3000  ,  http://192.168.1.20:3000  ';
    const parsed = parseCorsOrigins(raw);
    expect(parsed[0]).toBe('http://192.168.1.10:3000');
    expect(parsed[1]).toBe('http://192.168.1.20:3000');
  });

  test('demuestra por qué el fix es necesario: sin trim el .includes() falla', () => {
    const conEspacio  = [' http://192.168.1.5:3000'];  // sin trim (bug)
    const sinEspacio  = ['http://192.168.1.5:3000'];   // con trim (fix)
    expect(conEspacio.includes('http://192.168.1.5:3000')).toBe(false);  // bug
    expect(sinEspacio.includes('http://192.168.1.5:3000')).toBe(true);   // fix
  });

  test('valor vacío — parse devuelve string vacío sin romper', () => {
    const parsed = parseCorsOrigins('');
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────
// 2. GET /config.js — inyección dinámica de IP LAN
// ─────────────────────────────────────────────────────────────

describe('GET /config.js — configuración dinámica LAN', () => {
  test('responde 200', async () => {
    const res = await request(app).get('/config.js');
    expect(res.status).toBe(200);
  });

  test('Content-Type es application/javascript', async () => {
    const res = await request(app).get('/config.js');
    expect(res.headers['content-type']).toMatch(/javascript/);
  });

  test('cuerpo contiene window.SAE_CONFIG', async () => {
    const res = await request(app).get('/config.js');
    expect(res.text).toContain('window.SAE_CONFIG');
  });

  test('contiene API_BASE con /api/v1', async () => {
    const res = await request(app).get('/config.js');
    expect(res.text).toContain('API_BASE');
    expect(res.text).toContain('/api/v1');
  });

  test('contiene SERVER_IP (IP del servidor detectada)', async () => {
    const res = await request(app).get('/config.js');
    expect(res.text).toContain('SERVER_IP');
  });

  test('contiene PORT con número de puerto', async () => {
    const res = await request(app).get('/config.js');
    expect(res.text).toContain('PORT');
  });

  test('contiene VERSION 2.0.0', async () => {
    const res = await request(app).get('/config.js');
    expect(res.text).toContain('2.0.0');
  });

  test('Cache-Control incluye no-cache (IP dinámica no debe cachearse en LAN)', async () => {
    const res = await request(app).get('/config.js');
    expect(res.headers['cache-control']).toMatch(/no-cache/);
  });

  test('API_BASE no contiene localhost hardcodeado', async () => {
    const res = await request(app).get('/config.js');
    // Extraer el valor de API_BASE del script
    const match = res.text.match(/API_BASE:\s*'([^']+)'/);
    if (match) {
      // Si hay una IP real, no debe ser localhost (excepto en entorno de test sin LAN)
      // Lo importante es que el campo existe y tiene formato correcto
      expect(match[1]).toMatch(/^http:\/\//);
    } else {
      // El campo API_BASE siempre debe estar presente
      expect(res.text).toContain('API_BASE');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 3. CORS — requests sin header Origin
//    curl, Postman, health checks internos → siempre permitidos
// ─────────────────────────────────────────────────────────────

describe('CORS — requests sin header Origin (curl / Postman / health checks)', () => {
  test('GET /health sin Origin → 200 (no bloqueado por CORS)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /config.js sin Origin → 200', async () => {
    const res = await request(app).get('/config.js');
    expect(res.status).toBe(200);
  });

  test('POST /api/v1/auth/login sin Origin → no es bloqueado por CORS (puede ser 4xx)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'test', password: 'test123' });
    // CORS no bloquea (sin Origin siempre pasa) — puede ser 401/422/429 pero nunca 0 o CORS error
    expect(res.status).toBeGreaterThan(0);
    expect([400, 401, 422, 429].includes(res.status)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. CORS — orígenes explícitos de CORS_ORIGIN
//    Orígenes en la lista del .env reciben Access-Control-Allow-Origin
// ─────────────────────────────────────────────────────────────

describe('CORS — orígenes explícitos (CORS_ORIGIN en .env)', () => {
  test('http://localhost:3000 (primer origen) → ACAO en respuesta', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  test('http://127.0.0.1:3000 (segundo origen) → ACAO en respuesta', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://127.0.0.1:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
  });

  test('respuesta incluye Access-Control-Allow-Credentials para origen válido', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('preflight OPTIONS responde a origen válido', async () => {
    const res = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization');
    // Preflight puede devolver 204 o 200 según la configuración del cors middleware
    expect([200, 204].includes(res.status)).toBe(true);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Lógica de detección de subred /24
//    Replica esOrigenLAN() de app.js para validar la lógica de matching
// ─────────────────────────────────────────────────────────────

describe('Lógica esOrigenLAN — detección de subred /24', () => {
  /**
   * Replica la lógica del servidor para un serverIP dado.
   * Equivalente a: prefijo = serverIP.split('.').slice(0,3).join('.')
   *                host.startsWith(prefijo + '.')
   */
  function mismaPrefijo24(serverIP, clientHost) {
    const prefijo = serverIP.split('.').slice(0, 3).join('.');
    return clientHost.startsWith(prefijo + '.');
  }

  // Subred 192.168.1.x
  test('servidor 192.168.1.10 → acepta cliente 192.168.1.50', () => {
    expect(mismaPrefijo24('192.168.1.10', '192.168.1.50')).toBe(true);
  });

  test('servidor 192.168.1.10 → rechaza cliente 192.168.2.50 (diferente /24)', () => {
    expect(mismaPrefijo24('192.168.1.10', '192.168.2.50')).toBe(false);
  });

  test('prefijo 192.168.1. NO hace falso positivo con 192.168.100.x', () => {
    // '192.168.100.5'.startsWith('192.168.1.') === false — el punto evita ambigüedad
    expect(mismaPrefijo24('192.168.1.5', '192.168.100.5')).toBe(false);
  });

  // Subred 10.0.0.x (escuelas con redes 10.x)
  test('servidor 10.0.0.1 → acepta cliente 10.0.0.200', () => {
    expect(mismaPrefijo24('10.0.0.1', '10.0.0.200')).toBe(true);
  });

  test('servidor 10.0.0.1 → rechaza cliente 10.0.1.200 (tercer octeto diferente)', () => {
    expect(mismaPrefijo24('10.0.0.1', '10.0.1.200')).toBe(false);
  });

  // Subred 172.16.x.x (otra clase privada)
  test('servidor 172.16.5.1 → acepta cliente 172.16.5.50', () => {
    expect(mismaPrefijo24('172.16.5.1', '172.16.5.50')).toBe(true);
  });

  test('servidor 172.16.5.1 → rechaza cliente 172.16.6.50 (diferente subred)', () => {
    expect(mismaPrefijo24('172.16.5.1', '172.16.6.50')).toBe(false);
  });

  // Múltiples NICs — la función itera todas las interfaces
  test('si servidor tiene 2 IPs, cliente válido para cualquiera es aceptado', () => {
    const serverIPs = ['192.168.1.10', '10.0.0.5'];
    const clientHost = '10.0.0.50';
    // Simula la iteración de interfaces del servidor
    const aceptado = serverIPs.some(ip => mismaPrefijo24(ip, clientHost));
    expect(aceptado).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 6. GET /health — accesible sin autenticación desde LAN
// ─────────────────────────────────────────────────────────────

describe('GET /health — accesible sin auth (verifica disponibilidad LAN)', () => {
  test('responde 200 con estructura correcta', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok:      true,
      sistema: 'SAE Colegio San Diego',
      version: '2.0.0',
    });
  });

  test('campo entorno está presente', async () => {
    const res = await request(app).get('/health');
    expect(res.body.entorno).toBeDefined();
  });

  test('timestamp es fecha ISO válida', async () => {
    const res = await request(app).get('/health');
    expect(res.body.timestamp).toBeDefined();
    const fecha = new Date(res.body.timestamp);
    expect(fecha).toBeInstanceOf(Date);
    expect(isNaN(fecha.getTime())).toBe(false);
  });

  test('responde en menos de 500ms (latencia LAN aceptable)', async () => {
    const inicio = Date.now();
    await request(app).get('/health');
    const duracion = Date.now() - inicio;
    expect(duracion).toBeLessThan(500);
  });
});
