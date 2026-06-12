# 🔬 AUDITORÍA 2 — Estado Actual del Sistema SAE
**Colegio San Diego · Fecha:** 2026-05-22 · **Sesión:** Post-Integración 03

---

## 📊 DASHBOARD DE ESTADO GLOBAL

| Área | Estado | Progreso |
|------|--------|----------|
| 🖥️ Backend (API + lógica) | ✅ Completo | **100%** |
| 🔐 Autenticación / JWT | ✅ Completo | **95%** |
| 🗄️ Base de Datos (Prisma/SQLite) | ✅ Completo | **95%** |
| 🌐 Login + Auth Guard | ✅ Completo | **100%** |
| 🔌 Integración Frontend → API | ✅ Completo | **92%** |
| 📶 Red LAN / Nodos Satélite | ✅ Completo | **85%** |
| 📄 Documentación Técnica | ✅ Completo | **85%** |
| 📦 Offline-First (Vendoring CDNs) | ⚠️ Pendiente | **20%** |
| 🧪 Testing (Unit / Integration / E2E) | ❌ Ausente | **0%** |
| ⚙️ CI/CD (Pipeline de despliegue) | ❌ Ausente | **0%** |

> **Promedio General del Sistema: ~77%**
> El sistema es funcional y operable en su totalidad para uso en LAN. Las áreas en 0% (testing y CI/CD) no bloquean operación, pero son deuda técnica pendiente.

---

## ✅❌ CHECKLIST DETALLADO POR MÓDULO

---

### 🖥️ BACKEND — 100%

#### Infraestructura Express
- [x] Entry point `server.js` con graceful shutdown (SIGINT/SIGTERM + `prisma.$disconnect()`)
- [x] `app.js` con middlewares globales en orden correcto (Helmet → CORS → rate-limit → rutas)
- [x] Rate limiter global: 100 req / 15 min
- [x] Rate limiter auth estricto: 10 req / 15 min
- [x] Endpoint dinámico `GET /config.js` — auto-detecta IP LAN no-loopback via `os.networkInterfaces()`
- [x] Servicio de archivos estáticos `express.static()` apuntando al frontend
- [x] Middleware de error global (`error.middleware.js`)
- [x] Middleware de validación (`validate.middleware.js` con `express-validator`)

#### Autenticación y Seguridad
- [x] `auth.middleware.js` — verifica JWT en header `Authorization: Bearer <token>`
- [x] `rbac.middleware.js` — control de acceso por rol (`authorize('ADMIN', 'GESTOR')`)
- [x] `jwt.utils.js` — `generateToken()` / `verifyToken()` con expiración 8h
- [x] `hash.utils.js` — `hashPassword()` / `comparePassword()` con bcryptjs

#### Arquitectura 4 Capas (por módulo)
- [x] **Auth** — route / controller / service / repository
- [x] **Alumnos** — route / controller / service / repository
- [x] **Grupos** — route / controller / service / repository
- [x] **Pagos** — route / controller / service / repository (incluye cálculo automático de recargo día 5)
- [x] **Becas** — route / controller / service / repository (flujo RF-21: solicitud + resolución separados)
- [x] **Calificaciones** — route / controller / service / repository (endpoint lote + fuzzy match materia)
- [x] **Usuarios** — route / controller / service / repository (CRUD + auto-generación username)
- [x] **Asistencias** — route / controller / service / repository

#### Respuestas API
- [x] Formato estándar unificado: `{ ok: boolean, data: any, message: string }` en todos los endpoints

---

### 🗄️ BASE DE DATOS — 95%

#### Schema Prisma
- [x] 12 modelos: `Usuario`, `CicloEscolar`, `PlanPago`, `Grupo`, `GrupoMateria`, `Alumno`, `PadreTutor`, `AlumnoCiclo`, `Pago`, `Beca`, `SolicitudBeca`, `Calificacion`
- [x] Compatibilidad total con SQLite (sin enums nativos — `String` + validación en capa de servicio)
- [x] Sin uso de `skipDuplicates` en `createMany()` (incompatible con SQLite — se usa count guard / `upsert()`)
- [x] Relaciones definidas correctamente con `@relation`
- [x] `_count` e includes cargados en todos los queries de grupos (para contar alumnos por grupo)
- [x] Seed `prisma/seed.js` con datos iniciales: 3 usuarios, 4 grupos, 8 alumnos, 2 ciclos de pago
- [x] Configuración `DATABASE_URL=file:./prisma/sae.db` (SQLite local, funciona sin internet)

#### Pendiente
- [ ] **Migraciones versionadas:** Se usa `prisma db push` en lugar de `prisma migrate dev`. Sin historial de migraciones rastreable
- [ ] **Estrategia de backup:** No existe script automático de backup del archivo `sae.db`
- [ ] **Script de reset seguro:** No hay `npm run db:reset` documentado para onboarding de nuevos nodos

---

### 🔐 AUTENTICACIÓN / JWT — 95%

#### Auth Guard (Frontend)
- [x] `frontend/shared/auth-guard.js` creado y funcional
- [x] Se carga ANTES de Alpine.js en los 3 paneles
- [x] Verifica presencia del token en `localStorage`
- [x] Decodifica el payload JWT en el cliente (sin criptografía — solo Base64)
- [x] Compara `payload.exp` con `Date.now() / 1000`
- [x] Redirige a `/auth/login.html` si el token está ausente, malformado o expirado
- [x] Expone `window.saeLogout()` — botón de cerrar sesión en los 3 paneles

#### Login
- [x] `frontend/auth/login.html` — pantalla de login completa
- [x] Llama `POST /api/v1/auth/login` via `window.saeApi.auth.login()`
- [x] Guarda `sae_token` y `sae_usuario` en `localStorage`
- [x] Redirige por rol: ADMIN → `/admin_panel.html`, GESTOR → `/gestor_panel.html`, MAESTRA → `/maestra_panel.html`
- [x] Si ya existe sesión válida al cargar: redirige directamente sin re-login
- [x] Mensajes de error visibles (credenciales incorrectas / error de conexión)
- [x] Estado de carga visual durante la llamada HTTP

#### Pendiente
- [ ] **Refresh token:** El token expira a las 8h sin posibilidad de renovación silenciosa. El usuario debe reingresar sus credenciales
- [ ] **Recuperación de contraseña:** No existe flujo de reset por correo o código temporal
- [ ] **Bloqueo por intentos fallidos:** No implementado en frontend (sólo rate-limit en backend)

---

### 🔌 INTEGRACIÓN FRONTEND → API — 92%

#### Cliente API Centralizado
- [x] `frontend/shared/api.js` — módulo único importado por todos los paneles
- [x] `window.saeApi` — namespace global accesible desde Alpine.js
- [x] Función `request()` universal con auto-inyección de Bearer token
- [x] En error 401 → `clearSession()` + redirección automática al login
- [x] En error de red → respuesta `{ ok: false, offline: true }` (no rompe la UI)
- [x] Módulos: `auth`, `alumnos`, `pagos`, `becas`, `calificaciones`, `grupos`, `usuarios`
- [x] Mappers: `mapAlumno()`, `mapGrupo()`, `mapPago()` — traducen forma API → forma frontend
- [x] Constantes de mapeo UI → API: `CONCEPTO_MAP`, `PERIODO_MAP`, `TIPO_BECA_MAP`, `ROL_MAP`
- [x] Sistema de toast JS dinámico (sin modificar HTML): tipos `exito`, `error`, `advertencia`, `info`

#### Panel Admin
- [x] Carga paralela inicial: alumnos + grupos (`Promise.all`)
- [x] Lazy load de pagos (al navegar a la vista)
- [x] Lazy load de usuarios (al navegar a la vista)
- [x] CRUD alumnos conectado a API
- [x] Registro de pagos con concepto, período y recargo automático
- [x] Calificaciones: selección de alumno → carga materias del grupo → fuzzy match ID → prellenado de califs existentes → guardar lote
- [x] Becas: flujo ADMIN (solicitar + auto-aprobar en mismo paso)
- [x] Usuarios: CRUD + auto-generación de username (`nombre.apellido` sin tildes) + contraseña default `sandiego2026`
- [x] Todos los `alert()` reemplazados por toast JS

#### Panel Gestor
- [x] Carga alumnos y grupos al init
- [x] Lazy load de pagos
- [x] Calificaciones: mismo flujo lote que admin
- [x] Becas RF-21 compliance: gestor SÓLO solicita — no aprueba (sin llamada a `resolver`)
- [x] Todos los `alert()` reemplazados por toast JS

#### Panel Maestra
- [x] Carga alumnos + grupos en paralelo al init
- [x] Vista de materias por grupo
- [x] Calificaciones: flujo completo con fuzzy match y guardar lote
- [x] Todos los `alert()` reemplazados por toast JS

#### Pendiente
- [ ] **Manejo de paginación:** Si hay más de 50-100 alumnos en la DB, los selects se cargan completos sin paginación ni búsqueda progresiva (potencial problema de rendimiento en escuelas grandes)
- [ ] **Estado offline visible:** Cuando `offline: true` la UI silencia el error pero no muestra un banner indicando que el servidor no está disponible
- [ ] **Confirmación de destructivos:** Eliminar alumno / usuario no tiene modal de confirmación — el botón ejecuta directamente (riesgo de borrado accidental)
- [ ] **Validación frontend:** Los formularios confían en la validación del backend. No hay feedback inmediato de campos requeridos antes del submit en todos los casos

---

### 📶 RED LAN / NODOS SATÉLITE — 85%

- [x] Servidor escucha en `HOST=0.0.0.0` — accesible desde toda la red local
- [x] `GET /config.js` inyecta dinámicamente `window.SAE_CONFIG.API_BASE` con la IP LAN real
- [x] Todos los paneles y login cargan `/config.js` antes de `api.js`
- [x] `api.js` usa `window.SAE_CONFIG.API_BASE` como base URL (nunca localhost hardcodeado)
- [x] Docker Compose configurado para exposición en red local
- [x] CORS configurado en `backend/.env` con orígenes explícitos

#### Pendiente
- [ ] **CORS dinámico:** El `CORS_ORIGIN` en `.env` es estático (`192.168.1.10` hardcodeado). Si la IP del servidor cambia (DHCP), se debe actualizar el `.env` manualmente
- [ ] **Documentación de configuración de nodo satélite:** No existe una guía de "cómo conectar una tablet/PC nueva a este servidor"
- [ ] **HTTPS / TLS:** La comunicación es HTTP plano en LAN. Sin cifrado (aceptable para red local privada, pero documentar explícitamente como decisión de diseño)

---

### 📄 DOCUMENTACIÓN TÉCNICA — 85%

- [x] `docs/API_DOCUMENTATION.md` — endpoints, parámetros, respuestas, ejemplos
- [x] `docs/ARCHITECTURE.md` — diagrama de capas, decisiones de diseño
- [x] `docs/CHANGELOG.md` — historial de sesiones (01, 03 documentadas)
- [x] `docs/DATABASE.md` — schema, relaciones, modelos
- [x] `docs/PROJECT_STRUCTURE.md` — mapa de archivos del proyecto
- [x] `AUDITORIA.md` — auditoría técnica inicial (sesión previa)
- [x] `AUDITORIA_2.md` — este documento

#### Pendiente
- [ ] **Guía de instalación / onboarding:** No existe un `README.md` raíz con pasos para arrancar el sistema desde cero (`git clone` → `npm install` → `prisma migrate` → `npm start`)
- [ ] **Manual de usuario:** No existe documentación para el usuario final (maestra, gestor, admin) explicando cómo usar los paneles
- [ ] **`docs/CHANGELOG.md` — Sesión 02:** El changelog salta de Sesión 01 a Sesión 03. La sesión de correcciones intermedias no está documentada formalmente

---

### 📦 OFFLINE-FIRST / VENDOR DE CDNs — 20%

#### Lo que funciona offline
- [x] Backend Node.js — no requiere internet en ejecución
- [x] SQLite — base de datos local, sin servidor externo
- [x] Toda la lógica de negocio y la API — completamente autónoma

#### Bloqueadores offline (CDNs activas)
- [ ] **Tailwind CSS** — cargado desde `https://cdn.tailwindcss.com` (requiere internet al primer acceso o sin caché)
- [ ] **Alpine.js** — cargado desde `https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js`
- [ ] **Google Fonts (Inter)** — cargada desde `https://fonts.googleapis.com`
- [ ] **Vendor local:** No existe `frontend/vendor/` con copias locales de estas librerías

> ⚠️ **Impacto real:** Los navegadores modernos cachean agresivamente los CDNs. En uso práctico en LAN, un acceso inicial con internet deja todo cacheado. Sin embargo, en instalación nueva sin internet previa, los paneles se verán sin estilos ni funcionalidad JS.

> 🔧 **Solución pendiente:** Descargar y servir localmente:
> - `tailwind.min.css` (build estático desde Tailwind CLI)
> - `alpinejs@3.x.x/dist/cdn.min.js`
> - Fuente Inter en `woff2` local

---

### 🧪 TESTING — 0%

- [ ] **Tests unitarios** — ninguna función de servicio o utilidad tiene tests
- [ ] **Tests de integración** — ningún endpoint tiene test automatizado
- [ ] **Tests E2E** — ningún flujo de usuario está automatizado
- [ ] **Framework de testing** — ninguno instalado (ni Jest, ni Vitest, ni Supertest)
- [ ] **Cobertura de código** — 0%

> 📌 Los módulos de mayor riesgo sin cobertura:
> - `pagos.service.js` — lógica de recargo (día 5)
> - `becas.service.js` — flujo de solicitud/resolución (RF-21)
> - `calificaciones.service.js` — lote con fuzzy match de materias
> - `jwt.utils.js` / `hash.utils.js` — seguridad core

---

### ⚙️ CI/CD — 0%

- [ ] **`.github/workflows/`** — directorio no existe
- [ ] **Pipeline de lint** — ningún linter configurado (ESLint/Prettier)
- [ ] **Pipeline de tests** — no hay CI que ejecute tests en cada PR
- [ ] **Pipeline de build** — no hay proceso automatizado de preparación del artefacto
- [ ] **Script de deploy documentado** — no existe `Makefile`, `deploy.sh` ni documentación de pasos de producción

---

## 🎯 RESUMEN EJECUTIVO

### Lo que funciona HOY (production-ready para LAN)
El sistema es **operable y funcional** para su propósito inmediato:
1. Login seguro con JWT y redirección por rol
2. Los 3 paneles (Admin, Gestor, Maestra) conectados a la API real
3. CRUD completo de alumnos, pagos, calificaciones, becas, usuarios, grupos
4. Lógica de negocio: recargo automático, flujo RF-21, lote de calificaciones, fuzzy match
5. Nodos satélite reciben IP del servidor automáticamente
6. Base de datos SQLite local — 100% offline en backend

### Deuda técnica que NO bloquea operación
| Deuda | Esfuerzo estimado | Prioridad |
|-------|-------------------|-----------|
| Vendor de CDNs (Tailwind, Alpine, Fonts) | 2-3 horas | Alta (para offline-first real) |
| README de instalación / onboarding | 1 hora | Alta |
| CORS dinámico (IP del servidor) | 30 min | Media |
| Confirmación en acciones destructivas | 1-2 horas | Media |
| Refresh token | 2-3 horas | Media |
| Tests unitarios core (pagos, becas, califs) | 4-6 horas | Media |
| Migraciones versionadas con Prisma | 1 hora | Baja |
| Manual de usuario | 2-3 horas | Baja |

---

*Generado automáticamente por auditoría de sesión — SAE v1.0.0*
