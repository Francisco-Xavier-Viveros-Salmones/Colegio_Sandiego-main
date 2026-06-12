/**
 * SAE — ESLint Configuration
 * Compatible con ESLint 9.x (formato .cjs para módulos CommonJS)
 */

'use strict';

module.exports = {
  env: {
    node:    true,
    es2022:  true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType:  'script', // CommonJS ('use strict')
  },
  rules: {
    // Errores críticos
    'no-unused-vars':         ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-undef':               'error',
    'no-console':             'off',        // Se permiten console.log en backend
    'no-process-exit':        'off',        // Permitido en scripts
    'eqeqeq':                 ['error', 'always'],
    'no-var':                 'error',
    'prefer-const':           'warn',
    'no-throw-literal':       'error',

    // Estilo
    'semi':                   ['warn', 'always'],
    'quotes':                 ['warn', 'single', { avoidEscape: true }],
    'indent':                 ['warn', 2, { SwitchCase: 1 }],
    'comma-dangle':           ['warn', 'always-multiline'],
    'object-curly-spacing':   ['warn', 'always'],
    'array-bracket-spacing':  ['warn', 'never'],
    'space-before-function-paren': ['warn', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
    'keyword-spacing':        ['warn', { before: true, after: true }],
    'space-infix-ops':        'warn',
    'no-multiple-empty-lines':['warn', { max: 1, maxEOF: 0 }],
    'eol-last':               ['warn', 'always'],

    // Async/Await
    'no-async-promise-executor': 'error',
    'prefer-promise-reject-errors': 'error',

    // Buenas prácticas
    'no-eval':                'error',
    'no-implied-eval':        'error',
    'no-new-func':            'error',
    'radix':                  'error',
    'yoda':                   ['warn', 'never'],
  },
  ignorePatterns: [
    'node_modules/',
    'prisma/migrations/',
    '*.min.js',
  ],
};
