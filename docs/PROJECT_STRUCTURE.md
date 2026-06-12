# 🗂️ PROJECT_STRUCTURE — SAE Colegio San Diego

## Última actualización: 2026-06-08

---

## Árbol completo del proyecto

```
colegio-sandiego/
│
├── frontend/                          ← FRONTEND OFICIAL (INTOCABLE)
│   ├── admin_panel.html               ← Panel Administrador (Alpine.js + Tailwind)
│   ├── gestor_panel.html              ← Panel Gestor Administrativo (Alpine.js)
│   ├── maestra_panel.html             ← Panel Docente (Alpine.js)
│   ├── auth/                          ← Lógica de autenticación frontend
│   ├── shared/                        ← Componentes compartidos entre paneles
│   └── vendor/                        ← Librerías frontend locales (offline-first)
│
├── backend/                           ← BACKEND DEL SISTEMA
│   ├── src/
│   │   ├── app.js                     ← Express: middlewares + rutas + static
│   │   ├── server.js                  ← Entry point: arranca el servidor
│   │   │
│   │   ├── config/
│   │   │   ├── database.js            ← Singleton PrismaClient
│   │   │   └── env.js                 ← Variables de entorno validadas
│   │   │
│   │   ├── controllers/               ← Capa HTTP: request → service → response
│   │   │   ├── auth/auth.controller.js
│   │   │   ├── alumnos/alumnos.controller.js
│   │   │   ├── pagos/pagos.controller.js
│   │   │   ├── becas/becas.controller.js
│   │   │   ├── calificaciones/calificaciones.controller.js
│   │   │   ├── usuarios/usuarios.controller.js
│   │   │   └── grupos/grupos.controller.js
│   │   │
│   │   ├── services/                  ← Lógica de negocio + reglas
│   │   │   ├── auth/auth.service.js
│   │   │   ├── alumnos/alumnos.service.js
│   │   │   ├── pagos/pagos.service.js         ← Regla de recargo automático
│   │   │   ├── becas/becas.service.js         ← RF-21: flujo Gestor → Admin
│   │   │   ├── calificaciones/calificaciones.service.js
│   │   │   ├── usuarios/usuarios.service.js
│   │   │   └── grupos/grupos.service.js
│   │   │
│   │   ├── repositories/              ← Acceso a DB vía Prisma (solo queries)
│   │   │   ├── auth/auth.repository.js
│   │   │   ├── alumnos/alumnos.repository.js
│   │   │   ├── pagos/pagos.repository.js
│   │   │   ├── becas/becas.repository.js
│   │   │   ├── calificaciones/calificaciones.repository.js
│   │   │   ├── usuarios/usuarios.repository.js
│   │   │   └── grupos/grupos.repository.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js      ← Verifica JWT Bearer token
│   │   │   ├── rbac.middleware.js      ← Control de roles (ADMIN/GESTOR/MAESTRA)
│   │   │   ├── error.middleware.js     ← Manejador global de errores
│   │   │   └── validate.middleware.js  ← Verifica resultados de express-validator
│   │   │
│   │   ├── routes/
│   │   │   ├── index.js               ← Router maestro /api/v1
│   │   │   ├── auth.routes.js
│   │   │   ├── alumnos.routes.js
│   │   │   ├── pagos.routes.js
│   │   │   ├── becas.routes.js
│   │   │   ├── calificaciones.routes.js
│   │   │   ├── usuarios.routes.js
│   │   │   └── grupos.routes.js
│   │   │
│   │   ├── utils/
│   │   │   ├── jwt.utils.js           ← generateToken / verifyToken
│   │   │   ├── hash.utils.js          ← hashPassword / comparePassword
│   │   │   ├── response.utils.js      ← Formato estándar de respuestas HTTP
│   │   │   ├── constants.js           ← Valores enum centralizados (Object.freeze)
│   │   │   └── validators/            ← Reglas express-validator por módulo
│   │   │       ├── auth.validator.js
│   │   │       ├── alumnos.validator.js
│   │   │       ├── pagos.validator.js
│   │   │       ├── becas.validator.js
│   │   │       └── calificaciones.validator.js
│   │   │
│   │   └── __tests__/                 ← Suite de pruebas (Vitest + Supertest)
│   │       ├── auth.service.test.js
│   │       ├── jwt.utils.test.js
│   │       ├── hash.utils.test.js
│   │       ├── middleware.auth.test.js
│   │       ├── middleware.rbac.test.js
│   │       ├── middleware.validate.test.js
│   │       ├── alumnos.service.test.js
│   │       ├── calificaciones.service.test.js
│   │       ├── pagos.recargo.test.js
│   │       ├── becas.rf21.test.js
│   │       └── integration/
│   │           └── auth.integration.test.js
│   │
│   ├── prisma/
│   │   ├── schema.prisma              ← Modelos Prisma (PostgreSQL 16)
│   │   ├── seed.js                    ← Datos iniciales: usuarios, grupos, alumnos
│   │   └── migrations/
│   │       ├── migration_lock.toml
│   │       └── 20260527000001_init_postgresql/
│   │           └── migration.sql
│   │
│   ├── package.json
│   ├── Dockerfile
│   ├── .env                           ← Variables locales (NO commitear)
│   ├── .env.example                   ← Plantilla de variables
│   └── .gitignore
│
├── docs/                              ← Documentación técnica y operativa oficial
│   ├── PROJECT_STRUCTURE.md           ← Este archivo
│   ├── ARCHITECTURE.md                ← Arquitectura del sistema, RBAC, JWT, stack
│   ├── DATABASE.md                    ← Esquema DB, modelos, relaciones
│   ├── API_DOCUMENTATION.md           ← Endpoints, parámetros, respuestas
│   ├── SECURITY.md                    ← Flujo JWT, bcrypt, Helmet, rate limiting
│   ├── DEPLOYMENT.md                  ← Guía de despliegue Docker + LAN
│   ├── LAN_SETUP.md                   ← Configuración red local offline-first
│   ├── TROUBLESHOOTING.md             ← Errores frecuentes y soluciones
│   ├── BACKUP_AND_RECOVERY.md         ← Procedimiento de backups y restauración
│   ├── TESTING.md                     ← Cómo correr pruebas + cobertura
│   ├── EVALUATION_GUIDE.md            ← Guía de defensa académica
│   ├── MANUAL_USUARIO.md              ← Manual por rol (ADMIN/GESTOR/MAESTRA)
│   ├── CHANGELOG.md                   ← Historial de cambios por sesión
│   └── DB_MIGRATION_ANALYSIS.md       ← Análisis técnico de migración SQLite → PG
│
├── audits/                            ← Auditorías técnicas históricas del proyecto
│   ├── AUDITORIA.md                   ← Auditoría 1
│   ├── AUDITORIA_2.md                 ← Auditoría 2
│   ├── AUDITORIA3.md                  ← Auditoría 3
│   ├── AUDITORIA4.md                  ← Auditoría 4
│   └── AUDITORIA5.md                  ← Auditoría 5
│
├── ai/                                ← Recursos de IA y prompts del sistema
│   └── prompts/
│       ├── 00_MASTER_RULES.md         ← Reglas generales del sistema
│       ├── 01_SECURITY_AND_DOCKER.md  ← Reglas de seguridad y Docker
│       ├── 02_TESTING.md              ← Reglas de pruebas automatizadas
│       └── 03_DOCUMENTATION.md       ← Estándar de documentación
│
├── BD-ColegioSandiego/                ← Esquema base de la BD (referencia oficial)
│   ├── ERD_SAE.md                     ← Diagrama entidad-relación
│   ├── docker-compose.yml             ← PostgreSQL standalone (desarrollo BD)
│   ├── init-db/                       ← Scripts SQL de inicialización
│   └── migrations/                    ← Historial de migraciones SQL raw
│
├── .cerebro/
│   └── memory_loop/
│       └── error_ledger.md            ← Registro histórico de errores de entorno
│
├── .github/                           ← Configuración GitHub (workflows, etc.)
├── scripts/                           ← Scripts de automatización del proyecto
├── backups/                           ← Backups de la base de datos
├── docker-compose.yml                 ← Orquestación Docker del sistema completo
├── package-lock.json
└── README.md                          ← Descripción general del proyecto
```

---

## Módulos del sistema

| Módulo | Roles con acceso | Descripción |
|--------|-----------------|-------------|
| `auth` | Todos | Login, logout, refresh token, cambio de contraseña |
| `alumnos` | ADMIN, GESTOR | CRUD de alumnos, búsqueda, estados de pago |
| `pagos` | ADMIN, GESTOR | Registro de pagos, recargo automático, historial |
| `becas` | ADMIN (aprobar), GESTOR (solicitar) | Flujo RF-21: solicitud → aprobación |
| `calificaciones` | Todos | Registro por trimestre, cálculo de promedio |
| `grupos` | ADMIN (gestión), MAESTRA (consulta) | Grupos escolares, materias, docentes |
| `usuarios` | ADMIN | Gestión de cuentas del sistema |

---

## Convenciones del proyecto

| Elemento | Convención |
|----------|-----------|
| Carpetas | `kebab-case` |
| Archivos | `camelCase.js` / `PascalCase.vue` |
| Variables | `camelCase` |
| Constantes | `UPPER_SNAKE_CASE` |
| Tests | `[módulo].[tipo].test.js` |
| Endpoints | `/api/v1/[recurso]` |

---

## Reglas de estructura

1. **El frontend NO se modifica.** Los 3 HTML son el contrato visual oficial.
2. **Cada módulo tiene su propia carpeta** en controllers/, services/ y repositories/.
3. **No se crean archivos fuera del árbol aprobado** sin actualizar este documento.
4. **Cada cambio significativo** debe registrarse en `docs/CHANGELOG.md`.
5. **Los errores de entorno** se documentan en `.cerebro/memory_loop/error_ledger.md`.
