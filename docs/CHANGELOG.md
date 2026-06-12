# 📋 CHANGELOG — SAE Colegio San Diego

Formato: [YYYY-MM-DD] | Sesión | Archivos | Motivo | Impacto

---

## [2026-06-08] — Sesión 15: Frontend Finalization (Plan Frontend Implementación Final)

### Tipo
Bugfix · Tests Frontend · Documentación · Sin cambios de arquitectura frontend

### Contexto
Ejecución del plan `front end implementacion final.md`. Inspección real de 16 módulos frontend.
Mayoría ya implementados. 4 bugs/gaps reales encontrados y corregidos.
Nuevo suite de tests de lógica frontend (69 tests). Documentación FRONTEND.md creada.

---

### FE-01 — `gestor_panel.html` · Modal Nuevo Alumno — dropdown de grupos hardcodeado → dinámico

- **Archivo:** `frontend/gestor_panel.html`
- **Bug:** El modal "Registrar nuevo alumno" del panel Gestor tenía un `<select>` con 3 opciones
  hardcodeadas ("Primaria 4°A", "Primaria 4°B", "Secundaria 5°B"). El Admin panel ya usaba
  `x-for="g in gruposData"` correctamente.
- **Impacto real:** Si los grupos en la BD no coinciden exactamente con esos 3 nombres,
  `guardarNuevoAlumno()` hacía `this.gruposData.find(g => g.nombre === ...)` y retornaba
  `undefined` → el alumno se creaba sin grupo asignado (bug silencioso).
- **Fix:** Modal cambiado a `x-for="g in gruposData"` con `:value="g.id"` y `x-model="nuevoAlumnoData.grupoId"`.
  `guardarNuevoAlumno()` ahora usa `Number(nuevoAlumnoData.grupoId)` directamente — igual que admin.

### FE-02 — `gestor_panel.html` · Modal Solicitar Beca — lista de alumnos hardcodeada → dinámica

- **Archivo:** `frontend/gestor_panel.html`
- **Bug:** El modal "Solicitar nueva beca" tenía un `<select>` con 5 alumnos hardcodeados
  ("María González", "Juan Pérez", etc.). `enviarSolicitudBeca()` hacía una búsqueda frágil por
  primer apellido: `listaAlumnos.find(a => a.nombre.startsWith(this.nuevaBeca.alumno.split(' ')[0]))`
- **Impacto real:** El Gestor solo podía solicitar becas para 5 alumnos de ficticio, no para
  los alumnos reales de la BD.
- **Fix:** Modal cambiado a `x-for="a in listaAlumnos"` con `:value="a.id"` y `x-model="nuevaBeca.alumnoId"`.
  `enviarSolicitudBeca()` ahora usa `Number(nuevaBeca.alumnoId)` directamente.
  Añadido `abrirModalSolicitudBeca()` para inicializar estado limpio.

### FE-03 — Paneles Admin/Gestor/Maestra · Sin botón de logout visible

- **Archivos:** `frontend/admin_panel.html`, `frontend/gestor_panel.html`, `frontend/maestra_panel.html`
- **Bug:** `auth-guard.js` expone `window.saeLogout()` pero ningún panel tenía un botón de logout
  visible en la UI. Los usuarios no tenían forma de cerrar sesión sin limpiar el localStorage
  manualmente desde DevTools.
- **Fix:** Sidebar footer de los 3 paneles actualizado con:
  - Inicial del nombre real del usuario (desde `saeApi.getUsuario()`)
  - Nombre del usuario dinámico (en lugar de nombre hardcodeado)
  - Botón logout con icono `log-out` de Lucide → `@click="saeLogout()"`

### FE-04 — `login.html` · Versión v1.0.0 → v2.0.0

- **Archivo:** `frontend/auth/login.html`
- **Bug:** El pie de la página de login mostraba "SAE v1.0.0" pero el sistema es v2.0.0.
- **Fix:** Texto actualizado a "SAE v2.0.0".

### FE-05 — `frontend.validation.test.js` — Nuevo suite (69 tests)

- **Archivo:** `backend/src/__tests__/frontend.validation.test.js` *(nuevo)*
- **Problema:** No existían tests para la lógica frontend (helpers, mappers, constantes)
- **Tests creados:** 69 tests en 10 suites:
  - 8 tests: `auth-guard` — validación client-side de JWT (null, vacío, malformado, expirado, vigente, sin exp, edge)
  - 5 tests: `getBase()` — SAE_CONFIG dinámico vs. fallback localhost
  - 7 tests: `tokenProximoAExpirar()` — refresh proactivo (null, vacío, 5min, 30min, expirado, sin exp, malformado)
  - 9 tests: `mapAlumno()` — campos básicos, grupo anidado, padre anidado, defaults vacíos
  - 6 tests: `mapPago()` — nombre alumno, fecha ISO→YYYY-MM-DD, recargo
  - 6 tests: `mapGrupo()` — campos básicos, _count.alumnos, materias
  - 12 tests: Mapas de constantes (CONCEPTO_MAP, TIPO_BECA_MAP, ROL_MAP, PERIODO_MAP)
  - 5 tests: Offline handling — estructura `{ ok: false, offline: true }`, guards
  - 6 tests: Dashboard — deudores, ordenación, ingresos del día, badge
  - 6 tests: Paginación — navegación, bounds, disabled states

---

### Estado verificado (no se modificó) — módulos ya correctos

- `auth-guard.js` — ✅ valida exp client-side, limpia sesión, redirige login
- `api.js` — ✅ Bearer auto-injection, API_BASE dinámico, refresh proactivo y reactivo, semáforo `_refreshing`
- `offline-indicator.js` — ✅ sondeo 30s, chip "Sin servidor", navigator.online, cargado en 3 paneles
- Toast — ✅ ningún panel usa `alert()`, toast cubre: éxito, error, advertencia, info
- Admin CRUD completo — ✅ alumnos, pagos, calificaciones, becas, usuarios, grupos
- Orden scripts HTML — ✅ config.js → auth-guard.js → api.js en los 3 paneles
- Vendor local — ✅ 0 CDNs externos (alpine, tailwind, lucide, jspdf, fonts.css)
- Dashboard métricas reales API (Admin) — ✅ `_cargarDashboard()` con 3 endpoints

### Documentación actualizada (Sesión 15)
- `docs/FRONTEND.md` — *(nuevo)* arquitectura, scripts, auth-guard, api.js, refresh, offline,
  paneles, modales, dashboard, vendor, paginación, sesión, colores
- `docs/TROUBLESHOOTING.md` — sección Frontend nueva: 7 casos (no conecta, loop refresh,
  sesión inválida, config.js falla, backend offline, toast, dashboard vacío)
- `docs/CHANGELOG.md` — esta entrada

---

## [2026-06-08] — Sesión 14: LAN/CORS Implementación Final (Plan Red LAN Finalization)

### Tipo
Bugfix · Tests LAN/CORS · Documentación · Sin cambios de arquitectura de red

### Contexto
Ejecución del plan `red lan implementacion final.md`. Inspección real de 11 módulos LAN/CORS.
10 módulos ya implementados correctamente. Un bug real encontrado: parseo de `CORS_ORIGIN` sin
trim de espacios. Corregido con 1 línea. Nuevo suite de tests LAN/CORS creado (34 tests).

---

### LAN-01 — `backend/src/config/env.js` · CORS_ORIGIN trim de espacios

- **Archivo:** `backend/src/config/env.js`
- **Bug:** `CORS_ORIGIN.split(',')` sin `.map(s => s.trim())` — si el valor del `.env` tenía
  espacios después de comas (`"http://url1, http://url2"`), el segundo origen quedaba como
  `' http://url2'` con espacio líder. El `.includes()` de la función CORS fallaba → el origen
  era rechazado aunque estuviese en la lista permitida.
- **Impacto real:** Dispositivos LAN agregados con espacio en `CORS_ORIGIN` no podían conectar
- **Fix:** `.split(',').map(s => s.trim())` — una línea, 100% compatible, sin cambios de API

### LAN-02 — `lan.cors.test.js` — Nuevo suite (34 tests)

- **Archivo:** `backend/src/__tests__/lan.cors.test.js` *(nuevo)*
- **Problema:** No existían tests para LAN/CORS — el único gap de cobertura
- **Tests creados:** 34 tests en 6 suites:
  - 6 tests: CORS_ORIGIN parsing y trim (incluye demostración del bug y del fix)
  - 8 tests: `GET /config.js` — 200, Content-Type JS, SAE_CONFIG, API_BASE, SERVER_IP,
    PORT, VERSION, Cache-Control no-cache
  - 3 tests: CORS no-origin (curl, Postman, login sin Origin)
  - 4 tests: CORS explícito (localhost y 127.0.0.1 en CORS_ORIGIN, credentials, preflight OPTIONS)
  - 8 tests: Lógica subred /24 (192.168.x, 10.x, 172.16.x, falso positivo, múltiples NICs)
  - 4 tests: `/health` sin auth — 200, entorno, timestamp ISO, latencia < 500ms

---

### Estado verificado (no se modificó) — 10 módulos
- `HOST=0.0.0.0` — ✅ `config.host = process.env.HOST || '0.0.0.0'`
- `config.js` dinámico — ✅ auto-detecta IP LAN, genera API_BASE correcto
- CORS dinámico `/24` — ✅ `esOrigenLAN()` con `.startsWith(prefijo + '.')` (punto evita falsos positivos)
- No-origin requests — ✅ `if (!origin) return callback(null, true)`
- Orden scripts HTML — ✅ los 3 paneles: `config.js` → `auth-guard.js` → `api.js`
- `api.js` API_BASE — ✅ `window.SAE_CONFIG.API_BASE` + fallback `location.origin`
- Múltiples NICs — ✅ `esOrigenLAN()` itera todas las interfaces IPv4
- Docker LAN — ✅ `HOST: 0.0.0.0`, puerto 3000 mapeado
- Frontend sin localhost hardcodeado — ✅ verificado en `api.js` y 3 paneles HTML

### Documentación actualizada (Sesión 14)
- `docs/LAN_SETUP.md` — sección CORS ampliada (formato CORS_ORIGIN, detección /24, múltiples NICs),
  tabla de problemas expandida, nota de IP múltiple
- `docs/TROUBLESHOOTING.md` — sección LAN/CORS nueva: 4 casos (error CORS, config.js 127.0.0.1,
  URL incorrecta en clientes, cache config.js)
- `docs/CHANGELOG.md` — esta entrada

---

## [2026-06-08] — Sesión 13: Security Hardening Final (Plan Auth Security Finalization)

### Tipo
Tests de seguridad · Documentación · Sin cambios de arquitectura ni de código funcional

### Contexto
Ejecución del plan `Security implementacion final.md`. Inspección real del stack de seguridad:
13 módulos verificados. 11 ya implementados correctamente. 2 gaps reales:
(1) tests de seguridad faltantes para edge cases críticos, (2) documentación incompleta en SECURITY.md
y TROUBLESHOOTING.md.

---

### SHARD-01 — `security.hardening.test.js` — Nuevo suite de tests (26 tests)

- **Archivo:** `backend/src/__tests__/security.hardening.test.js` *(nuevo)*
- **Problema:** Gaps en cobertura de seguridad no cubiertos por suites anteriores:
  - `verifyIgnoreExpiration()` no tenía ningún test
  - Ventana de gracia 2h del refresh no testeada
  - `auth.controller.me()` con usuario inactivo no testeado en controller
  - Anti auto-degradación de rol no testeada con coerción de tipo string→number
- **Tests agregados:** 26 tests distribuidos en 4 suites:
  - 10 tests: `verifyIgnoreExpiration()` — token expirado, firma falsa, payload manipulado,
    issuer incorrecto, secret distinto, vacío/null/truncado
  - 4 tests: `auth.controller.me()` — usuario eliminado, desactivado, activo, id correcto
  - 7 tests: `auth.controller.refresh()` — sin auth, firma inválida, fuera de gracia (>2h),
    dentro de gracia (<2h), token válido, limpieza iss/iat/exp
  - 5 tests: `usuarios.controller.actualizar()` — degradación propia, degradación a MAESTRA,
    cambio a otro usuario, sin campo rol, coerción string→number

### SHARD-02 — `docs/SECURITY.md` — Sección LAN + HTTP sin HTTPS

- **Archivo:** `docs/SECURITY.md`
- **Problema:** Faltaban las secciones de modelo de seguridad LAN y la explicación
  arquitectónica de por qué HTTP es correcto en este entorno (MÓDULO 12 del plan)
- **Agregado:**
  - Sección "Modelo de Seguridad LAN" — tabla característica → valor
  - Sección "HTTP sin HTTPS — Decisión Arquitectónica" — justificación completa:
    red privada, offline-first, sin exposición pública, complejidad innecesaria
  - Tabla "Qué se protege con JWT aunque sea HTTP"
  - Guía mínima "Si en el futuro se requiere HTTPS" (nginx + openssl)

### SHARD-03 — `docs/TROUBLESHOOTING.md` — Sección JWT/Auth ampliada

- **Archivo:** `docs/TROUBLESHOOTING.md`
- **Problema:** Faltaban casos frecuentes de diagnóstico auth:
  `401 token inválido`, sesión expirada, refresh fallido, usuario inactivo, rate limit 429
- **Agregado:** 5 casos nuevos con síntoma, causa raíz y solución concreta:
  - `401 Token inválido` — JWT_SECRET cambiado o localStorage corrompido
  - `401 Sesión expirada` — fuera de ventana de gracia 2h
  - `401 firma corrupta` en refresh — token falsificado rechazado correctamente
  - `401 Usuario inactivo` en `/auth/me` — usuario desactivado en BD post-emisión JWT
  - `429 Rate Limit` — superó 10 req/15min en `/api/v1/auth`

---

### Estado verificado (no se modificó) — 11 módulos
- JWT `verifyToken()` / `verifyIgnoreExpiration()` — ✅ usa `jwt.verify` siempre
- Refresh flow — ✅ firma verificada + ventana de gracia 2h
- Middleware `authenticate` — ✅ diferencia `TokenExpiredError` vs inválido
- RBAC completo — ✅ `soloAdmin`, `adminOGestor`, `todosLosRoles`
- Auth/me validación BD — ✅ `activo: true, eliminadoEn: null`
- Lockout + `limpiarFallos()` — ✅ configurable desde `configuracion_sistema`
- Login tracking en `intento_login` — ✅ IP + userAgent + resultado
- Rate limiter auth — ✅ 10 req/15min en `/api/v1/auth`
- Interceptor frontend — ✅ semáforo + proactivo (15min) + reactivo (401)
- `.env` no trackeado — ✅ `.gitignore` + nunca commiteado
- Anti auto-degradación ADMIN — ✅ guard en `usuarios.controller.actualizar()`

### Documentación actualizada
- `docs/SECURITY.md` — 2 secciones nuevas (LAN model + HTTP decision)
- `docs/TROUBLESHOOTING.md` — 5 casos auth nuevos
- `docs/CHANGELOG.md` — esta entrada

---

## [2026-06-08] — Sesión 12: Backend/Security Implementación Final (Plan Security & Docker)

### Tipo
Completar módulos Seguridad + Docker · Sin nuevas features · Sin cambios de arquitectura ni schema

### Contexto
Ejecución del plan `back end implementacion final.md`. Inspección real de código → 6 de 7 módulos
ya estaban implementados correctamente. Un módulo incompleto: `.dockerignore` existía pero con
exclusiones insuficientes. Corregido y completado.

---

### SEC-01 — RBAC reset-password `PATCH /auth/usuarios/:id/reset-password`

- **Archivo:** `backend/src/routes/auth.routes.js`
- **Estado:** ✅ Ya implementado desde sesiones anteriores
- **Verificado:** Línea 24 aplica `authenticate, soloAdmin` — solo ADMIN puede ejecutar el reset

### SEC-02 — JWT verify refresh token (jwt.verify con ignoreExpiration)

- **Archivo:** `backend/src/utils/jwt.utils.js`, `backend/src/controllers/auth/auth.controller.js`
- **Estado:** ✅ Ya implementado
- **Verificado:** `verifyIgnoreExpiration()` usa `jwt.verify({ issuer: 'sae-sandiego', ignoreExpiration: true })`
  — firma siempre verificada, tokens falsificados → null → 401

### SEC-03 — Auth/me validación usuario activo en BD

- **Archivo:** `backend/src/controllers/auth/auth.controller.js`, `backend/src/services/auth/auth.service.js`
- **Estado:** ✅ Ya implementado
- **Verificado:** `GET /auth/me` llama `authService.findUsuarioActivo(id)` que verifica
  `activo: true` y `eliminadoEn: null` — usuario desactivado/eliminado → 401

### SEC-04 — Docker frontend mount `/admin`, `/gestor`, `/maestra`

- **Archivos:** `docker-compose.yml`, `backend/src/app.js`
- **Estado:** ✅ Ya implementado
- **Verificado:** `docker-compose.yml` monta `./frontend:/frontend:ro`; `app.js` resuelve
  `path.resolve(__dirname, '..', '..', 'frontend')` = `/frontend` dentro del contenedor

### SEC-05 — Docker hardening USER node (no-root)

- **Archivo:** `backend/Dockerfile`
- **Estado:** ✅ Ya implementado
- **Verificado:** Dockerfile líneas 28-31: `chown -R node:node /app` + `USER node` antes de
  `npx prisma generate` y `CMD ["node", "src/server.js"]`

### SEC-06 — `.dockerignore` — completado con exclusiones faltantes

- **Archivo:** `backend/.dockerignore`
- **Estado:** ⚠️ Existía pero incompleto — agregadas 5 categorías faltantes
- **Fix:** Agregadas exclusiones de:
  - `prisma/prisma/sae.db*` — archivos SQLite solo dev (producción usa PostgreSQL)
  - `backups/` — gestionado por volumen `sae_backups`; no va en la imagen
  - `.eslintrc.cjs`, `.prettierrc` — herramientas dev, innecesarias en producción
  - `vitest.config.js` — config test framework, no requerida en imagen
- **Impacto:** Build context más pequeño, archivos sensibles/innecesarios fuera de la imagen

### SEC-07 — `.env` git tracking

- **Archivo:** `backend/.gitignore`
- **Estado:** ✅ Protegido desde el inicio
- **Verificado:** `backend/.gitignore` tiene `.env` en línea 2; `git ls-files --cached` no muestra
  `backend/.env` — el archivo nunca fue trackeado

---

### Documentación actualizada (Sesión 12)
- `docs/SECURITY.md` — fecha actualizada + verificada contra implementación real
- `docs/DEPLOYMENT.md` — fecha actualizada + verificada contra Docker actual
- `docs/CHANGELOG.md` — esta entrada

---

## [2026-06-08] — Sesión 11: CI/CD Implementación Final (Plan CI/CD Finalization)

### Tipo
Bugfix · Estabilización CI/CD · Sin nuevas features · Sin cambios de backend ni schema

### Contexto
Ejecución del plan `CI-CD Implementacion final.md`. Inspección real del workflow → 4 bugs
encontrados y corregidos. Documentación CI/CD creada. Sin cambios a arquitectura LAN ni deploy.

---

### CICD-01 — `.github/workflows/ci.yml` · Scripts init-db 03 y 04 faltantes

- **Archivo:** `.github/workflows/ci.yml`
- **Bug:** El step "Aplicar esquema PostgreSQL" solo aplicaba `01_esquema_base.sql` y
  `02_configuracion.sql`. Faltaban `03_integridad_referencial.sql` y `04_triggers_auditoria.sql`.
- **Impacto:** FK constraints y triggers de auditoría no existían en la BD de CI → los tests
  de integridad referencial corrían sin restricciones reales.
- **Fix:** Agregados los 2 scripts faltantes al step init-db (total: 4 scripts aplicados).

### CICD-02 — `.github/workflows/ci.yml` · Smoke test con `.env.example` roto (post-BF11)

- **Archivo:** `.github/workflows/ci.yml` (job `docker-build`, step "Smoke test")
- **Bug:** `cp backend/.env.example backend/.env` — tras la corrección de seguridad BF-11,
  `.env.example` contiene `POSTGRES_PASSWORD=<CAMBIAR_ANTES_DE_PRODUCCION>`. Docker compose
  usaba ese string literal como contraseña, rompiendo la autenticación PostgreSQL en CI.
- **Impacto:** El smoke test Docker fallaba con error de autenticación PostgreSQL.
- **Fix:** Reemplazado por `printf 'POSTGRES_PASSWORD=SaeColegio2026\nJWT_SECRET=...\n' > backend/.env`
  — genera un `.env` mínimo con valores CI reales, sin depender de `.env.example`.

### CICD-03 — `.github/workflows/ci.yml` · `sleep 15` inestable en smoke test

- **Archivo:** `.github/workflows/ci.yml` (job `docker-build`, step "Smoke test")
- **Bug:** `sleep 15` hardcodeado — si el backend tarda más en arrancar (carga del runner CI
  variable), el `curl` falla aunque el servicio fuera a responder segundos después.
- **Impacto:** Fallos falsos intermitentes en el pipeline Docker.
- **Fix:** Reemplazado por loop de retry (12 intentos × 5s = máx 60s) con `curl -sf --max-time 5`.
  El pipeline espera exactamente lo necesario y falla limpiamente tras timeout real.

### CICD-04 — `.github/workflows/ci.yml` · Prettier no estaba en el pipeline CI

- **Archivo:** `.github/workflows/ci.yml` (job `lint-and-test`)
- **Bug:** Solo ESLint se ejecutaba. Prettier no tenía step en CI — formato podía divergir
  sin que el pipeline lo detectara.
- **Fix:** Agregado step `Prettier (format check)` con `continue-on-error: true` después de ESLint.
  No bloquea el pipeline, pero reporta diffs de formato en el log de CI.

---

### Documentación creada (Sesión 11)
- `docs/CICD.md` — **nuevo**: arquitectura CI completa, jobs, PostgreSQL service, init-db,
  Prisma strategy, ESLint/Prettier non-blocking, smoke test, deploy manual LAN, checklist

### Documentación actualizada
- `docs/CHANGELOG.md` — esta entrada

---

## [2026-06-08] — Sesión 10: BD Implementación Final (Plan BD Finalization)

### Tipo
Bugfix · Estabilización BD · Sin nuevas features · Sin cambios de arquitectura ni schema

### Contexto
Ejecución del plan `bd implementacion final.md`. Inspección real de código → 5 bugs encontrados
y corregidos. Nuevo test suite `db.integrity.test.js` (16 tests). Documentación actualizada.

---

### DB-01 — `db-backup.js` · Contraseña hardcodeada eliminada

- **Archivo:** `backend/scripts/db-backup.js`
- **Bug:** `const PG_PASS = process.env.POSTGRES_PASSWORD || 'SaeColegio2026'` — fallback hardcodeado
- **Fix:** `const PG_PASS = process.env.POSTGRES_PASSWORD ?? ''` + advertencia si vacío en modo local

### DB-02 — `db-restore.js` · Contraseña hardcodeada eliminada

- **Archivo:** `backend/scripts/db-restore.js`
- **Bug:** mismo fallback `'SaeColegio2026'` que en db-backup
- **Fix:** `const PG_PASS = process.env.POSTGRES_PASSWORD ?? ''`

### DB-03 — `db-backup.js` / `db-restore.js` / `db-reset.js` · dotenv sin ruta explícita

- **Archivos:** los 3 scripts de BD
- **Bug:** `require('dotenv').config()` sin path — fallaba si se ejecutaban fuera de `backend/`
- **Fix:** `require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })` (igual que `db-validate.js`)

### DB-04 — `pagos.repository.js` · Decimal precision en `totalPagado` y `totalDeuda`

- **Archivo:** `backend/src/repositories/pagos/pagos.repository.js` (líneas 291-292)
- **Bug:** `Number(montoPagado) + monto` — suma JS floating point puede producir `3999.9999999...`
- **Fix:** `Math.round((Number(x) + Number(y)) * 100) / 100` para ambas variables

### DB-05 — `BACKUP_AND_RECOVERY.md` · Formato incorrecto `.sql.gz`

- **Archivo:** `docs/BACKUP_AND_RECOVERY.md`
- **Bug:** documentación decía `.sql.gz` pero el script genera `.sql` (plain format)
- **Fix:** todas las referencias a `.sql.gz` corregidas a `.sql`

---

### Documentación actualizada
- `docs/DATABASE.md` — sección nueva "Scripts de Base de Datos" con tabla + flujo validación
- `docs/BACKUP_AND_RECOVERY.md` — formato correcto `.sql`, comando restore actualizado
- `docs/CHANGELOG.md` — esta entrada

### Tests creados (Sesión 10)
- `backend/src/__tests__/db.integrity.test.js` — **16 tests** nuevos:
  - 5 tests: soft delete (alumnosRepo y becasRepo)
  - 6 tests: montoCapital guard (Math.max puro)
  - 5 tests: Decimal precision (Math.round puro)
  - 3 tests: P2002 race condition (via calRepo.upsert)

---

## [2026-06-08] — Sesión 09: Bugfixes y Estabilización (Plan Corrección de Bugs)

### Tipo
Bugfix · Estabilización · Sin nuevas features · Sin cambios de arquitectura

### Contexto
Corrección de todos los hallazgos de AUDITORÍA 6 (ALTO, MEDIO y LEVE).
No se tocó ningún módulo funcional de forma destructiva.
11 fixes aplicados, todos basados en código real.

---

### BF-01 — `server.js` · Log "SQLite" corregido a "PostgreSQL"
- `backend/src/server.js` — línea de log actualizada

### BF-02 — `server.js` · Handlers `unhandledRejection` / `uncaughtException` añadidos
- `backend/src/server.js` — process.on para errores asíncronos no capturados

### BF-03 — `pagos.repository.js` · `montoCapital` nunca negativo
- `backend/src/repositories/pagos/pagos.repository.js` — `Math.max(0, ...)` aplicado

### BF-04 — `calificaciones.repository.js` · Race condition en creación de períodos
- `backend/src/repositories/calificaciones/calificaciones.repository.js`
- `try/catch P2002` para concurrencia: la request que pierde recupera el período creado

### BF-05 — `pagos.validator.js` · Validación `metodoPago` añadida
- `backend/src/utils/validators/pagos.validator.js` — nuevo campo validado
- `backend/src/utils/constants.js` — nueva constante `METODOS_PAGO` / `METODOS_PAGO_VALIDOS`

### BF-06 — `calificaciones.service.js` · Filtro `cuentaParaPromedio` movido a DB
- `backend/src/repositories/calificaciones/calificaciones.repository.js` — nuevo param `soloParaPromedio`
- `backend/src/services/calificaciones/calificaciones.service.js` — pasa `soloParaPromedio:true`

### BF-07 — `usuarios.controller.js` · Guard contra auto-degradación de rol ADMIN
- `backend/src/controllers/usuarios/usuarios.controller.js` — HTTP 403 si admin cambia su propio rol

### BF-08 — `admin_panel.html` · Badge deudores ahora dinámico
- `frontend/admin_panel.html` — `x-text="dashSummary.deudores"` en lugar de `7` hardcodeado

### BF-09 — `admin_panel.html` · Vista Deudores conectada a datos reales de la API
- `frontend/admin_panel.html` — `x-for` sobre `listaAlumnos` filtrado por `mesesAdeudo > 0`
- Ordenado por mayor a menor meses, severidad CSS dinámica, badges reactivos

### BF-10 — `database.js` · Comentario residual SQLite corregido
- `backend/src/config/database.js` — JSDoc actualizado

### BF-11 — `.env.example` · Contraseñas de ejemplo reemplazadas por placeholders
- `backend/.env.example` — `SaeColegio2026` → `<CAMBIAR_ANTES_DE_PRODUCCION>`

---

### Documentación creada
- `docs/BUGFIXES.md` — Registro completo de los 11 fixes con causa raíz y validación

### Archivos NO modificados
- `backend/prisma/` — intacto
- `docker-compose.yml` — intacto
- `frontend/gestor_panel.html` — intacto
- `frontend/maestra_panel.html` — intacto
- `frontend/shared/api.js` — intacto
- Endpoints públicos — ninguno modificado

---

## [2026-06-08] — Sesión 08: Documentación y Organización (Plan v5)

### Tipo
Documentación · Organización · Sin cambios en lógica de negocio

### Contexto
Continuación del plan_implementacionv5: completar documentación técnica pendiente,
actualizar PROJECT_STRUCTURE.md con estructura real actual, y crear los archivos
de prompts de IA en `/ai/prompts/`. Ningún archivo funcional fue modificado.

---

### CAMBIOS REALIZADOS

#### docs/PROJECT_STRUCTURE.md — ACTUALIZADO
- Refleja la estructura real del proyecto al 2026-06-08
- Eliminada referencia al módulo `asistencias` (fue removido en sesión anterior)
- Corregida ruta de tests: `tests/` → `__tests__/`
- Añadidas carpetas nuevas: `/ai`, `/audits`, `/BD-ColegioSandiego`, `.cerebro/`
- Añadido `constants.js` en `utils/`
- Lista completa de archivos en `docs/`
- Añadida tabla de módulos del sistema con roles y descripción
- Añadida tabla de convenciones del proyecto
- Actualizada regla 5: referencia al error_ledger

#### ai/prompts/00_MASTER_RULES.md — CREADO
- Reglas generales e inmutables del proyecto
- Tabla de archivos críticos
- Reglas PROHIBIDO / OBLIGATORIO

#### ai/prompts/01_SECURITY_AND_DOCKER.md — CREADO
- Flujo JWT completo (login → token → refresh)
- Reglas críticas JWT (incluye ERR-007)
- Helpers RBAC y su uso en routes
- Tabla de capas de seguridad HTTP
- Servicios Docker, volúmenes, comandos
- Variables de entorno obligatorias

#### ai/prompts/02_TESTING.md — CREADO
- Stack de testing (Vitest + Supertest)
- Tabla completa de 118 tests por archivo
- Convenciones de mocking (Prisma, utils)
- Áreas sin cobertura actual

#### ai/prompts/03_DOCUMENTATION.md — CREADO
- Tabla de todos los documentos oficiales
- Estándar de formato (markdown, tablas, código)
- Reglas de consistencia (nombres, rutas, roles)
- Mapa "si cambia X → actualizar Y"
- Descripción de carpeta `/audits/`

#### docs/ARCHITECTURE.md — ACTUALIZADO (sesión previa del día)
- Añadida tabla de stack tecnológico oficial con versiones
- Completadas reglas de negocio: recargo automático y sanciones por adeudo

#### docs/EVALUATION_GUIDE.md — ACTUALIZADO (sesión previa del día)
- Completada tabla de 118 tests por módulo
- Checklist de defensa académica

---

### Archivos NO modificados
- `backend/` — intacto
- `frontend/` — intacto
- `docker-compose.yml` — intacto
- `.cerebro/memory_loop/error_ledger.md` — intacto

---

## [2026-06-07] — Sesión 07: Testing Automatizado

### Tipo
Testing · Calidad · Sin cambios en lógica de negocio

### Contexto
Implementación del plan_implementacionv4: cobertura automatizada del backend.
No se modificó lógica de negocio, endpoints, esquema de BD ni frontend.
Solo se agregaron archivos de prueba y se actualizó la config de coverage.

---

### MÓDULO 1 — Middleware Testing

#### Archivos creados
- `backend/src/__tests__/middleware.auth.test.js`
  - authenticate(): sin header, header malformado, token inválido, firma falsa, token válido
- `backend/src/__tests__/middleware.rbac.test.js`
  - authorize(): soloAdmin, adminOGestor, todosLosRoles; respuesta 403 con rolesRequeridos
- `backend/src/__tests__/middleware.validate.test.js`
  - validate(): body válido → next(), errores → 422, loginValidators reales

---

### MÓDULO 2 — Servicios Críticos

#### Archivos creados
- `backend/src/__tests__/alumnos.service.test.js`
  - obtenerPorId(), crear() con matrícula única/duplicada, actualizar(), eliminar()
- `backend/src/__tests__/calificaciones.service.test.js`
  - calcularPromedio(): alumno inexistente, sin calificaciones, 1 materia, múltiples materias, exclusión cuentaParaPromedio, redondeo, ordenamiento

---

### MÓDULO 3 — Integration Testing HTTP

#### Archivos creados
- `backend/src/__tests__/integration/auth.integration.test.js`
  - POST /login, POST /refresh, GET /me, PATCH /reset-password (RBAC), GET /alumnos (RBAC)
  - Servicios mockeados con vi.spyOn(); app real; supertest HTTP en memoria

---

### Bugfix detectado por integration test
- `backend/src/controllers/auth/auth.controller.js` — refresh()
  - **Bug:** `POST /api/v1/auth/refresh` lanzaba 500 en producción. jsonwebtoken v9 rechaza
    `generateToken(payload)` si `payload.iss` ya existe Y se pasa `options.issuer` simultáneamente.
  - **Causa raíz:** `verifyIgnoreExpiration()` devuelve el payload con `iss: 'sae-sandiego'`.
    Solo se omitían `iat`/`exp`; `iss` quedaba en `payloadLimpio`.
  - **Fix mínimo:** `const { iat, exp, iss, ...payloadLimpio } = payload`
  - **Registrado en:** `.cerebro/memory_loop/error_ledger.md` [ERR-007]

---

### Config
- `backend/vitest.config.js`: añadido `src/middleware/**/*.js` al include de coverage

---

### Documentación
- `docs/TESTING.md`: creado (instrucciones de ejecución y mapa de cobertura)

---

## [2026-06-05] — Sesión 06: Seguridad + Docker Hardening

### Tipo
Seguridad · Infraestructura Docker · Documentación

### Contexto
Implementación del plan_implementacionv3: cierre de vulnerabilidades críticas de seguridad
y hardening de la infraestructura Docker. No se modificó lógica de negocio ni frontend.

---

### MÓDULO 1 — RBAC Reset Password

#### Problema
`PATCH /auth/usuarios/:id/reset-password` solo usaba `authenticate`.
Cualquier usuario autenticado (GESTOR, MAESTRA) podía resetear contraseñas.

#### Archivos modificados
- `backend/src/routes/auth.routes.js`
  - Importado `soloAdmin` de `rbac.middleware.js`
  - Agregado `soloAdmin` entre `authenticate` y `resetPassword` en la ruta
- **Riesgo mitigado:** escalación de privilegios horizontal
- **Compatibilidad:** ADMIN sigue funcionando igual, GESTOR/MAESTRA reciben `403`

---

### MÓDULO 2 — JWT Verify Refresh Token

#### Problema
`POST /auth/refresh` usaba `jwt.decode()` que NO verifica la firma.
Token falsificado con payload arbitrario era aceptado sin validación.

#### Archivos modificados
- `backend/src/utils/jwt.utils.js`
  - Nueva función `verifyIgnoreExpiration(token)`: usa `jwt.verify` con `ignoreExpiration: true`
  - Valida firma e issuer; rechaza tokens manipulados
- `backend/src/controllers/auth/auth.controller.js`
  - `refresh()`: reemplazado `jwtUtils.decodeToken()` → `jwtUtils.verifyIgnoreExpiration()`
- **Riesgo mitigado:** forja de tokens JWT con payload arbitrario
- **Compatibilidad:** ventana de gracia de 2h y refresh silencioso conservados

---

### MÓDULO 3 — Auth/Me Validación Usuario Activo

#### Problema
`GET /auth/me` devolvía el payload del JWT sin consultar la BD.
Usuario desactivado o eliminado podía seguir accediendo con token vigente.

#### Archivos modificados
- `backend/src/services/auth/auth.service.js`
  - Nueva función `findUsuarioActivo(id)`: verifica `activo=true` y `eliminadoEn=null`
- `backend/src/controllers/auth/auth.controller.js`
  - `me()`: ahora llama a `authService.findUsuarioActivo()` antes de responder → `401` si inactivo
- **Riesgo mitigado:** acceso persistente con JWT de usuario revocado
- **Compatibilidad:** usuarios activos no notan cambio

---

### MÓDULO 4 — Docker Frontend Fix

#### Problema
El frontend no existía dentro del contenedor Docker.
`/admin`, `/gestor`, `/maestra` respondían `404`.

#### Causa
`app.js` resuelve el frontend con `path.resolve(__dirname, '..', '..', 'frontend')` → `/frontend`
pero el Dockerfile solo copiaba `./backend`, dejando `/frontend` vacío.

#### Archivos modificados
- `docker-compose.yml`
  - Agregado volume `./frontend:/frontend:ro` al servicio `backend`
- **Riesgo mitigado:** frontend inaccesible en producción Docker
- **Compatibilidad:** mount de solo lectura, frontend no modificado

---

### MÓDULO 5 — Docker Hardening (USER node)

#### Problema
El proceso Node.js corría como `root` dentro del contenedor.

#### Archivos modificados
- `backend/Dockerfile`
  - `RUN ... chown -R node:node /app` antes de cambiar usuario
  - `USER node` antes de `npx prisma generate` y CMD
- **Riesgo mitigado:** ejecución de código arbitrario con privilegios root
- **Compatibilidad:** imagen `node:20-alpine` incluye usuario `node` (uid 1000) por defecto

---

### MÓDULO 6 — Dockerignore

#### Archivos creados
- `backend/.dockerignore`
  - Excluye: `node_modules`, `.env`, `logs/`, `tests/`, `coverage/`, editor, OS

---

### MÓDULO 7 — ENV Security

#### Estado
`backend/.env` ya estaba excluido por `backend/.gitignore`. No se requirió acción adicional.

---

### Documentación creada
- `docs/SECURITY.md` — Modelo completo de seguridad, RBAC, checklist de testing
- `docs/DEPLOYMENT.md` — Guía de despliegue Docker, LAN, firewall, checklist de validación
- `docs/CHANGELOG.md` — Esta entrada

---

### Impacto
- Reset de password bloqueado a ADMIN
- Refresh token verifica firma cryptográfica (tokens falsificados rechazados)
- `/auth/me` invalida sesiones de usuarios revocados
- Frontend accesible en Docker en `/admin`, `/gestor`, `/maestra`
- Contenedor Node corre como usuario no-root

### Frontend
**INTACTO** — Ningún archivo HTML/CSS del frontend fue modificado.

---

## [2026-05-29] — Sesión 05: Estabilización BD + Paginación + Promedios

### Tipo
Estabilización de infraestructura · Escalado de API · Lógica de negocio

### Contexto
Siguiendo la AUDITORÍA 4, se ejecutó el plan de estabilización en dos fases:
Fase 1 (BD) → Fase 2 (API). No se modificó HTML/CSS del frontend.

### FASE 1 — Base de Datos

#### Archivos modificados
- `docker-compose.yml` — Fix locale PostgreSQL:
  `--locale=C` → `--lc-collate=C.UTF-8 --lc-ctype=C.UTF-8`
  Soluciona búsquedas ILIKE con ñ y tildes en Alpine Linux (musl libc).
  ⚠️ Solo surte efecto en volumen nuevo (`docker compose down -v`).

#### Archivos creados
- `backend/scripts/db-validate.js` — Script de validación del schema:
  verifica conexión, versión PostgreSQL, 33 tablas requeridas y datos de seed mínimos.
  Nuevo script npm: `npm run db:validate`

#### Verificación del schema (sin cambios requeridos)
- 33 modelos PostgreSQL en `schema.prisma` ✅
- `migration_lock.toml` → `provider = "postgresql"` ✅
- 1 migration baseline (`20260527000001_init_postgresql`) ✅
- Sin residuos SQLite en el código fuente ✅

### FASE 2 — API & Lógica de Servicio

#### Paginación — `GET /api/v1/alumnos`
- `alumnos.repository.js` — `findAll()` ahora acepta `page` y `limit`
  - Sin `page` → comportamiento anterior (array plano, backward compat)
  - Con `?page=N&limit=M` → `{ data[], pagination: { page, limit, total, pages, hasNext, hasPrev } }`
  - Límite máximo: 100 registros/página · Default: 20
  - Usa `Promise.all([findMany, count])` para LIMIT/OFFSET + COUNT en paralelo
- `alumnos.controller.js` — extrae `page`, `limit`, `nivel`, `estado` de query params

#### Paginación — `GET /api/v1/pagos`
- `pagos.repository.js` — `findAll()` con la misma estrategia de paginación
  - Default: 25 registros/página · Límite máximo: 100
- `pagos.controller.js` — extrae `page`, `limit`, `tutorId` (nuevo filtro) de query params

#### Calificaciones — `calcularPromedio()`
- `calificaciones.service.js` — añadida función `calcularPromedio(alumnoId, opts)`:
  - Solo considera calificaciones con `cuentaParaPromedio = true`
  - Agrupa por materia → promedio por materia
  - Promedio general = media aritmética de promedios por materia (RF-Calificaciones)
  - Retorna: `{ alumnoId, totalCalificaciones, promedioGeneral, materias[] }`
- `calificaciones.controller.js` — añadido handler `promedio()`
- `calificaciones.routes.js` — nueva ruta:
  `GET /api/v1/calificaciones/promedio/:alumnoId[?periodoId=N|?periodo=TRIMESTRE_1]`
  Accesible por ADMIN, GESTOR y MAESTRA.

#### Limpieza de código
- `pagos.repository.js` — eliminada referencia a "SQLite" en comentario
- Escaneo completo de backend/src/: sin hardcodes de nombres, sin TODOs críticos ✅

### Impacto
- Listas de alumnos y pagos ahora escalan a N registros sin saturar memoria
- Maestras pueden consultar el promedio de un alumno via API
- Schema de BD validable en cualquier momento con `npm run db:validate`
- Búsquedas con caracteres especiales (García, Muñoz, Peña) correctas en nuevo volumen Docker

### Frontend
**INTACTO** — Ningún archivo HTML/CSS del frontend fue modificado.
La paginación es opt-in: el frontend actual (sin `?page=`) sigue recibiendo el array completo.

---

## [2026-05-22] — Sesión 03: Integración Frontend → Backend (Fase 1 completa)

### Tipo
Integración backend + creación de módulos compartidos frontend

### Contexto
El frontend existía con datos mock (arrays hardcodeados) y cero llamadas HTTP.
Se implementa la capa de integración real sin modificar una sola línea de HTML/CSS.
Los 3 paneles siguen siendo visualmente idénticos. Todos los `alert()` de mutaciones
fueron reemplazados por llamadas reales a la API con feedback visual (toast).

### Archivos creados
- `frontend/shared/api.js` — Cliente API centralizado: módulos por recurso (auth, alumnos, pagos, becas, calificaciones, grupos, usuarios), mappers API→frontend, constantes de mapeo UI→API, sistema de toast sin cambios HTML
- `frontend/shared/auth-guard.js` — Guard de sesión: verifica JWT en localStorage antes de que Alpine.js inicialice; redirige a login si expirado o ausente
- `frontend/auth/login.html` — Pantalla de login: Alpine.js + POST /api/v1/auth/login + redirección por rol (ADMIN→admin_panel, GESTOR→gestor_panel, MAESTRA→maestra_panel)

### Archivos modificados
**Backend:**
- `backend/src/app.js` — Añadido endpoint `GET /config.js` que inyecta dinámicamente la IP LAN del servidor a todos los nodos satélite (detección automática de interfaz no-loopback)

**Frontend (solo bloque `<script>` Alpine.js, HTML/CSS intacto):**
- `frontend/admin_panel.html` — Conectado a API: alumnos, pagos, calificaciones, becas (flujo completo admin), usuarios. Carga inicial paralela de alumnos+grupos. Carga lazy de pagos y usuarios al navegar
- `frontend/gestor_panel.html` — Conectado a API: alumnos, pagos, calificaciones, solicitud de beca RF-21 (gestor solicita → admin aprueba)
- `frontend/maestra_panel.html` — Conectado a API: alumnos (para autocompletado de calificaciones), grupos (vista de materias), guardar calificaciones

### Motivo
Cumplir el contrato técnico del Plan de Implementación V2: el frontend es el mapa oficial,
Claude es únicamente integrador. El gap crítico identificado en auditoría (0% integración)
queda resuelto en esta sesión.

### Impacto
- Login real con JWT — paneles protegidos por auth-guard
- Alumnos: se cargan de la DB real al iniciar cada panel
- Pagos: se registran en la DB con cálculo automático de recargo (día 5)
- Calificaciones: se guardan via endpoint lote con mapeo inteligente por nombre de materia
- Becas: flujo RF-21 completo conectado (GESTOR solicita, ADMIN resuelve)
- Usuarios: CRUD conectado con auto-generación de username
- Nodos satélite: reciben IP del servidor dinámicamente via `/config.js`
- Todos los `alert()` reemplazados por toast JS (no invasivo, sin cambios HTML)

---

## [2026-05-21] — Sesión 01: Arquitectura base del sistema

### Tipo
Implementación inicial (nueva estructura completa)

### Archivos creados
**Backend:**
- `backend/package.json` — Dependencias: Express, Prisma, JWT, bcryptjs, Helmet, cors, rate-limit
- `backend/.env` + `backend/.env.example` — Variables de entorno
- `backend/.gitignore`
- `backend/prisma/schema.prisma` — Modelos: Usuario, Alumno, Grupo, GrupoMateria, Pago, Beca, SolicitudBeca, Asistencia, Calificacion, CicloEscolar, PlanPago, AlumnoCiclo, PadreTutor
- `backend/prisma/seed.js` — Datos iniciales: 3 usuarios, 4 grupos, 8 alumnos, 2 ciclos de pago
- `backend/src/config/database.js` — Singleton Prisma Client
- `backend/src/config/env.js` — Configuración centralizada de entorno
- `backend/src/app.js` — Express + middlewares globales + static frontend
- `backend/src/server.js` — Entry point con graceful shutdown
- `backend/src/middleware/auth.middleware.js` — Verificación JWT
- `backend/src/middleware/rbac.middleware.js` — RBAC por roles (ADMIN/GESTOR/MAESTRA)
- `backend/src/middleware/error.middleware.js` — Manejador global de errores
- `backend/src/middleware/validate.middleware.js` — Validación express-validator
- `backend/src/utils/jwt.utils.js` — generateToken / verifyToken
- `backend/src/utils/hash.utils.js` — hashPassword / comparePassword
- `backend/src/utils/response.utils.js` — Formato estándar de respuestas
- `backend/src/utils/validators/` — Validadores para todos los módulos
- `backend/src/repositories/` — 8 repositories (auth, alumnos, pagos, becas, asistencias, calificaciones, usuarios, grupos)
- `backend/src/services/` — 8 services con lógica de negocio
- `backend/src/controllers/` — 8 controllers (solo HTTP request/response)
- `backend/src/routes/` — 9 archivos de rutas con RBAC aplicado por endpoint

**Infraestructura:**
- `docker-compose.yml` — Configuración para despliegue local

**Documentación:**
- `docs/PROJECT_STRUCTURE.md`
- `docs/CHANGELOG.md` (este archivo)
- `docs/API_DOCUMENTATION.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`

### Motivo
Implementación de la arquitectura base del sistema SAE según el Plan de Implementación oficial.

### Impacto
- Backend completo listo para instalación de dependencias y primer arranque
- Frontend existente preservado completamente (sin modificaciones)
- Base de datos con schema completo listo para migrar y poblar con seed

### Frontend
**INTACTO** — Ningún archivo del frontend fue modificado, movido o recreado.

---
