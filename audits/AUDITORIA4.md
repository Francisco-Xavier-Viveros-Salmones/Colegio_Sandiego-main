# 🔬 AUDITORÍA 4 — Estado Post-Correcciones Críticas + Expansión de Tests
**Colegio San Diego · Fecha:** 2026-05-28 · **Sesión:** Auditoría v4 (Fixes Auditoria3 + Testing)

---

## 📊 DASHBOARD DE ESTADO GLOBAL

```
╔════════════════════════════════════════════════════════════════════════╗
║  SAE COLEGIO SAN DIEGO — ESTADO AL 29 MAYO 2026 (Sesión 06)          ║
╠════════════════════════════════════════════════════════════════════════╣
║  🗄️  BD PostgreSQL (Schema + Repos + Seed)  █████████████████░  92%  ║
║  🖥️  Backend API (Servicios + Controllers)  ██████████████████  98%  ║
║  🔐  Auth / JWT / Seguridad                 ██████████████████  98%  ║
║  🌐  Frontend (3 paneles integrados)        ██████████████████  95%  ║
║  📶  Red LAN / CORS Dinámico                ███████████████████  95%  ║
║  📦  Offline-First (Vendor CDNs)            ███████████████████  98%  ║
║  🧪  Testing (Vitest — 5 suites / ~37 tests)████████████░░░░░░  60%  ║
║  ⚙️  CI/CD (GitHub Actions)                 █████████████░░░░░  70%  ║
║  🐳  Docker / Infraestructura               █████████████████░  96%  ║
║  📄  Documentación                          ████████████░░░░░░  65%  ║
╠════════════════════════════════════════════════════════════════════════╣
║  PROMEDIO GENERAL DEL SISTEMA: ~87%                                   ║
╚════════════════════════════════════════════════════════════════════════╝
```

> **Avance real desde AUDITORÍA 4 (Sesión 05+06):**
> Auth completada al 98% (Refresh Token + Reset Password). Frontend cerrado al 95%:
> confirmación de borrado, selects dinámicos, dashboard real, vendor CDNs (0 CDNs externos).
> Quedan pendientes: tests de integración, docs técnica actualizada, banner offline.

---

## ✅ LO QUE SE RESOLVIÓ (SESIÓN 06 — 2026-05-29)

| Ítem | Descripción | Estado |
|------|-------------|--------|
| `eliminarUsuario()` modal | Alpine.js modal de confirmación — reemplaza borrado directo | ✅ |
| Modal "Asignar Beca" | `x-for` sobre `listaAlumnos` — sin opciones hardcodeadas | ✅ |
| Modal "Nuevo Alumno" | `x-for` sobre `gruposData` — sin opciones hardcodeadas | ✅ |
| Dashboard dinámico | Métricas reales: alumnos, deudores, ingresos hoy, becas | ✅ |
| Vendor CDNs | `frontend/vendor/`: Alpine, Tailwind, Lucide, jsPDF, fonts.css | ✅ |
| 0 CDNs externos | Los 4 paneles (admin, gestor, maestra, login) 100% offline | ✅ |
| Refresh Token | `POST /auth/refresh` + interceptor proactivo en `api.js` (15 min umbral) | ✅ |
| Reset Password | `PATCH /auth/usuarios/:id/reset-password` + modal Admin | ✅ |
| `mapAlumno` (api.js) | Añade `mesesAdeudo` y `estadoPago` para dashboard y deudores | ✅ |

---

## ✅ LO QUE SE RESOLVIÓ (DESDE AUDITORÍA 3)

| Ítem | Descripción | Estado |
|------|-------------|--------|
| Dockerfile CRÍTICO 1 | `postgresql-client` añadido, `/app/data` eliminado, `/app/backups` creado | ✅ |
| `INCLUDE_ROLES` muerto CRÍTICO 2 | Constante eliminada de `usuarios.repository.js` | ✅ |
| `VERSION: '1.0.0'` CRÍTICO 3 | Corregido a `'2.0.0'` en el endpoint `/config.js` | ✅ |
| Rutas pagos MEDIO 5 | `GET /pagos/calendario` y `GET /pagos/total/:alumnoId` expuestas | ✅ |
| `vitest.config.js` formato CJS MEDIO 3 | Reescrito a `module.exports = {...}` (sin ESM import) | ✅ |
| `auth.service.test.js` | 12 tests: login exitoso, 401, 423 bloqueo, redirectTo por rol, limpiarFallos | ✅ |
| `hash.utils.test.js` | 6 tests: hashPassword bcrypt, salt único, comparePassword true/false/vacío | ✅ |

---

## ❌ PROBLEMAS ACTIVOS (BUGS / RIESGOS REALES)

---

### 🔴 CRÍTICO 1 — `eliminarUsuario()` sin confirmación modal

**Archivo:** `frontend/admin_panel.html` (líneas 653-663)

```js
async eliminarUsuario(idx) {
  const u = this.listaUsuarios[idx];
  if (!u || !u.id) return;
  // ← SIN CONFIRMACIÓN — ejecuta el borrado inmediatamente
  const res = await window.saeApi.usuarios.eliminar(u.id);
  if (res.ok) {
    this.listaUsuarios.splice(idx, 1);
    window.saeApi.toast('exito', `Usuario ${u.nombre} eliminado.`);
  }
}
```

**Impacto:** Un clic accidental elimina un usuario sin posibilidad de cancelar. El backend hace soft-delete, pero el usuario que opera el panel no tiene ninguna ventana de confirmación.

**Fix requerido:**
```js
async eliminarUsuario(idx) {
  const u = this.listaUsuarios[idx];
  if (!u || !u.id) return;
  if (!confirm(`¿Eliminar al usuario "${u.nombre}"? Esta acción no se puede deshacer.`)) return;
  const res = await window.saeApi.usuarios.eliminar(u.id);
  // ...
}
```

O mejor: abrir un modal de confirmación con Alpine.js (consistente con el resto de la UI).

---

### 🟠 ALTO 1 — Modal "Asignar Beca" con alumnos hardcodeados

**Archivo:** `frontend/admin_panel.html` (línea 307)

```html
<select class="input-modern mt-3" x-model="nuevaBeca.alumno">
  <option>María González</option>   <!-- ← HARDCODED -->
  <option>Juan Pérez</option>
  <option>Carlos Fernández</option>
</select>
```

**Estado del data:** `nuevaBeca` inicia con `alumno: 'María González'` (línea 347).  
**Impacto:** El select siempre muestra los 3 alumnos del seed. Con alumnos reales el select nunca se actualiza. La función `asignarBeca()` busca con `listaAlumnos.find(a => a.nombre.startsWith(...))` — si el nombre no coincide exactamente, la beca no se asigna y no hay error visual.

**Fix requerido:** Reemplazar `<option>` estáticos por `<template x-for="a in listaAlumnos">` una vez que `listaAlumnos` esté cargado de la API.

---

### 🟠 ALTO 2 — Modal "Nuevo Alumno" con grupos hardcodeados

**Archivo:** `frontend/admin_panel.html` (línea 313)

```html
<select class="input-modern" x-model="nuevoAlumnoData.grupo">
  <option>Primaria 4°A</option>     <!-- ← HARDCODED -->
  <option>Primaria 4°B</option>
  <option>Secundaria 5°B</option>
</select>
```

**Estado del data:** `nuevoAlumnoData.grupo` inicia con `'Primaria 4°A'` (línea 350 y 434).  
**Impacto:** Si el ciclo escolar tiene grupos distintos a los del seed, el select no los muestra. La función `guardarNuevoAlumno()` usa `gruposData.find(g => g.nombre === nuevoAlumnoData.grupo)` — si el nombre hardcodeado no coincide con la BD, el alumno se crea sin grupo asignado.

---

### 🟠 ALTO 3 — CDNs externos en los 3 paneles (bloqueante en modo offline)

**Archivos:** `frontend/admin_panel.html`, `frontend/gestor_panel.html`, `frontend/maestra_panel.html`

```html
<!-- Todos los paneles tienen estas 4 dependencias externas -->
<script src="https://cdn.tailwindcss.com"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:...&display=swap" rel="stylesheet" />
<script src="https://unpkg.com/lucide@latest"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

**Directorio `frontend/vendor/`:** ❌ **No existe.**

| Librería | Fallo sin internet |
|----------|-------------------|
| Tailwind CSS (`cdn.tailwindcss.com`) | 🔴 Toda la UI sin estilos |
| Alpine.js (`cdn.jsdelivr.net`) | 🔴 Sin reactividad — paneles en blanco |
| Lucide Icons (`unpkg.com`) | 🟡 Sin íconos, layout roto |
| Google Fonts (`fonts.googleapis.com`) | 🟡 Fuente fallback `system-ui` |
| jsPDF (`cdnjs.cloudflare.com`) | 🔴 Generación PDF rompe con excepción |

**Impacto:** El sistema está diseñado para funcionar en LAN sin internet. Con un corte de ISP, los 3 paneles son completamente inutilizables.

---

### 🟡 MEDIO 1 — Dashboard con datos hardcodeados (no dinámico)

**Archivo:** `frontend/admin_panel.html` (línea 123)

```html
<!-- DASHBOARD - datos estáticos, no de API -->
<div class="text-2xl font-bold text-navy-700">$12,400</div>  <!-- Ingresos hoy: FAKE -->
<div class="text-2xl font-bold text-crimson-600">7</div>      <!-- Deudores: FAKE -->
<div class="text-2xl font-bold text-navy-700">243</div>        <!-- Alumnos: FAKE -->
<div class="text-2xl font-bold text-emerald-600">34</div>     <!-- Becas: FAKE -->
```

La tabla de "Últimos pagos" también muestra `María González` y `Juan Pérez` hardcodeados.  
**Impacto:** El dashboard principal muestra información inventada, no los datos reales del sistema.

---

### 🟡 MEDIO 2 — Documentación técnica desactualizada (referencia SQLite)

**Archivos afectados:**

| Archivo | Problema |
|---------|---------|
| `docs/DATABASE.md` | Describe 12 modelos SQLite; el sistema tiene 33 modelos PostgreSQL |
| `docs/ARCHITECTURE.md` | Menciona SQLite como motor de BD activo |
| `docs/API_DOCUMENTATION.md` | Campos desactualizados (`nombre` vs `nombreCompleto`, endpoints faltantes) |
| `docs/PROJECT_STRUCTURE.md` | No incluye `scripts/`, `BD-ColegioSandiego/`, `.github/`, `src/__tests__/` |
| `docs/CHANGELOG.md` | Sin entrada para migración PostgreSQL v3 ni correcciones v4 |

**Impacto:** Un nuevo desarrollador leyendo estos docs tiene información incorrecta del 100% del stack actual.

---

### 🟡 MEDIO 3 — `POSTGRES_INITDB_ARGS="--locale=C"` puede romper búsquedas en español

**Archivo:** `docker-compose.yml` (línea 20)

```yaml
POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
```

**Riesgo:** `--locale=C` desactiva las reglas de cotejamiento para caracteres especiales. Las búsquedas con `ILIKE '%García%'` o `ILIKE '%ñ%'` pueden no funcionar correctamente en columnas con índices de texto. Para un colegio con nombres en español (ñ, tildes), esto puede causar resultados incorrectos en el buscador de alumnos.

**Fix recomendado:** Cambiar a `--locale=es_MX.UTF-8` o `--lc-collate=es_MX.UTF-8`.

---

### 🟡 MEDIO 4 — Sin paginación en listas de alumnos/pagos (riesgo con > 100 registros)

El frontend carga todos los alumnos y pagos en memoria al inicializar (`init()`). Con 243 alumnos (el número del dashboard), la carga inicial trae todos los registros de una sola vez. El backend tampoco implementa paginación en `GET /api/v1/alumnos`.

**Impacto:** Con 300+ alumnos, la respuesta inicial puede superar 500ms y saturar la memoria del navegador en tablets de maestras (equipos de bajo gama).

---

### 🟡 MEDIO 5 — ESLint en CI con `continue-on-error: true` (fallos de linting silenciados)

**Archivo:** `.github/workflows/ci.yml`

```yaml
- name: ESLint
  run: npm run lint
  continue-on-error: true  # ← fallos de lint NO bloquean el pipeline
```

**Impacto:** Código con errores de ESLint puede llegar a `main` sin que el pipeline lo rechace. La calidad del código no está guardada por el CI en este aspecto.

---

## ⚠️ DEUDAS TÉCNICAS PENDIENTES (NO BLOQUEAN OPERACIÓN)

---

### 📦 Offline-First / Vendor de CDNs — ✅ 98% *(COMPLETADO — Sesión 06)*

| Librería | Archivo local | Tamaño | Estado |
|----------|--------------|--------|--------|
| Tailwind CSS | `frontend/vendor/tailwind.cdn.js` | 398 KB | ✅ |
| Alpine.js | `frontend/vendor/alpine.min.js` | 44 KB | ✅ |
| Lucide Icons | `frontend/vendor/lucide.min.js` | 346 KB | ✅ |
| jsPDF | `frontend/vendor/jspdf.min.js` | 356 KB | ✅ |
| Google Fonts | `frontend/vendor/fonts.css` | local fallback | ✅ |

**Paneles actualizados:** admin_panel, gestor_panel, maestra_panel, auth/login — **0 CDNs externos**.

---

### 🔐 Refresh Token — ✅ COMPLETADO *(Sesión 06)*

- `POST /auth/refresh`: acepta token válido o expirado < 2h, emite nuevo token
- `api.js` interceptor proactivo: renueva antes de expirar (< 15 min restantes)
- `api.js` interceptor reactivo: en 401 intenta refresh + reintento automático

---

### 🧪 Testing — 60% *(sin cambios en Sesiones 05/06)*

**Estado actual (5 archivos, ~37 tests):**

| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| `auth.service.test.js` | 12 tests | Login, 401, 423 bloqueo, roles, fallos |
| `hash.utils.test.js` | 6 tests | hashPassword, comparePassword, salt único |
| `pagos.recargo.test.js` | 8 tests | Regla día 5, concepto, diaLimitePago |
| `becas.rf21.test.js` | 6 tests | Solicitar, porcentajes, resolver, 409 dup |
| `jwt.utils.test.js` | 5 tests | Generación, verificación, tokens inválidos |

**Lo que falta:**
- ❌ Tests de `calificaciones.service.js` — calcularPromedio, guardar lote
- ❌ Tests de `alumnos.service.js` — matrícula única, paginación
- ❌ Tests de `grupos.service.js`
- ❌ Tests de integración HTTP (Supertest) — endpoints con BD real
- ❌ Cobertura estimada: ~25%

---

### 📄 Documentación — 65% *(sin cambios en Sesiones 05/06)*

| Doc | Estado | Problema |
|-----|--------|---------|
| `README.md` | ✅ Actualizado | Guía completa instalación y deploy |
| `docs/CHANGELOG.md` | ✅ Actualizado | Entradas Sesión 05 añadidas |
| `docs/API_DOCUMENTATION.md` | ⚠️ Parcial | Nuevas rutas de paginación y promedio añadidas; campos de detalle aún desactualizados |
| `docs/DB_MIGRATION_ANALYSIS.md` | ✅ Completo | Análisis SQLite → PostgreSQL |
| `docs/DATABASE.md` | ❌ Obsoleto | 12 modelos SQLite — no refleja los 33 modelos PostgreSQL |
| `docs/ARCHITECTURE.md` | ❌ Obsoleto | Menciona SQLite como motor activo |
| `docs/PROJECT_STRUCTURE.md` | ❌ Obsoleto | No incluye `scripts/`, `.github/`, `vendor/` |
| Manual de usuario | ❌ No existe | Sin guía para admin/gestor/maestra |

---

### 🌐 Frontend — Estado actualizado *(Sesión 06)*

| Área | Estado |
|------|--------|
| `eliminarUsuario()` | ✅ Modal de confirmación Alpine.js |
| Modal "Asignar Beca" | ✅ `x-for` dinámico sobre `listaAlumnos` |
| Modal "Nuevo Alumno" | ✅ `x-for` dinámico sobre `gruposData` |
| Dashboard principal | ✅ Métricas reales desde API |
| Vendor de CDNs | ✅ `frontend/vendor/` con 5 archivos |
| Reset de contraseña | ✅ Modal Admin + endpoint backend |
| Refresh token silencioso | ✅ Interceptor proactivo + reactivo |
| Paginación en paneles | ⚠️ API implementada, frontend no usa `?page=` aún |
| Banner estado offline | ⚠️ Error silenciado, sin indicador visual |

---

## 📊 CHECKLIST COMPLETO POR MÓDULO

### 🗄️ BASE DE DATOS — 92% *(mejorado desde 88% — Sesión 05)*

#### Schema Prisma PostgreSQL v6
- [x] 33 modelos con `@map()` snake_case exacto al SQL real
- [x] `saldoPendiente` como `@default(dbgenerated(...))` (GENERATED ALWAYS AS STORED)
- [x] Relaciones nombradas explícitamente (sin ambigüedades Prisma)
- [x] `@@unique([alumnoId, grupoMateriaId, periodoId])` en `Calificacion`
- [x] `@@unique([alumnoId, cicloId])` en `InscripcionCiclo`
- [x] Tipos PostgreSQL: `@db.Timestamptz()`, `@db.Decimal(12,2)`, `@db.VarChar(n)`, `@db.Date`
- [x] Soft delete vía `eliminadoEn TIMESTAMPTZ` en todos los modelos relevantes
- [x] Roles N:M: `usuario_rol` tabla puente con `activo` y `eliminadoEn`
- [x] `migration_lock.toml` actualizado a `postgresql`
- [x] Baseline migration `20260527000001_init_postgresql`
- [x] Init-db: 5 scripts SQL (`01_esquema_base` → `05_datos_prueba`)
- [x] **`docker-compose.yml` locale corregido:** `--lc-collate=C.UTF-8 --lc-ctype=C.UTF-8` *(antes `--locale=C` rompía búsquedas con ñ/tildes)*
- [x] **`scripts/db-validate.js`:** verifica conexión, versión PG ≥ 14, 33 tablas, seed mínimo
- [x] **`npm run db:validate`** disponible en `package.json`
- [ ] `docs/DATABASE.md` desactualizada (12 modelos SQLite, no 33 PostgreSQL)

#### Seed PostgreSQL
- [x] Niveles educativos (4), Roles (4), `configuracionSistema` correctos
- [x] Usuarios con roles vía `usuarioRol` (upsert correcto)
- [x] Ciclo escolar + `planPago` + Grupos + Materias + `grupoMateria`
- [x] Tutores + `tutorAlumno` N:M + `inscripcionCiclo` con `planPagoId`

---

### 🖥️ BACKEND API — 98% *(mejorado desde 95% — Sesión 05)*

#### Infraestructura
- [x] Express 4.x con arquitectura 4 capas (route → controller → service → repository)
- [x] Helmet (CSP desactivado para frontend estático)
- [x] Rate limiter global: 100 req / 15 min
- [x] Rate limiter auth estricto: 10 req / 15 min
- [x] `GET /config.js` — auto-detecta IP LAN + `VERSION: '2.0.0'`
- [x] `GET /health` — health check con info de entorno
- [x] `express.static()` sirviendo frontend desde `../../frontend`
- [x] Middleware de error global (código HTTP desde `error.statusCode`)
- [x] Graceful shutdown: SIGINT/SIGTERM + `prisma.$disconnect()`
- [x] Rutas limpias: `/admin`, `/gestor`, `/maestra`

#### Módulos API — todos los endpoints activos
- [x] **Auth** — login con lockout, registro de intentos, IP tracking
- [x] **Auth** — `POST /auth/refresh` renovación silenciosa (ventana 2h) *(Sesión 06)*
- [x] **Auth** — `PATCH /auth/usuarios/:id/reset-password` (ADMIN) *(Sesión 06)*
- [x] **Alumnos** — CRUD + soft delete + búsqueda `?q=` + filtro nivel/grupo
- [x] **Alumnos** — `GET /alumnos?page=N&limit=M` paginación LIMIT/OFFSET opt-in *(Sesión 05)*
- [x] **Grupos** — CRUD + materias dinámicas + count de alumnos por grupo
- [x] **Pagos** — registro + recargo + `GET /pagos/calendario` + `GET /pagos/total/:alumnoId`
- [x] **Pagos** — `GET /pagos?page=N&limit=M` paginación LIMIT/OFFSET opt-in *(Sesión 05)*
- [x] **Becas** — RF-21: solicitar (GESTOR) + resolver (ADMIN) + asignacion_beca automática
- [x] **Calificaciones** — guardar individual + lote + resolución automática de periodo
- [x] **Calificaciones** — `GET /calificaciones/promedio/:alumnoId` promedio por materia *(Sesión 05)*
- [x] **Usuarios** — CRUD + roles N:M + soft delete
- [ ] Documentación `docs/API_DOCUMENTATION.md` refleja nuevos endpoints pero aún desactualizada en tipos de campos

---

### 🔐 AUTENTICACIÓN / SEGURIDAD — 98% *(mejorado desde 88% — Sesión 06)*

- [x] JWT firmado con `issuer: 'sae-sandiego'`, expira en 8h
- [x] `verifyToken()` devuelve `{ valid, payload, error }` (no lanza excepciones)
- [x] `decodeToken()` — decodifica sin verificar expiración (para refresh) *(Sesión 06)*
- [x] `authenticate` middleware verifica Bearer token y diferencia `TokenExpiredError`
- [x] RBAC por rol: `authorize('ADMIN')`, `authorize('ADMIN', 'GESTOR')`, etc.
- [x] bcryptjs 12 rounds en seed (10 en producción configurable via env)
- [x] Bloqueo por intentos: `intentosFallidos` + `bloqueadoHasta` en `usuario`
- [x] Registro de intentos en `intento_login` (exitoso/fallido + IP + userAgent)
- [x] Rate limiter estricto en `/api/v1/auth` (10 req / 15 min)
- [x] `limpiarFallos()` al login exitoso
- [x] Configuración de lockout leída de `configuracion_sistema`
- [x] **Refresh Token:** `POST /auth/refresh` — renueva si expiró hace < 2h *(Sesión 06)*
- [x] **Interceptor proactivo en `api.js`:** renueva si quedan < 15 min *(Sesión 06)*
- [x] **Interceptor reactivo en `api.js`:** reintenta en 401, semáforo anti-bucle *(Sesión 06)*
- [x] **Reset Password por Admin:** `PATCH /auth/usuarios/:id/reset-password` + `debeCambiarPwd=true` *(Sesión 06)*
- [ ] HTTPS/TLS — HTTP plano (decisión de diseño documentada para LAN privada)

---

### 📶 RED LAN / CORS DINÁMICO — 95% (sin cambios)

- [x] Servidor escucha en `HOST=0.0.0.0`
- [x] `GET /config.js` inyecta IP LAN automáticamente al cliente
- [x] CORS acepta cualquier origen de la misma subred `/24` (auto-detección)
- [x] CORS acepta orígenes explícitos del `.env` (CORS_ORIGIN)
- [x] CORS acepta peticiones sin `origin` (curl, Postman, SSR)
- [x] Frontend carga `/config.js` antes de `api.js` en los 3 paneles
- [x] `api.js` usa `window.SAE_CONFIG.API_BASE` — nunca localhost hardcodeado
- [ ] HTTPS/TLS — HTTP plano (documentado como decisión de diseño para LAN privada)

---

### 🌐 FRONTEND — 95% *(mejorado desde 75% — Sesión 06)*

#### Integración API (funcional)
- [x] `auth-guard.js` — verifica JWT antes de mostrar panel
- [x] `api.js` — cliente centralizado con auto-inyección de Bearer token
- [x] **Refresh proactivo:** renueva token antes de expirar (< 15 min) *(Sesión 06)*
- [x] **Refresh reactivo:** en 401 intenta refresh, reintenta, luego logout *(Sesión 06)*
- [x] **`mapAlumno()`** expone `mesesAdeudo` y `estadoPago` *(Sesión 06)*
- [x] **`usuarios.resetPassword()`** — módulo nuevo en api.js *(Sesión 06)*
- [x] 401 → `clearSession()` + redirect a login automático
- [x] Error de red → `{ ok: false, offline: true }` (no rompe la UI)
- [x] Todos los `alert()` reemplazados por toast JS dinámico
- [x] Panel Admin — CRUD alumnos, pagos, calificaciones, becas, usuarios, grupos conectados
- [x] Panel Gestor — Alumnos, pagos, becas RF-21 (solo solicitar), calificaciones
- [x] Panel Maestra — Alumnos, grupos, calificaciones por lote

#### Issues resueltos en Sesión 06
- [x] **`eliminarUsuario()`** — modal Alpine.js de confirmación con nombre del usuario *(Sesión 06)*
- [x] **Modal "Asignar Beca"** — `x-for` sobre `listaAlumnos` cargada de API *(Sesión 06)*
- [x] **Modal "Nuevo Alumno"** — `x-for` sobre `gruposData` cargada de API *(Sesión 06)*
- [x] **Dashboard dinámico** — ingresos hoy, deudores, alumnos, becas desde API real *(Sesión 06)*
- [x] **Vendor CDNs** — `frontend/vendor/`: Alpine 44KB, Tailwind 398KB, Lucide 346KB, jsPDF 356KB *(Sesión 06)*
- [x] **0 CDNs externos** — admin, gestor, maestra, login: 100% offline *(Sesión 06)*
- [x] **Reset de contraseña** — modal Admin + `PATCH /auth/usuarios/:id/reset-password` *(Sesión 06)*

#### Pendientes menores
- [ ] Sin banner de estado offline visible al usuario (red interna — bajo impacto)
- [ ] Sin paginación en el frontend (usa la nueva API con `?page=` pero no está integrada en los paneles)

---

### 🐳 DOCKER / INFRAESTRUCTURA — 96% *(mejorado desde 93% — Sesión 05)*

- [x] `docker-compose.yml` con PostgreSQL 16-alpine + backend Node.js
- [x] `postgres_sae` con healthcheck (`pg_isready`)
- [x] Backend `depends_on: postgres_sae: condition: service_healthy`
- [x] Init-db scripts montados en `/docker-entrypoint-initdb.d`
- [x] Volúmenes persistentes: `postgres_data` + `sae_backups`
- [x] Red interna `sae-network` (backend y postgres aislados)
- [x] Memory limit: 512M para PostgreSQL
- [x] Healthcheck del backend: `wget` a `/health`
- [x] Dockerfile: `postgresql-client` añadido, `/app/data` eliminado, `/app/backups` creado
- [x] **Locale PostgreSQL corregido:** `--lc-collate=C.UTF-8 --lc-ctype=C.UTF-8` *(Sesión 05)*
  > ⚠️ Solo surte efecto en volumen nuevo. Requiere `docker compose down -v` (hacer backup antes).
- [ ] `npx prisma generate` en Dockerfile — puede quedar obsoleto sin rebuild del image

---

### 🧪 TESTING — 60% (mejorado desde 40%)

- [x] Vitest instalado y configurado (CJS compatible — `module.exports`)
- [x] `auth.service.test.js` — 12 tests: lockout, roles, redirectTo, limpiarFallos (**NUEVO**)
- [x] `hash.utils.test.js` — 6 tests: hashPassword bcrypt, salt único, compare (**NUEVO**)
- [x] `pagos.recargo.test.js` — 8 tests: regla día 5, concepto, diaLimitePago individual
- [x] `becas.rf21.test.js` — 6 tests: solicitar, porcentajes, resolver, 409 duplicado
- [x] `jwt.utils.test.js` — 5 tests: generación, verificación, tokens inválidos
- [x] Mocks con `vi.spyOn()` — sin BD real en tests unitarios
- [x] `BCRYPT_ROUNDS=1` en tests para velocidad en CI
- [ ] Tests de `calificaciones.service.js` — guardar lote, período automático
- [ ] Tests de `alumnos.service.js` — matrícula única, búsqueda
- [ ] Tests de `grupos.service.js`
- [ ] Tests de integración HTTP (Supertest) — endpoints con BD real
- [ ] Cobertura de código estimada: **~25%** sobre servicios totales

---

### ⚙️ CI/CD — 70% (sin cambios)

- [x] `.github/workflows/ci.yml` con jobs: `lint-and-test` + `docker-build`
- [x] PostgreSQL como service en GitHub Actions
- [x] Aplica init-db SQL (01 + 02), baseline Prisma, seed y luego tests
- [x] Smoke test: `docker compose up` → `curl /health`
- [x] `.eslintrc.cjs` — reglas ESLint 9.x CommonJS
- [x] `.prettierrc` + `.prettierignore`
- [ ] ESLint en CI con `continue-on-error: true` — fallos de lint no bloquean el pipeline
- [ ] Sin deploy automático (correcto para LAN local — deploy es manual por diseño)
- [ ] Sin notificaciones (Slack, email) en fallos de CI

---

## 🎯 RESUMEN EJECUTIVO

### ¿Qué funciona hoy en producción? *(al 29 Mayo 2026)*

El sistema **es completamente operable** en PostgreSQL con todas las funcionalidades core:

1. ✅ Login con bloqueo por intentos, IP tracking y auditoría
2. ✅ Refresh Token silencioso — sesiones sin interrupción durante el turno escolar
3. ✅ Reset de contraseña por Admin — sin dependencia de email
4. ✅ 3 paneles 100% conectados a API real y 100% offline (sin CDNs externos)
5. ✅ CRUD completo: alumnos, pagos, calificaciones, becas, usuarios, grupos
6. ✅ Dashboard con métricas reales (ingresos del día, alumnos activos, deudores, becas)
7. ✅ Selects de Beca y Nuevo Alumno dinámicos desde BD
8. ✅ Confirmación antes de eliminar usuarios
9. ✅ Paginación en API de alumnos y pagos (opt-in, backward compat)
10. ✅ Promedio de calificaciones por alumno/materia vía API
11. ✅ Locale PostgreSQL corregido para búsquedas con ñ y tildes
12. ✅ Script `npm run db:validate` para verificar estado de BD en cualquier momento

### Pendientes para 100% producción

| # | Tarea | Impacto | Esfuerzo | Prioridad |
|---|-------|---------|----------|-----------|
| 1 | Actualizar docs/ (DATABASE.md 12→33 modelos, ARCHITECTURE, API) | 📄 Onboarding | 2-3h | **Esta semana** |
| 2 | ESLint en CI: quitar `continue-on-error: true` | ⚙️ CI calidad | 5 min | **Esta semana** |
| 3 | Tests de `calificaciones.service.js` y `alumnos.service.js` | 🧪 Cobertura | 2-3h | Próxima semana |
| 4 | Tests de integración HTTP (Supertest) | 🧪 Integración | 3-4h | Próxima semana |
| 5 | Paginación en paneles frontend (`?page=` en listar llamadas) | 🟡 Escalabilidad | 1-2h | Próxima semana |
| 6 | Banner de estado offline visible en UI | 🟡 UX menor | 1h | Cuando convenga |

---

## 📈 EVOLUCIÓN HISTÓRICA

| Módulo | Audit. 1 | Audit. 2 | Audit. 3 | Audit. 4 | **Sesión 05** | **Sesión 06** |
|--------|----------|----------|----------|----------|--------------|--------------|
| BD/Schema | ~60% | ~75% | 88% | 88% | **92%** ⬆️ | 92% |
| Backend API | ~70% | ~80% | 90% | 95% | **98%** ⬆️ | 98% |
| Auth/Seguridad | ~60% | ~75% | 88% | 88% | 88% | **98%** ⬆️ |
| Frontend | ~50% | ~65% | 75% | 75% | 75% | **95%** ⬆️ |
| Red LAN/CORS | ~50% | ~80% | 95% | 95% | 95% | 95% |
| Offline/Vendor | 0% | 10% | 20% | 20% | 20% | **98%** ⬆️ |
| Testing | 0% | 10% | 40% | 60% | 60% | 60% |
| CI/CD | 0% | 30% | 70% | 70% | 70% | 70% |
| Docker/Infra | ~40% | ~70% | 85% | 93% | **96%** ⬆️ | 96% |
| Documentación | ~30% | ~50% | 65% | 65% | 65% | 65% |
| **PROMEDIO** | **~46%** | **~65%** | **~82%** | **~85%** | **~86%** | **~87%** ⬆️ |

---

## 📌 DECISIONES DE DISEÑO DOCUMENTADAS

| Decisión | Justificación |
|----------|---------------|
| HTTP plano (sin TLS) | LAN privada del colegio — tráfico nunca sale a internet |
| Sin enums Prisma | Compatibilidad via `constants.js` — migración futura sin cambios |
| Docker init SQL para schema | SQL versionado como fuente de verdad; Prisma solo orquesta |
| Baseline migration vacía | Schema existe vía Docker; se marca como aplicado manualmente |
| CJS todo el backend | Consistencia — sin mezcla ESM/CJS; `vitest.config.js` en CJS (`module.exports`) |
| `configuracion_sistema` global | `cicloId: null` para parámetros del sistema; específicos con `cicloId` |
| `vi.spyOn()` en lugar de `vi.mock()` | Compatibilidad total con módulos CJS que no destructuran sus imports |
| `BCRYPT_ROUNDS=1` en tests | Acelera tests de hash sin comprometer la seguridad del entorno productivo |

---

*Generado por auditoría automática — SAE v2.0.0 · PostgreSQL 16 · Prisma 5.x · Vitest 2.x*
*Próxima auditoría recomendada: después de completar vendor de CDNs, confirmación de borrado y tests de integración*
