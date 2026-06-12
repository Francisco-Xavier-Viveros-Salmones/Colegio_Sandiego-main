/**
 * SAE — Vitest Configuration (CommonJS)
 * Tests unitarios con mocks, sin BD real requerida.
 * Proyecto CJS (sin "type":"module") → config en CJS también.
 */

'use strict';

module.exports = {
  test: {
    // Entorno Node.js (no browser)
    environment: 'node',

    // Hacer globales: describe, test, expect, vi, beforeEach, etc.
    globals: true,

    // Directorio de tests
    include: ['src/__tests__/**/*.test.js'],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter:  ['text', 'json', 'html'],
      include:   [
        'src/services/**/*.js',
        'src/utils/**/*.js',
        'src/middleware/**/*.js',
      ],
      exclude:   ['src/__tests__/**', 'src/config/**'],
    },

    // Timeout por test (ms)
    testTimeout: 10000,

    // Variables de entorno mínimas para tests
    env: {
      NODE_ENV:     'test',
      JWT_SECRET:   'test-secret-key-para-vitest-minimo-32-chars',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
  },
};
