# 🔬 AUDITORÍA 5 — Estado Post-Auditoría 4 · Análisis de Seguridad y Deuda Técnica
**Colegio San Diego · Fecha:** 2026-05-31 · **Sesión:** Auditoría v5 (Seguridad + Revisión Profunda)

---

## 📊 DASHBOARD DE ESTADO GLOBAL

```
╔════════════════════════════════════════════════════════════════════════╗
║  SAE COLEGIO SAN DIEGO — ESTADO AL 31 MAYO 2026 (Sesión 07)          ║
╠════════════════════════════════════════════════════════════════════════╣
║  🗄️  BD PostgreSQL (Schema + Repos + Seed)  ██████████████████  92%  ║
║  🖥️  Backend API (Servicios + Controllers)  ██████████████████  97%  ║
║  🔐  Auth / JWT / Seguridad                 ████████████████░░  80%  ║ ← baja (vulns críticas)
║  🌐  Frontend (3 paneles integrados)        ██████████████████  95%  ║
║  📶  Red LAN / CORS Dinámico                ███████████████████  95%  ║
║  📦  Offline-First (Vendor CDNs)            ███████████████████  98%  ║
║  🧪  Testing (Vitest — 5 suites / ~35 tests)████████░░░░░░░░░░  36%  ║
║  ⚙️  CI/CD (GitHub Actions)                 █████████████░░░░░  70%  ║
║  🐳  Docker / Infraestructura               ████████████████░░  88%  ║ ← baja (frontend ausente)
║  📄  Documentación                          ████████████░░░░░░  65%  ║
╠════════════════════════════════════════════════════════════════════════╣
║  PROMEDIO GENERAL DEL SISTEMA: ~82%                                   ║
╚════════════════════════════════════════════════════════════════════════╝
```

> **Contexto de esta auditoría:** Revisión profunda de seguridad, correctitud y deuda técnica
> sobre los 76 archivos fuente actuales. Se detectaron 4 vulnerabilidades críticas que reducen
> temporalmente la puntuación de Auth/Seguridad y Docker respecto a AUDITORÍA 4. El sistema
> es funcional pero **NO debe desplegarse en producción** hasta resolver [CRIT-01] y [CRIT-02].

---

## ✅ LO QUE ESTÁ CONSOLIDADO (DESDE AUDITORÍA 4)

| Ítem | Descripción | Estado |
|------|-------------|--------|
| Refresh Token | `POST /auth/refresh` + interceptor proactivo (< 15 min) + reactivo (401) | ✅ |
| Reset Password | `PATCH /auth/usuarios/:id/reset-password` + modal Admin | ✅ |
| Vendor CDNs | `frontend/vendor/`: Alpine, Tailwind, Lucide, jsPDF, fonts.css — 0 CDNs externos | ✅ |
| Dashboard dinámico | Métricas reales: alumnos, deudores, ingresos hoy, becas desde API | ✅ |
| Selects dinámicos | Modal "Asignar Beca" y "Nuevo Alumno" usan `x-for` sobre datos de la API | ✅ |
| Confirmación eliminar | `eliminarUsuario()` con modal Alpine.js antes del borrado | ✅ |
| Locale PostgreSQL | `--lc-collate=C.UTF-8` — búsquedas con ñ/tildes funcionan | ✅ |
| Paginación opt-in | `GET /alumnos?page=N` y `GET /pagos?page=N` backward-compat | ✅ |
| `db-validate.js` | Verifica conexión, versión PG, 33 tablas y seed mínimo | ✅ |
| Promedio calificaciones | `GET /calificaciones/promedio/:alumnoId` por materia y general | ✅ |

---

## ❌ PROBLEMAS ACTIVOS (BUGS / RIESGOS REALES)

---

### 🔴 CRÍTICO 1 — Endpoint `reset-password` sin autorización RBAC

**Archivo:** `backend/src/routes/auth.routes.js` (línea 14)

```js
// ACTUAL — cualquier usuario autenticado puede resetear contraseñas:
router.patch('/usuarios/:id/reset-password', authenticate, authController.resetPassword);
//                                            ^^^^^^^^^^^^ falta authorize('ADMIN')
```

**Impacto:** Cualquier usuario con token válido (incluyendo `GESTOR` y `MAESTRA`) puede llamar a `PATCH /api/v1/auth/usuarios/:id/reset-password` y resetear la contraseña de cualquier otro usuario, incluido el administrador. Es un vector de **escalada de privilegios directa**.

**Fix requerido:**
```js
const { soloAdmin } = require('../middleware/rbac.middleware');
router.patch(
  '/usuarios/:id/reset-password',
  authenticate,
  soloAdmin,          // ← agregar esta línea
  authController.resetPassword
);
```

---

### 🔴 CRÍTICO 2 — Renovación de token sin verificación de firma JWT

**Archivo:** `backend/src/controllers/auth/auth.controller.js` (líneas 52–70)

```js
// ACTUAL — usa jwt.decode() que NO verifica la firma:
const payload = jwtUtils.decodeToken(token);
// ↑ jwt.decode() acepta cualquier payload, sea legítimo o forjado.
// El comentario del código afirma "La verificación de firma siempre se realiza" — es FALSO.
```

**Impacto:** Un atacante puede crear un JWT con `{ id: 1, rol: 'ADMIN', exp: <ahora + 1h> }`, firmarlo con cualquier clave o sin firma, enviarlo a `POST /auth/refresh` y recibir un **token legítimo firmado por el servidor** con rol ADMIN. No requiere conocer la contraseña de ningún usuario.

**Fix requerido:**
```js
// Reemplazar jwtUtils.decodeToken por jwt.verify con ignoreExpiration:
const jwt    = require('jsonwebtoken');
const config = require('../../config/env');

let payload;
try {
  payload = jwt.verify(token, config.jwt.secret, {
    issuer:           'sae-sandiego',
    ignoreExpiration: true, // permite tokens expirados (se chequea manualmente después)
  });
} catch {
  return res.status(401).json({ ok: false, message: 'Token inválido.' });
}
// A partir de aquí, continúa la lógica de ventana de gracia existente...
```

---

### 🔴 CRÍTICO 3 — Archivo `.env` de desarrollo trackeado en Git

**Archivo:** `backend/.env`

```bash
# Verificación (confirma el problema):
git ls-files backend/.env
# → backend/.env   ← está en el índice de git
```

**Causa:** El archivo `.env` fue agregado al repositorio antes de que la regla en `.gitignore` entrara en efecto. Aunque `.gitignore` lo lista correctamente, git lo sigue rastreando porque ya fue committed.

**Impacto:** Cualquier persona con acceso al repositorio puede ver la `DATABASE_URL`, IPs de la LAN interna (`CORS_ORIGIN=...192.168.1.10...`), y cualquier otro secreto que se haya agregado al archivo.

**Fix requerido:**
```bash
# 1. Sacar el .env del tracking sin borrarlo del disco
git rm --cached backend/.env

# 2. Confirmar el cambio
git commit -m "fix: remover backend/.env del tracking de git"

# 3. Regenerar JWT_SECRET si alguna vez se incluyó en el archivo
openssl rand -base64 32
```

---

### 🔴 CRÍTICO 4 — Frontend no existe en la imagen Docker (sistema inutilizable en producción)

**Archivos:** `backend/src/app.js` (línea 95) · `docker-compose.yml` (línea 38)

```js
// app.js — línea 95
const frontendPath = path.resolve(__dirname, '..', '..', 'frontend');
// En desarrollo WSL: /workspace/backend/src/../../frontend = /workspace/frontend  ✅
// En Docker:        /app/src/../../frontend              = /frontend              ❌ NO EXISTE
```

```yaml
# docker-compose.yml
backend:
  build:
    context: ./backend   # ← solo copia el directorio backend/
                         #   el directorio frontend/ nunca entra al contenedor
```

**Impacto:** Con `docker compose up`, todos los paneles HTML responden `404`. Los usuarios de la LAN no pueden acceder a ningún panel. El sistema es completamente inutilizable en el entorno de despliegue Docker.

**Fix requerido (opción más rápida):** Agregar un volumen en `docker-compose.yml`:
```yaml
backend:
  # ...
  volumes:
    - ./frontend:/app/frontend   # ← monta el frontend en la ruta que calcula app.js
    - sae_backups:/app/backups
```

---

### 🟠 ALTO 1 — Log de inicio del servidor dice "SQLite" (motor actual: PostgreSQL)

**Archivo:** `backend/src/server.js` (línea 14)

```js
// ACTUAL — mensaje incorrecto:
console.log('[DB] Conexión a SQLite establecida correctamente.');

// CORRECTO:
console.log('[DB] Conexión a PostgreSQL establecida correctamente.');
```

**Impacto:** Confusión operacional. Cualquier persona monitoreando los logs en producción ve "SQLite" al iniciar el servidor. Indica que el mensaje quedó sin actualizar después de la migración a PostgreSQL (AUDITORÍA 3).

---

### 🟠 ALTO 2 — `GET /auth/me` no verifica si el usuario sigue activo en la BD

**Archivo:** `backend/src/controllers/auth/auth.controller.js` (líneas 34–36)

```js
// ACTUAL — devuelve el payload del JWT sin consultar la BD:
async function me(req, res) {
  return success(res, req.usuario, 'Perfil de usuario.');
}
```

**Impacto:** Un usuario desactivado o marcado con `eliminadoEn` mantiene acceso completo al sistema durante hasta 8 horas (la vida del JWT). El administrador no puede revocar una sesión activa de forma inmediata.

**Fix requerido:**
```js
async function me(req, res, next) {
  try {
    const prisma = require('../../config/database');
    const usuario = await prisma.usuario.findFirst({
      where: { usuarioId: req.usuario.id, activo: true, eliminadoEn: null },
      select: { usuarioId: true, nombreCompleto: true, nombreUsuario: true },
    });
    if (!usuario) {
      return res.status(401).json({ ok: false, message: 'Cuenta inactiva o eliminada.' });
    }
    return success(res, req.usuario, 'Perfil de usuario.');
  } catch (err) { next(err); }
}
```

---

### 🟠 ALTO 3 — Dockerfile ejecuta el proceso Node.js como `root`

**Archivo:** `backend/Dockerfile`

```dockerfile
# ACTUAL — sin instrucción USER, corre como root:
CMD ["node", "src/server.js"]

# CORRECTO — agregar antes del CMD:
RUN chown -R node:node /app
USER node
CMD ["node", "src/server.js"]
```

**Impacto:** Si existe una vulnerabilidad RCE en cualquier dependencia npm, el atacante obtiene acceso root al contenedor. Viola el principio de mínimo privilegio y las guías de seguridad de contenedores Docker.

---

### 🟠 ALTO 4 — `montoCapital` puede ser negativo al registrar un pago

**Archivo:** `backend/src/repositories/pagos/pagos.repository.js` (línea 148)

```js
// ACTUAL — sin validación de límite inferior:
const montoCapital = tieneRecargo ? (monto - (montoRecargo ?? 0)) : monto;
// Si montoRecargo > monto → montoCapital resulta negativo
```

**Escenario de fallo:** Pago de $100 con recargo de $400 (valor configurado en `configuracion_sistema`) → `montoCapital = -300` → se crea `aplicacion_pago` con `montoAplicado: -300` → el saldo del `calendario_pago` queda corrompido.

**Fix requerido:**
```js
// En el repositorio:
const montoCapital = Math.max(0, tieneRecargo ? (monto - (montoRecargo ?? 0)) : monto);

// En el servicio (validación previa al persistir):
if (tieneRecargo && datos.monto < recargo) {
  throw Object.assign(
    new Error(`El monto del pago ($${datos.monto}) no puede ser menor al recargo ($${recargo}).`),
    { statusCode: 422 }
  );
}
```

---

## ⚠️ DEUDAS TÉCNICAS PENDIENTES (NO BLOQUEAN OPERACIÓN)

---

### 🟡 MEDIO 1 — Race condition al crear períodos de evaluación automáticamente

**Archivo:** `backend/src/repositories/calificaciones/calificaciones.repository.js` (líneas 72–98)

```js
// ACTUAL — findFirst + create sin transacción ni upsert:
const periodoReg = await prisma.periodoEvaluacion.findFirst({ where: {...} });
if (!periodoReg) {
  // ← Dos requests simultáneas llegan aquí al mismo tiempo
  const nuevoPeriodo = await prisma.periodoEvaluacion.create({ data: {...} });
  // → Una viola la restricción @@unique y retorna error 500
}
```

**Fix recomendado:** Capturar `P2002` y reintentar la búsqueda:
```js
try {
  return (await prisma.periodoEvaluacion.create({ data: {...} })).periodoId;
} catch (e) {
  if (e.code === 'P2002') {
    const existing = await prisma.periodoEvaluacion.findFirst({ where: {...} });
    return existing?.periodoId ?? null;
  }
  throw e;
}
```

---

### 🟡 MEDIO 2 — No se valida el campo `metodoPago` en los pagos

**Archivo:** `backend/src/utils/validators/pagos.validator.js`

```js
// ACTUAL — metodoPago no tiene validación:
const crearPagoValidators = [
  body('alumnoId').isInt({ min: 1 })...,
  body('concepto').isIn(CONCEPTOS_PAGO_VALIDOS)...,
  body('monto').isFloat({ min: 0.01 })...,
  body('fecha').isISO8601()...,
  // ← metodoPago: no existe → acepta cualquier string o null
];

// FIX:
body('metodoPago')
  .optional()
  .isIn(['efectivo', 'transferencia', 'tarjeta', 'cheque'])
  .withMessage('Método de pago inválido.'),
```

---

### 🟡 MEDIO 3 — `calcularPromedio` carga todas las calificaciones históricas en memoria

**Archivo:** `backend/src/services/calificaciones/calificaciones.service.js` (líneas 62–65)

```js
// ACTUAL — sin filtro de cuentaParaPromedio en la query:
const todasLasCalificaciones = await calificacionesRepository.findAll(filtros);
// Luego filtra en JS:
const validas = calificaciones.filter(
  (c) => c.cuentaParaPromedio !== false && c.valor !== null ...
);
```

Con 3 ciclos × 3 trimestres × 10 materias = 90+ registros por alumno cargados en RAM para luego descartar la mayoría. **Fix:** pasar `cuentaParaPromedio: true` directamente al `where` de Prisma en el repositorio.

---

### 🟡 MEDIO 4 — Sin manejo de `unhandledRejection` en el proceso servidor

**Archivo:** `backend/src/server.js`

```js
// ACTUAL — solo maneja señales del SO:
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
// ← falta unhandledRejection — puede terminar el proceso en Node.js moderno

// FIX — agregar después de los handlers existentes:
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  // Aquí: notificar al admin o iniciar cierre graceful
});
```

---

### 🟡 MEDIO 5 — Sin `.dockerignore` — archivos innecesarios entran a la imagen

**Archivo:** `backend/` (no existe `.dockerignore`)

`COPY . .` en el Dockerfile copia todo el contexto `./backend`, incluyendo `prisma/sae.db`, cobertura de tests, logs y archivos `__tests__`. Solución: crear `backend/.dockerignore`:
```
node_modules
.env
prisma/sae.db
prisma/sae.db-journal
coverage
*.log
src/__tests__
```

---

### 🟢 LEVE 1 — Contador de deudores hardcodeado en el sidebar del Admin Panel

**Archivo:** `frontend/admin_panel.html` (sidebar)

```html
<!-- ACTUAL — número fijo independiente de los datos reales: -->
<span class="... bg-crimson-500 text-white ...">7</span>

<!-- FIX — enlazar al conteo real que ya carga el dashboard: -->
<span ... x-text="deudores.length" x-show="deudores.length > 0"></span>
```

---

### 🟢 LEVE 2 — Comentarios residuales de SQLite en el código fuente

**Archivos afectados:**

| Archivo | Comentario anacrónico |
|---------|-----------------------|
| `backend/src/config/database.js` | _"Compatible con SQLite (inicial) y PostgreSQL (migración futura)"_ |
| `backend/src/server.js` | Log `[DB] Conexión a SQLite...` (ver también ALTO 1) |
| Múltiples repositorios | Referencias a _"Cambios PostgreSQL:"_ ya no son "cambios", son el estado actual |

---

### 🟢 LEVE 3 — Admin puede degradar su propio rol sin restricción

**Archivo:** `backend/src/services/usuarios/usuarios.service.js` (función `actualizar`)

Un ADMIN puede enviar `PUT /api/v1/usuarios/:id` con `{ rol: 'MAESTRA' }` apuntando a su propio ID, cambiando su rol y perdiendo acceso de administrador. Si es el único ADMIN del sistema, queda bloqueado permanentemente.

**Fix:** En el controller, verificar `req.usuario.id !== Number(req.params.id)` cuando `datos.rol` está presente.

---

### 🟢 LEVE 4 — `.env.example` con contraseña de ejemplo que podría usarse en producción

**Archivo:** `backend/.env.example`

```bash
POSTGRES_PASSWORD=SaeColegio2026   # ← contraseña de ejemplo obvia
```

Si el operador no cambia este valor al configurar producción, la BD queda con credenciales predecibles. **Fix:** Cambiar a `POSTGRES_PASSWORD=<CAMBIAR_ANTES_DE_PRODUCCION>`.

---

## 📊 CHECKLIST COMPLETO POR MÓDULO

### 🗄️ BASE DE DATOS — 92% *(sin cambios respecto a Auditoría 4)*

- [x] Schema Prisma v6 — 33 modelos con `@map()` snake_case exacto al SQL real
- [x] Soft delete vía `eliminadoEn TIMESTAMPTZ` en todos los modelos relevantes
- [x] Roles N:M: tabla `usuario_rol` con `activo` y `eliminadoEn`
- [x] `@@unique([alumnoId, grupoMateriaId, periodoId])` en `Calificacion`
- [x] `@@unique([alumnoId, cicloId])` en `InscripcionCiclo`
- [x] Tipos PostgreSQL: `@db.Timestamptz()`, `@db.Decimal(12,2)`, `@db.VarChar(n)`, `@db.Date`
- [x] `migration_lock.toml` en `postgresql`
- [x] Baseline migration `20260527000001_init_postgresql`
- [x] Init-db: 5 scripts SQL (`01_esquema_base` → `05_datos_prueba`)
- [x] Locale `--lc-collate=C.UTF-8` — búsquedas con ñ/tildes correctas
- [x] `scripts/db-validate.js` — verifica conexión, PG ≥ 14, 33 tablas, seed mínimo
- [x] `scripts/db-backup.js` — pg_dump con timestamp, retención 10 backups
- [x] `scripts/db-restore.js` — requiere confirmación explícita `CONFIRMAR`
- [x] `scripts/db-reset.js` — bloqueado en producción
- [ ] `docs/DATABASE.md` desactualizada (describe 12 modelos SQLite, no 33 PostgreSQL)

---

### 🖥️ BACKEND API — 97% *(sin cambios operativos, baja por CRIT-01 y CRIT-02)*

- [x] Express 4.x con arquitectura 4 capas: route → controller → service → repository
- [x] Helmet (CSP desactivado para frontend estático)
- [x] Rate limiter global: 100 req / 15 min
- [x] Rate limiter auth estricto: 10 req / 15 min
- [x] `GET /config.js` — auto-detecta IP LAN + `VERSION: '2.0.0'`
- [x] `GET /health` — health check con info de entorno
- [x] `express.static()` sirviendo frontend desde `../../frontend` (solo en desarrollo)
- [x] Middleware de error global (Prisma P2002/P2025, VALIDATION_ERROR, 500)
- [x] Graceful shutdown: SIGINT/SIGTERM + `prisma.$disconnect()`
- [x] Rutas limpias: `/admin`, `/gestor`, `/maestra`
- [x] **Auth** — login con lockout, registro de intentos, IP tracking
- [x] **Auth** — `POST /auth/refresh` renovación silenciosa (ventana 2h)
- [x] **Auth** — `PATCH /auth/usuarios/:id/reset-password` *(vulnerable — ver CRIT-01)*
- [x] **Alumnos** — CRUD + soft delete + búsqueda `?q=` + filtro nivel/grupo
- [x] **Alumnos** — `GET /alumnos?page=N&limit=M` paginación opt-in
- [x] **Grupos** — CRUD + materias dinámicas + count de alumnos
- [x] **Pagos** — registro + recargo automático + `/pagos/calendario` + `/pagos/total/:alumnoId`
- [x] **Pagos** — `GET /pagos?page=N&limit=M` paginación opt-in
- [x] **Becas** — RF-21: solicitar (GESTOR) + resolver (ADMIN) + `asignacion_beca` automática
- [x] **Calificaciones** — guardar individual + lote + resolución automática de período
- [x] **Calificaciones** — `GET /calificaciones/promedio/:alumnoId` promedio por materia
- [x] **Usuarios** — CRUD + roles N:M + soft delete
- [ ] `montoCapital` puede ser negativo en `pagos.repository.js` *(ver ALTO 4)*

---

### 🔐 AUTENTICACIÓN / SEGURIDAD — 80% *(bajó desde 98% por CRIT-01 y CRIT-02)*

- [x] JWT firmado con `issuer: 'sae-sandiego'`, expira en 8h configurable
- [x] `verifyToken()` devuelve `{ valid, payload, error }` — no lanza excepciones
- [x] `authenticate` middleware diferencia `TokenExpiredError` de token inválido
- [x] RBAC por rol con `authorize()` en todas las rutas *(excepto reset-password — CRIT-01)*
- [x] bcryptjs hash de contraseñas (10 rounds en prod, configurable via env)
- [x] Bloqueo por intentos: `intentosFallidos` + `bloqueadoHasta` en `usuario`
- [x] Registro de intentos en `intento_login` (exitoso/fallido + IP + userAgent)
- [x] Rate limiter estricto en `/api/v1/auth` (10 req / 15 min)
- [x] `limpiarFallos()` al login exitoso
- [x] Configuración de lockout leída de `configuracion_sistema` (configurable sin deploy)
- [x] Refresh Token — `POST /auth/refresh` con ventana de gracia 2h
- [x] Interceptor proactivo en `api.js` — renueva si quedan < 15 min
- [x] Interceptor reactivo en `api.js` — reintenta en 401, semáforo anti-bucle
- [x] Reset Password por Admin + flag `debeCambiarPwd=true`
- [ ] **`POST /auth/refresh` sin verificación de firma JWT** *(CRIT-02 — URGENTE)*
- [ ] **`PATCH reset-password` sin `authorize('ADMIN')`** *(CRIT-01 — URGENTE)*
- [ ] **`GET /auth/me` no verifica estado del usuario en BD** *(ALTO 2)*
- [ ] HTTPS/TLS — HTTP plano (decisión de diseño documentada para LAN privada)

---

### 📶 RED LAN / CORS DINÁMICO — 95% *(sin cambios)*

- [x] Servidor escucha en `HOST=0.0.0.0`
- [x] `GET /config.js` inyecta IP LAN automáticamente al cliente
- [x] CORS acepta cualquier origen de la subred `/24` (auto-detección de interfaces)
- [x] CORS acepta orígenes explícitos del `.env` (CORS_ORIGIN)
- [x] CORS acepta peticiones sin `origin` (curl, Postman, SSR)
- [x] Frontend carga `/config.js` antes de `api.js` en los 3 paneles
- [x] `api.js` usa `window.SAE_CONFIG.API_BASE` — nunca localhost hardcodeado
- [ ] HTTPS/TLS — HTTP plano (documentado como decisión de diseño para LAN privada)

---

### 🌐 FRONTEND — 95% *(sin cambios operativos)*

- [x] `auth-guard.js` — verifica JWT antes de mostrar panel, redirect a login si inválido
- [x] `api.js` — cliente centralizado con auto-inyección de Bearer token
- [x] Refresh proactivo + reactivo con semáforo anti-bucle
- [x] 401 → `clearSession()` + redirect a login automático
- [x] Error de red → `{ ok: false, offline: true }` — no rompe la UI
- [x] Toast JS dinámico en todos los paneles (sin `alert()`)
- [x] Panel Admin — CRUD alumnos, pagos, calificaciones, becas, usuarios, grupos
- [x] Panel Gestor — Alumnos, pagos, becas RF-21 (solo solicitar), calificaciones
- [x] Panel Maestra — Alumnos, grupos, calificaciones por lote
- [x] `eliminarUsuario()` — modal Alpine.js de confirmación
- [x] Modal "Asignar Beca" — `x-for` dinámico sobre `listaAlumnos`
- [x] Modal "Nuevo Alumno" — `x-for` dinámico sobre `gruposData`
- [x] Dashboard con métricas reales desde API
- [x] 0 CDNs externos — `frontend/vendor/` con 5 archivos locales
- [ ] Badge "7" hardcodeado en sidebar de Deudores *(ver LEVE 1)*
- [ ] Sin paginación en el frontend (`?page=` implementado en API pero no en paneles)
- [ ] Sin banner de estado offline visible al usuario

---

### 🐳 DOCKER / INFRAESTRUCTURA — 88% *(bajó desde 96% por CRIT-04 y ALTO 3)*

- [x] `docker-compose.yml` con PostgreSQL 16-alpine + backend Node.js
- [x] `postgres_sae` con healthcheck (`pg_isready`)
- [x] Backend `depends_on: postgres_sae: condition: service_healthy`
- [x] Init-db scripts montados en `/docker-entrypoint-initdb.d`
- [x] Volúmenes persistentes: `postgres_data` + `sae_backups`
- [x] Red interna `sae-network` (backend y postgres aislados)
- [x] Memory limit: 512M para PostgreSQL
- [x] Healthcheck del backend: `wget` a `/health`
- [x] `postgresql-client` en Dockerfile (necesario para `pg_dump` en scripts)
- [x] Locale PostgreSQL corregido: `--lc-collate=C.UTF-8 --lc-ctype=C.UTF-8`
- [ ] **Frontend no existe en la imagen Docker** *(CRIT-04 — sistema inutilizable en Docker)*
- [ ] **Proceso Node.js corre como `root`** *(ALTO 3)*
- [ ] Sin `.dockerignore` — archivos innecesarios en la imagen *(MEDIO 5)*

---

### 🧪 TESTING — 36% *(sin cambios)*

- [x] Vitest instalado y configurado (CJS — `module.exports`)
- [x] `auth.service.test.js` — 12 tests: login, 401, 423 bloqueo, roles, limpiarFallos
- [x] `hash.utils.test.js` — 6 tests: hashPassword, comparePassword, salt único
- [x] `pagos.recargo.test.js` — 8 tests: regla día 5, concepto, diaLimitePago individual
- [x] `becas.rf21.test.js` — 6 tests: solicitar, porcentajes, resolver, 409 duplicado
- [x] `jwt.utils.test.js` — 5 tests: generación, verificación, tokens inválidos
- [x] Mocks con `vi.spyOn()` — sin BD real en tests unitarios
- [ ] Tests de `calificaciones.service.js` — `calcularPromedio`, guardar lote, período automático
- [ ] Tests de `alumnos.service.js` — matrícula única, paginación, búsqueda
- [ ] Tests de `grupos.service.js` y `usuarios.service.js`
- [ ] Tests del middleware `rbac.middleware.js` y `auth.middleware.js`
- [ ] Tests de integración HTTP (Supertest) — endpoints con BD real
- [ ] Cobertura estimada: **~25%** sobre servicios totales

---

### ⚙️ CI/CD — 70% *(sin cambios)*

- [x] `.github/workflows/ci.yml` con jobs: `lint-and-test` + `docker-build`
- [x] PostgreSQL como service en GitHub Actions
- [x] Aplica init-db SQL, baseline Prisma, seed y tests
- [x] Smoke test: `docker compose up` → `curl /health`
- [x] `.eslintrc.cjs` — reglas ESLint 9.x CommonJS
- [x] `.prettierrc` + `.prettierignore`
- [ ] ESLint en CI con `continue-on-error: true` — fallos de lint no bloquean el pipeline
- [ ] Sin deploy automático (correcto para LAN local — deploy manual por diseño)

---

### 📄 DOCUMENTACIÓN — 65% *(sin cambios)*

| Doc | Estado | Problema |
|-----|--------|---------|
| `README.md` | ✅ Actualizado | Guía completa de instalación y deploy |
| `docs/API_DOCUMENTATION.md` | ⚠️ Parcial | Nuevos endpoints incluidos; tipos de campos desactualizados |
| `docs/CHANGELOG.md` | ⚠️ Parcial | Sin entrada para sesiones 06/07 |
| `docs/DB_MIGRATION_ANALYSIS.md` | ✅ Completo | Análisis SQLite → PostgreSQL |
| `docs/DATABASE.md` | ❌ Obsoleto | Describe 12 modelos SQLite — el sistema tiene 33 modelos PostgreSQL |
| `docs/ARCHITECTURE.md` | ❌ Obsoleto | Menciona SQLite como motor activo |
| `docs/PROJECT_STRUCTURE.md` | ❌ Obsoleto | No incluye `scripts/`, `.github/`, `vendor/`, `src/__tests__/` |
| Manual de usuario | ❌ No existe | Sin guía para admin/gestor/maestra |

---

## 🎯 RESUMEN EJECUTIVO

### ¿Qué funciona hoy en producción? *(al 31 Mayo 2026)*

El sistema es **funcionalmente completo** en desarrollo local (WSL). Todas las reglas de negocio críticas operan correctamente:

1. ✅ Login con bloqueo por intentos, IP tracking y auditoría completa
2. ✅ Refresh Token silencioso — sesiones sin interrupción durante el turno escolar
3. ✅ CRUD completo: alumnos, pagos, calificaciones, becas, usuarios, grupos
4. ✅ Dashboard con métricas reales desde la API
5. ✅ 3 paneles 100% offline (0 CDNs externos)
6. ✅ Recargo automático de colegiatura configurable desde BD
7. ✅ Flujo RF-21 becas: GESTOR solicita → ADMIN aprueba → `asignacion_beca` automática
8. ✅ CORS LAN dinámico — nodos satélite se conectan sin configuración manual

### Pendientes para 100% producción

| # | Tarea | Impacto | Esfuerzo | Prioridad |
|---|-------|---------|----------|-----------|
| 1 | `authorize('ADMIN')` en ruta `reset-password` | 🔴 Seguridad crítica | 5 min | **HOY** |
| 2 | `jwt.verify(ignoreExpiration)` en `POST /refresh` | 🔴 Seguridad crítica | 15 min | **HOY** |
| 3 | `git rm --cached backend/.env` + regenerar secretos | 🔴 Exposición de datos | 10 min | **HOY** |
| 4 | Volumen `./frontend:/app/frontend` en docker-compose | 🔴 Sistema inutilizable en Docker | 10 min | **HOY** |
| 5 | Log "SQLite" → "PostgreSQL" en `server.js` | 🟠 Operacional | 2 min | Esta semana |
| 6 | `GET /auth/me` verificar estado en BD | 🟠 Seguridad | 20 min | Esta semana |
| 7 | `USER node` en Dockerfile | 🟠 Seguridad contenedores | 5 min | Esta semana |
| 8 | Validar `montoCapital >= 0` en pagos | 🟠 Integridad de datos | 10 min | Esta semana |
| 9 | Actualizar docs/ (DATABASE.md, ARCHITECTURE.md) | 📄 Onboarding | 2-3h | Próxima semana |
| 10 | Tests de `calificaciones.service.js` | 🧪 Cobertura | 2-3h | Próxima semana |

---

## 📈 EVOLUCIÓN HISTÓRICA

| Módulo | Audit. 1 | Audit. 2 | Audit. 3 | Audit. 4 | **Audit. 5** |
|--------|----------|----------|----------|----------|--------------|
| BD/Schema | ~60% | ~75% | 88% | 92% | **92%** |
| Backend API | ~70% | ~80% | 90% | 98% | **97%** ↓ *(CRIT-01, ALTO-4)* |
| Auth/Seguridad | ~60% | ~75% | 88% | 98% | **80%** ⬇️ *(CRIT-01, CRIT-02, ALTO-02)* |
| Frontend | ~50% | ~65% | 75% | 95% | **95%** |
| Red LAN/CORS | ~50% | ~80% | 95% | 95% | **95%** |
| Offline/Vendor | 0% | 10% | 20% | 98% | **98%** |
| Testing | 0% | 10% | 40% | 60% | **36%** ↓ *(rebase a módulos totales)* |
| CI/CD | 0% | 30% | 70% | 70% | **70%** |
| Docker/Infra | ~40% | ~70% | 85% | 96% | **88%** ⬇️ *(CRIT-04, ALTO-03)* |
| Documentación | ~30% | ~50% | 65% | 65% | **65%** |
| **PROMEDIO** | **~46%** | **~65%** | **~82%** | **~87%** | **~82%** ⬇️ |

> **Nota sobre el descenso:** El promedio baja de 87% a 82% no porque el sistema haya empeorado,
> sino porque esta auditoría realizó un análisis de seguridad más profundo que reveló vulnerabilidades
> que estaban presentes pero no habían sido detectadas. Corregir [CRIT-01] a [CRIT-04] + [ALTO-01]
> a [ALTO-03] llevaría el promedio a **~90%**.

---

## 📌 DECISIONES DE DISEÑO DOCUMENTADAS

| Decisión | Justificación |
|----------|---------------|
| HTTP plano (sin TLS) | LAN privada del colegio — tráfico nunca sale a internet |
| Sin enums Prisma | Compatibilidad via `constants.js` — migración futura sin cambios de código |
| Docker init SQL para schema | SQL versionado como fuente de verdad; Prisma solo orquesta |
| Baseline migration vacía | Schema existe vía Docker; se marca como aplicado manualmente |
| CJS todo el backend | Consistencia — sin mezcla ESM/CJS; `vitest.config.js` en CJS (`module.exports`) |
| `configuracion_sistema` global | `cicloId: null` para parámetros del sistema; específicos con `cicloId` |
| `vi.spyOn()` en lugar de `vi.mock()` | Compatibilidad total con módulos CJS que no destructuran sus imports |
| `BCRYPT_ROUNDS=1` en tests | Acelera tests de hash sin comprometer la seguridad del entorno productivo |
| JWT en `localStorage` (no httpOnly cookie) | Sistema LAN offline sin riesgo XSS relevante; vendors locales sin CDN externo |

---

*Generado por auditoría automática — SAE v2.0.0 · PostgreSQL 16 · Prisma 5.x · Vitest 2.x*
*Próxima auditoría recomendada: después de corregir los 4 hallazgos críticos y los 4 de alta prioridad*
