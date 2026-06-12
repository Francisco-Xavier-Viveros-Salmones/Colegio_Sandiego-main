# 🔬 AUDITORÍA 3 — Estado Post-Migración PostgreSQL
**Colegio San Diego · Fecha:** 2026-05-27 · **Sesión:** Migración v3 (SQLite → PostgreSQL 16)

---

## 📊 DASHBOARD DE ESTADO GLOBAL

```
╔════════════════════════════════════════════════════════════════════════╗
║  SAE COLEGIO SAN DIEGO — ESTADO AL 27 MAYO 2026                       ║
╠════════════════════════════════════════════════════════════════════════╣
║  🗄️  BD PostgreSQL (Schema + Repos + Seed)  ████████████████░░  88%   ║
║  🖥️  Backend API (Servicios + Controllers)  ████████████████░░  90%   ║
║  🔐  Auth / JWT / Seguridad                 ████████████████░░  88%   ║
║  🌐  Frontend (3 paneles integrados)        ████████████░░░░░░  75%   ║
║  📶  Red LAN / CORS Dinámico                ███████████████████  95%   ║
║  📦  Offline-First (Vendor CDNs)            ████░░░░░░░░░░░░░░  20%   ║
║  🧪  Testing (Vitest)                       ████████░░░░░░░░░░  40%   ║
║  ⚙️  CI/CD (GitHub Actions)                 █████████████░░░░░  70%   ║
║  🐳  Docker / Infraestructura               ████████████████░░  85%   ║
║  📄  Documentación                          ████████████░░░░░░  65%   ║
╠════════════════════════════════════════════════════════════════════════╣
║  PROMEDIO GENERAL DEL SISTEMA: ~82%                                   ║
╚════════════════════════════════════════════════════════════════════════╝
```

> **Avance real desde AUDITORÍA 2:** Se completó la migración completa de SQLite a PostgreSQL 16.
> El backend es funcional con el nuevo motor. El frontend sigue sin CDNs vendorizadas (deuda arrastrada).

---

## ✅ LO QUE ESTÁ COMPLETADO (DESDE AUDITORÍA 2)

| Ítem | Descripción | Estado |
|------|-------------|--------|
| Schema Prisma v6 | 30 modelos PostgreSQL con `@map()` snake_case | ✅ |
| 7 Repositorios | Todos migrados a PostgreSQL (soft delete, N:M roles, tutores) | ✅ |
| auth.repository.js | Roles N:M, `derivarRolSistema()`, `registrarIntento/Fallo/limpiarFallos` | ✅ |
| pagos.repository.js | Arquitectura `pago → aplicacion_pago → calendario_pago → recargo` | ✅ |
| becas.repository.js | Catálogo `beca` + `asignacion_beca` + `solicitud_beca` (RF-21) | ✅ |
| calificaciones.repository.js | `resolverPeriodoId()` auto-crea `periodo_evaluacion` | ✅ |
| grupos.repository.js | `gruposMaterias` correcto, `docenteTitularId`, sin `activo` en GrupoMateria | ✅ |
| usuarios.repository.js | Roles vía `usuarioRol`, campo `nombreCompleto/nombreUsuario` | ✅ |
| auth.service.js | Bloqueo por intentos, `bloqueadoHasta`, IP/UserAgent en intento_login | ✅ |
| pagos.service.js | Lee `recargo_dia_tope_mes` y `recargo_colegiatura_monto` de `configuracion_sistema` | ✅ |
| becas.service.js | Removido doble-create de asignación (RF-21 correcto) | ✅ |
| seed.js | Reescrito completo: niveles → roles → config → usuarios → ciclo → grupos → alumnos | ✅ |
| docker-compose.yml | PostgreSQL 16-alpine + healthcheck + backend depends_on | ✅ |
| .env.example | Connection string PostgreSQL, POSTGRES_* vars, BACKUP_DIR | ✅ |
| db-backup.js | pg_dump con timestamp, retención 10 últimos, soporte Docker exec | ✅ |
| db-restore.js | Requiere confirmación explícita `CONFIRMAR`, lista respaldos | ✅ |
| db-reset.js | Bloqueado en producción, requiere texto `RESET` | ✅ |
| migration_lock.toml | Actualizado a `provider = "postgresql"` | ✅ |
| Baseline migration | `20260527000001_init_postgresql` con verificación de tablas | ✅ |
| CORS Dinámico | Auto-detecta subred `/24` del servidor, acepta toda la LAN | ✅ |
| app.js | `require('os')` a nivel de módulo, sin duplicado en handler | ✅ |
| auth.controller.js | Pasa `ip` y `userAgent` al service | ✅ |
| Tests (Vitest) | 3 archivos, ~20 tests: pagos.recargo, becas.rf21, jwt.utils | ✅ |
| vitest.config.js | globals, env de test, coverage v8 | ✅ |
| .github/workflows/ci.yml | Lint + Tests + Docker build smoke test | ✅ |
| .eslintrc.cjs | ESLint 9.x CommonJS | ✅ |
| .prettierrc | Prettier con trailing commas, singleQuote | ✅ |
| README.md | Guía de instalación, scripts, arquitectura, deploy | ✅ |
| error_ledger.md | ERR-004 (@@unique compuesto nullable) + ERR-005 (Grupo schema) | ✅ |

---

## ❌ PROBLEMAS ACTIVOS (BUGS / RIESGOS REALES)

---

### 🔴 CRÍTICO 1 — Dockerfile no actualizado para PostgreSQL

**Archivo:** `backend/Dockerfile`

```dockerfile
# ACTUAL (incorrecto para PostgreSQL):
RUN apk add --no-cache libc6-compat openssl
RUN mkdir -p /app/data     ← directorio SQLite, no aplica

# NECESITA:
RUN apk add --no-cache libc6-compat openssl postgresql-client
```

**Impacto:** El script `db-backup.js` llama a `pg_dump` via `docker exec`. Si el contenedor de backup necesita `pg_dump` internamente, fallará. El directorio `/app/data` es un artefacto SQLite sin propósito.

**Fix requerido:**
1. Añadir `postgresql-client` al `apk add`
2. Eliminar `RUN mkdir -p /app/data`
3. Añadir `RUN mkdir -p /app/backups` para el volumen de respaldos

---

### 🔴 CRÍTICO 2 — `INCLUDE_ROLES` muerto e incorrecto en usuarios.repository.js

**Archivo:** `backend/src/repositories/usuarios/usuarios.repository.js` (líneas 32-41)

```js
// ACTUAL (incorrecto — el campo include no acepta scalars):
const INCLUDE_ROLES = {
  roles: {
    where: { activo: true, eliminadoEn: null },
    include: {
      activo: true,       // ← INCORRECTO: activo/eliminadoEn no son relaciones
      eliminadoEn: true,  // ← INCORRECTO: deben ir en `select`
      rol: { select: { codigo: true } },
    },
  },
};
```

**Realidad:** Esta constante **no se usa en ninguna función** (todas usan `select` inline correcto). Es código muerto, pero induce confusión y podría usarse por error en el futuro.

**Fix:** Eliminar la constante `INCLUDE_ROLES` o corregirla a `select` válido.

---

### 🔴 CRÍTICO 3 — `eliminarUsuario()` sin confirmación modal

**Archivo:** `frontend/admin_panel.html` (línea 653-663)

```js
async eliminarUsuario(idx) {
  const u = this.listaUsuarios[idx];
  if (!u || !u.id) return;
  // ← SIN CONFIRMACIÓN — ejecuta el borrado inmediatamente
  const res = await window.saeApi.usuarios.eliminar(u.id);
```

**Impacto:** Un clic accidental elimina un usuario sin posibilidad de cancelar. El backend hace soft-delete, pero el usuario afectado no lo sabe visualmente.

---

### 🟠 ALTO 1 — Modal "Asignar Beca" con opciones de alumnos hardcodeadas

**Archivo:** `frontend/admin_panel.html` (línea 307)

```html
<select x-model="nuevaBeca.alumno">
  <option>María González</option>  <!-- ← HARDCODED, no viene de API -->
  <option>Juan Pérez</option>
  <option>Carlos Fernández</option>
</select>
```

**Impacto:** Si hay alumnos reales distintos a los del seed, el select de asignación de becas mostrará nombres incorrectos. La funcionalidad de becas está parcialmente mockeada en frontend.

---

### 🟠 ALTO 2 — Modal "Nuevo Alumno" con grupos hardcodeados en HTML

**Archivo:** `frontend/admin_panel.html` (línea 313)

```html
<select x-model="nuevoAlumnoData.grupo">
  <option>Primaria 4°A</option>     <!-- ← HARDCODED -->
  <option>Primaria 4°B</option>
  <option>Secundaria 5°B</option>
</select>
```

**Impacto:** Los grupos mostrados en el modal de registro de alumnos no son dinámicos. Si se crea un grupo nuevo desde el admin o cambia el ciclo escolar, el select no se actualiza.

---

### 🟠 ALTO 3 — jsPDF cargado desde CDN externo

**Archivo:** `frontend/admin_panel.html` (línea 16)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

**Impacto:** Además de Tailwind, Alpine.js y Google Fonts, la librería de generación PDF también requiere internet. La vista de "Reportes descargables (PDF)" falla completamente en modo offline.

---

### 🟡 MEDIO 1 — Documentación técnica desactualizada (referencia SQLite)

**Archivos afectados:**
- `docs/DATABASE.md` — describe 12 modelos SQLite, no 30 tablas PostgreSQL
- `docs/ARCHITECTURE.md` — menciona SQLite como motor de BD
- `docs/API_DOCUMENTATION.md` — campos API pueden no coincidir con los nuevos (ej. `nombre` vs `nombreCompleto`)
- `docs/PROJECT_STRUCTURE.md` — no refleja la nueva estructura de scripts y migrations

**Impacto:** Un nuevo desarrollador leyendo estos docs va a tener información incorrecta del sistema real.

---

### 🟡 MEDIO 2 — `backend/Dockerfile` genera Prisma Client en build, no en startup

**Línea problemática:**
```dockerfile
RUN npx prisma generate
```

**Riesgo:** Si el schema.prisma cambia pero el Docker image no se re-construye, el Prisma Client generado queda obsoleto. En producción Docker debe ejecutarse `prisma generate` como parte del entrypoint o en un step posterior al build.

---

### 🟡 MEDIO 3 — `vitest.config.js` en formato ESM pero tests en CommonJS

**Archivo:** `backend/vitest.config.js`

```js
import { defineConfig } from 'vitest/config'; // ESM
```

**Archivo:** `backend/src/__tests__/*.test.js`

```js
'use strict';
const { vi } = require('vitest'); // CommonJS
```

**Riesgo:** Puede haber conflicto de módulos si Vitest no está configurado con `interopDefault` o transform para CJS. Los tests pueden fallar con `SyntaxError: Cannot use import statement in a module` o viceversa según la versión de Node.

**Fix recomendado:** Renombrar `vitest.config.js` a `vitest.config.mjs` y agregar `"type": "module"` solo para el archivo de config, o usar `.cjs` con `require()`.

---

### 🟡 MEDIO 4 — `package.json` en `backend/` tiene `"type"` no declarado

El proyecto usa `'use strict'` + `require()` (CommonJS) pero el `package.json` no declara `"type": "commonjs"`. Aunque Node.js asume CJS por defecto cuando no hay `"type"`, la ausencia puede causar ambigüedad con Vitest y ESLint en el futuro.

---

### 🟡 MEDIO 5 — Rutas API de pagos no exponen calendarioPago ni totalPorAlumno

**Archivo:** `backend/src/routes/pagos.routes.js`

```js
router.get('/',    authenticate, pagosController.listar);
router.get('/:id', authenticate, pagosController.obtener);
router.post('/',   authenticate, pagosController.registrar);
// ← FALTAN:
// GET /pagos/calendario?alumnoId=X
// GET /pagos/total/:alumnoId
```

Los métodos `obtenerCalendario()` y `totalPorAlumno()` están implementados en el service pero **no están expuestos como rutas**. El frontend no puede consultar el calendario de pagos de un alumno.

---

### 🟡 MEDIO 6 — Config dinámico `/config.js` no incluye versión actualizada

**Archivo:** `backend/src/app.js` (línea ~100)

```js
VERSION: '1.0.0',  // ← debería ser '2.0.0' (version del package.json)
```

El package.json ya dice `"version": "2.0.0"` pero el endpoint `/config.js` sigue devolviendo `VERSION: '1.0.0'`.

---

## ⚠️ DEUDAS TÉCNICAS PENDIENTES (NO BLOQUEAN OPERACIÓN)

---

### 📦 Offline-First / Vendor de CDNs — 20%

**Estado actual:** Los 4 CDNs siguen activos en todos los paneles.

| Librería | CDN Actual | Impacto offline |
|----------|-----------|-----------------|
| Tailwind CSS | `cdn.tailwindcss.com` | 🔴 Sin estilos |
| Alpine.js | `cdn.jsdelivr.net` | 🔴 Sin reactividad |
| Google Fonts (Inter) | `fonts.googleapis.com` | 🟡 Fuente fallback |
| jsPDF | `cdnjs.cloudflare.com` | 🔴 Sin PDF |

**Directorio `frontend/vendor/`:** ❌ No existe.

**Estimación de trabajo:** 2-3 horas
1. `npx tailwindcss -o frontend/vendor/tailwind.min.css --minify`
2. Descargar `alpinejs@3.14.x/dist/cdn.min.js` → `frontend/vendor/alpine.min.js`
3. Descargar `jspdf.umd.min.js` → `frontend/vendor/jspdf.min.js`
4. Auto-hospedar Inter via `@fontsource/inter` o `woff2` local
5. Actualizar las 4 referencias en cada panel HTML

---

### 🔐 Refresh Token — 0%

El token JWT expira a las 8h. No hay mecanismo de renovación silenciosa.

**Impacto:** El usuario debe re-ingresar credenciales cada 8h. En un turno escolar largo o si el servidor reinicia, el token puede expirar durante el uso.

**Estimación:** 3-4 horas (endpoint `/auth/refresh`, cookie httpOnly, interceptor en api.js)

---

### 🧪 Tests — 40% (base instalada, cobertura baja)

**Lo que existe:**
- ✅ `vitest` instalado y configurado
- ✅ `pagos.recargo.test.js` — 8 tests (regla de recargo día 5)
- ✅ `becas.rf21.test.js` — 6 tests (flujo RF-21)
- ✅ `jwt.utils.test.js` — 5 tests (generación y verificación)

**Lo que falta:**
- ❌ Tests de `calificaciones.service.js` — guardar lote, resolución de período
- ❌ Tests de `auth.service.js` — bloqueo por intentos, limpieza de fallos
- ❌ Tests de `alumnos.service.js` — verificación de matrícula única
- ❌ Tests de integración HTTP (Supertest) — endpoints con BD de test real
- ❌ Tests de `hash.utils.js` — hashPassword/comparePassword
- ❌ Cobertura de código: estimada **< 15%** sobre servicios totales

---

### 📄 Documentación — 65%

| Doc | Estado | Problema |
|-----|--------|---------|
| `README.md` | ✅ Nuevo | Creado en esta sesión, completo |
| `docs/DB_MIGRATION_ANALYSIS.md` | ✅ Nuevo | Análisis SQLite → PostgreSQL |
| `docs/API_DOCUMENTATION.md` | ⚠️ Obsoleto | Campos SQLite, sin nuevos endpoints |
| `docs/DATABASE.md` | ⚠️ Obsoleto | 12 modelos SQLite, no 30 PostgreSQL |
| `docs/ARCHITECTURE.md` | ⚠️ Obsoleto | Menciona SQLite como motor |
| `docs/PROJECT_STRUCTURE.md` | ⚠️ Obsoleto | No incluye scripts/, migrations/, .github/ |
| `docs/CHANGELOG.md` | ⚠️ Incompleto | No tiene entrada para migración v3 |
| Manual de usuario | ❌ No existe | Sin guía para admin/gestor/maestra |

---

### 🌐 Frontend — Áreas incompletas

| Área | Estado |
|------|--------|
| Modal "Asignar Beca" | ⚠️ Opciones alumno hardcodeadas |
| Modal "Nuevo Alumno" | ⚠️ Grupos hardcodeados en select |
| eliminarUsuario() | ❌ Sin confirmación modal |
| Estado offline visible | ⚠️ Error silenciado pero sin banner |
| Paginación de alumnos | ❌ Carga todo en memoria (problema con > 100 alumnos) |
| Recuperación de contraseña | ❌ No implementado |

---

## 📊 CHECKLIST COMPLETO POR MÓDULO

### 🗄️ BASE DE DATOS — 88%

#### Schema Prisma PostgreSQL v6
- [x] 30 modelos con `@map()` snake_case exacto al SQL real
- [x] `saldoPendiente` como `@default(dbgenerated(...))` (GENERATED ALWAYS AS STORED)
- [x] Relaciones nombradas explícitamente (sin ambigüedades Prisma)
- [x] `@@unique([alumnoId, grupoMateriaId, periodoId])` en `Calificacion` para upsert
- [x] `@@unique([alumnoId, cicloId])` en `InscripcionCiclo` para upsert en seed
- [x] Tipos PostgreSQL: `@db.Timestamptz()`, `@db.Decimal(12,2)`, `@db.VarChar(n)`, `@db.Date`
- [x] Soft delete vía `eliminadoEn TIMESTAMPTZ` en todos los modelos relevantes
- [x] Roles N:M: `usuario_rol` tabla puente con `activo` y `eliminadoEn`
- [x] `migration_lock.toml` actualizado a `postgresql`
- [x] Baseline migration `20260527000001_init_postgresql` con verificación de tablas
- [ ] **Documentación del schema** (`docs/DATABASE.md`) desactualizada — SQLite 12 modelos

#### Seed PostgreSQL
- [x] Niveles educativos (4)
- [x] Roles del sistema (4: administrador, directora, empleado, docente)
- [x] `configuracionSistema` via `findFirst` + `create` (no upsert — constraint compuesta)
- [x] Usuarios con roles vía `usuarioRol` (upsert correcto)
- [x] Ciclo escolar + `planPago` con `montoMensual` y `montoDiciembre` requeridos
- [x] Grupos con `grado`, `seccion`, `docenteTitularId` correctos
- [x] Materias con `cuentaParaPromedio` (no `obligatoria`)
- [x] `grupoMateria` sin campo `activo` (solo `eliminadoEn`)
- [x] Tutores + `tutorAlumno` N:M + `inscripcionCiclo` con `planPagoId`

---

### 🖥️ BACKEND API — 90%

#### Infraestructura
- [x] Express 4.x con arquitectura 4 capas (route → controller → service → repository)
- [x] Helmet (CSP desactivado para frontend estático)
- [x] Rate limiter global: 100 req / 15 min
- [x] Rate limiter auth estricto: 10 req / 15 min
- [x] `GET /config.js` — auto-detecta IP LAN no-loopback
- [x] `GET /health` — health check con info de entorno
- [x] `express.static()` sirviendo frontend desde `../../frontend`
- [x] Middleware de error global (código HTTP desde `error.statusCode`)
- [x] Graceful shutdown: SIGINT/SIGTERM + `prisma.$disconnect()`
- [ ] `/config.js` devuelve `VERSION: '1.0.0'` — debería ser `'2.0.0'`

#### Módulos API (7/7)
- [x] **Auth** — login con lockout, registro de intentos, IP tracking
- [x] **Alumnos** — CRUD + soft delete + búsqueda `?q=` + filtro nivel/grupo
- [x] **Grupos** — CRUD + materias dinámicas + count de alumnos por grupo
- [x] **Pagos** — registro + recargo desde `configuracion_sistema` + calendario
- [x] **Becas** — RF-21: solicitar (GESTOR) + resolver (ADMIN) + asignacion_beca automática
- [x] **Calificaciones** — guardar individual + lote + resolución automática de periodo
- [x] **Usuarios** — CRUD + roles N:M + soft delete
- [ ] **Pagos routes** — faltan `GET /pagos/calendario` y `GET /pagos/total/:alumnoId`

---

### 🔐 AUTENTICACIÓN / SEGURIDAD — 88%

- [x] JWT firmado con `issuer: 'sae-sandiego'`, expira en 8h
- [x] `verifyToken()` devuelve `{ valid, payload, error }` (no lanza excepciones)
- [x] `authenticate` middleware verifica Bearer token y diferencia `TokenExpiredError`
- [x] RBAC por rol: `authorize('ADMIN')`, `authorize('ADMIN', 'GESTOR')`, etc.
- [x] bcryptjs 12 rounds en seed (10 en producción configurable via env)
- [x] Bloqueo por intentos: `intentosFallidos` + `bloqueadoHasta` en `usuario`
- [x] Registro de intentos en `intento_login` (exitoso/fallido + IP + userAgent)
- [x] Rate limiter estricto en `/api/v1/auth` (10 req / 15 min)
- [x] `limpiarFallos()` al login exitoso
- [ ] Refresh token — no implementado (sesiones 8h fijas)
- [ ] Recuperación de contraseña — no implementado

---

### 📶 RED LAN / CORS DINÁMICO — 95%

- [x] Servidor escucha en `HOST=0.0.0.0`
- [x] `GET /config.js` inyecta IP LAN automáticamente
- [x] CORS acepta cualquier origen de la misma subred `/24` (auto-detección)
- [x] CORS acepta orígenes explícitos del `.env` (CORS_ORIGIN)
- [x] CORS acepta peticiones sin `origin` (curl, Postman, SSR)
- [x] Frontend carga `/config.js` antes de `api.js` en los 3 paneles
- [x] `api.js` usa `window.SAE_CONFIG.API_BASE` — nunca localhost hardcodeado
- [ ] HTTPS/TLS — HTTP plano (documentado como decisión de diseño para LAN privada)

---

### 🌐 FRONTEND — 75%

#### Integración API (funcional)
- [x] `auth-guard.js` — verifica JWT antes de mostrar panel
- [x] `api.js` — cliente centralizado con auto-inyección de Bearer token
- [x] 401 → `clearSession()` + redirect a login automático
- [x] Error de red → `{ ok: false, offline: true }` (no rompe la UI)
- [x] Todos los `alert()` reemplazados por toast JS dinámico
- [x] Panel Admin — CRUD alumnos, pagos, calificaciones, becas, usuarios, grupos conectados
- [x] Panel Gestor — Alumnos, pagos, becas RF-21 (solo solicitar), calificaciones
- [x] Panel Maestra — Alumnos, grupos, calificaciones por lote

#### Issues frontend conocidos
- [ ] `eliminarUsuario()` — sin modal de confirmación
- [ ] Modal "Asignar Beca" — opciones de alumno hardcodeadas (no dinámicas)
- [ ] Modal "Nuevo Alumno" — grupos hardcodeados en el select
- [ ] Banner de estado offline — error silenciado, sin indicador visual al usuario
- [ ] Sin paginación — todos los alumnos se cargan en memoria al init
- [ ] jsPDF desde CDN (cdnjs.cloudflare.com) — reportes PDF sin internet

---

### 🐳 DOCKER / INFRAESTRUCTURA — 85%

- [x] `docker-compose.yml` con PostgreSQL 16-alpine + backend Node.js
- [x] `postgres_sae` con healthcheck (`pg_isready`)
- [x] Backend `depends_on: postgres_sae: condition: service_healthy`
- [x] Init-db scripts montados en `/docker-entrypoint-initdb.d`
- [x] Volúmenes persistentes: `postgres_data` + `sae_backups`
- [x] Red interna `sae-network` (backend y postgres aislados)
- [x] Memory limit: 512M para PostgreSQL
- [x] Healthcheck del backend: `wget` a `/health`
- [ ] **Dockerfile desactualizado**: falta `postgresql-client`, sobra `mkdir /app/data`
- [ ] `POSTGRES_INITDB_ARGS="--locale=C"` puede causar problemas con caracteres especiales en español (ñ, tildes) al buscar por texto

---

### 🧪 TESTING — 40%

- [x] Vitest instalado y configurado
- [x] `pagos.recargo.test.js` — 8 tests: regla día 5, concepto, diaLimitePago individual
- [x] `becas.rf21.test.js` — 6 tests: solicitar, porcentajes, resolver, 409 duplicado
- [x] `jwt.utils.test.js` — 5 tests: generación, verificación, tokens inválidos
- [x] Mocks con `vi.mock()` — sin BD real en tests unitarios
- [ ] Tests de `calificaciones.service.js`
- [ ] Tests de `auth.service.js` (lockout)
- [ ] Tests de `alumnos.service.js`
- [ ] Tests de `hash.utils.js`
- [ ] Tests de integración HTTP (Supertest)
- [ ] `vitest.config.js` en ESM puede conflictuar con CJS del proyecto

---

### ⚙️ CI/CD — 70%

- [x] `.github/workflows/ci.yml` con jobs: `lint-and-test` + `docker-build`
- [x] PostgreSQL como service en GitHub Actions
- [x] Aplica init-db SQL, baseline Prisma, seed y luego tests
- [x] Smoke test: `docker compose up` → `curl /health`
- [x] `.eslintrc.cjs` — reglas ESLint 9.x CommonJS
- [x] `.prettierrc` + `.prettierignore`
- [ ] ESLint en CI marcado con `continue-on-error: true` — fallos de lint no bloquean el pipeline
- [ ] Sin deploy automático (correcto para LAN local — deploy es manual por diseño)
- [ ] Sin notificaciones (Slack, email) en fallos de CI

---

## 🎯 RESUMEN EJECUTIVO

### ¿Qué funciona hoy en producción?
El sistema **es operable** en PostgreSQL con las funcionalidades core:
1. Login con bloqueo por intentos y registro de auditoría
2. Los 3 paneles conectados a la API real
3. CRUD completo de alumnos, pagos, calificaciones, becas, usuarios, grupos
4. Lógica de negocio: recargo automático desde configuracion_sistema, RF-21, lote de calificaciones
5. CORS automático para cualquier nodo de la LAN
6. Backup/restore/reset con confirmación de seguridad

### Plan de prioridades para 100% producción

| # | Tarea | Impacto | Esfuerzo | Prioridad |
|---|-------|---------|----------|-----------|
| 1 | Arreglar Dockerfile (postgresql-client, sin /app/data) | 🔴 Infraestructura | 15 min | **HOY** |
| 2 | Eliminar `INCLUDE_ROLES` muerto de usuarios.repository.js | 🔴 Código limpio | 5 min | **HOY** |
| 3 | Corregir `VERSION: '1.0.0'` en /config.js → `'2.0.0'` | 🟡 UX menor | 2 min | **HOY** |
| 4 | Exponer rutas faltantes: `GET /pagos/calendario` | 🟠 Feature | 30 min | Esta semana |
| 5 | Modal de confirmación para `eliminarUsuario()` | 🟠 UX crítico | 30 min | Esta semana |
| 6 | Dinamizar select de grupos/alumnos en modales | 🟠 Data integrity | 1-2h | Esta semana |
| 7 | Vendor de CDNs (Tailwind, Alpine, jsPDF, Inter) | 📦 Offline real | 2-3h | Esta semana |
| 8 | Actualizar docs/ (DATABASE, ARCHITECTURE, API) | 📄 Onboarding | 2h | Próxima semana |
| 9 | Completar tests (calificaciones, auth, hash) | 🧪 Calidad | 3-4h | Próxima semana |
| 10 | Refresh token | 🔐 UX sesiones | 3-4h | Próxima semana |

---

## 📌 DECISIONES DE DISEÑO DOCUMENTADAS

| Decisión | Justificación |
|----------|---------------|
| HTTP plano (sin TLS) | LAN privada del colegio — no hay tráfico por internet |
| Sin enums Prisma | Compatibilidad mantenida via `constants.js` — migración futura sin cambios |
| Docker init SQL para schema | El SQL versionado es la fuente de verdad; Prisma solo orquesta |
| Baseline migration vacía | El schema ya existe vía Docker; se marca como aplicado manualmente |
| CJS todo el backend | Consistencia — no mezclar ESM/CJS en Node.js sin configuración explícita |
| `configuracion_sistema` global | `cicloId: null` para parámetros del sistema; específicos con `cicloId` |

---

*Generado por auditoría automática — SAE v2.0.0 · PostgreSQL 16 · Prisma 5.x*
*Próxima auditoría recomendada: después de completar vendor de CDNs y tests de integración*
