/**
 * SAE — Configuración centralizada de variables de entorno.
 * Valida que las variables críticas estén presentes al arrancar.
 */

'use strict';

require('dotenv').config();

const requiredVars = ['JWT_SECRET', 'DATABASE_URL'];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(
      `[ENV ERROR] Variable de entorno requerida no definida: ${varName}\n` +
      `Copia .env.example como .env y define todos los valores.`
    );
  }
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  cors: {
    // .map(s => s.trim()) elimina espacios al dividir por comas (ej: "url1, url2")
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim()),
  },

  log: {
    level: process.env.LOG_LEVEL || 'dev',
  },
};

module.exports = config;
