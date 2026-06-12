# 🔄 CI/CD — SAE Colegio San Diego

Documentación de la estrategia de integración continua y despliegue para el Sistema
Administrativo Escolar (SAE). Arquitectura offline-first / LAN.

---

## Filosofía general

SAE es un sistema de escritorio escolar instalado en una **LAN privada** sin acceso a internet.
Por este motivo:

- **NO existe deploy automático** — es correcto por diseño arquitectónico
- **NO se usa cloud** (AWS, Azure, Vercel, Netlify, etc.)
- **NO se usa Kubernetes ni orquestación enterprise**
- El pipeline CI sirve únicamente para **validar calidad del código antes de un merge**
- El deploy en el servidor institucional es **manual y deliberado**

---

## Arquitectura CI — GitHub Actions

```
push a main/develop  ──►  lint-and-test  ──►  docker-build
                               │                    │
                        PostgreSQL service     Build imagen
                        init-db (5 scripts)   Smoke test /health
                        Prisma migrate        docker compose up/down
                        Seed
                        ESLint (no-block)
                        Prettier (no-block)
                        Vitest (118+ tests)
```

### Activación del pipeline

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
      - '.github/workflows/ci.yml'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'
```

Solo se activa cuando hay cambios reales en `backend/` o en el propio workflow.

---

## Job 1 — `lint-and-test`

| Propiedad | Valor |
|-----------|-------|
| Runner | `ubuntu-latest` |
| Node.js | `20` |
| Working dir | `backend/` |
| Base de datos | PostgreSQL 16-alpine (servicio GH Actions) |

### Secuencia de steps

| # | Step | Descripción |
|---|------|-------------|
| 1 | Checkout código | `actions/checkout@v4` |
| 2 | Setup Node.js 20 | Con caché de npm |
| 3 | Instalar dependencias | `npm ci` |
| 4 | Generar Prisma Client | `npx prisma generate` |
| 5 | Aplicar init-db (5 scripts) | FK constraints + triggers |
| 6 | Marcar baseline Prisma | `migrate resolve --applied` |
| 7 | Cargar seed de prueba | `npm run db:seed` |
| 8 | ESLint *(no-block)* | `npm run lint` |
| 9 | Prettier *(no-block)* | `npx prettier --check` |
| 10 | Tests | `npm test` (Vitest) |

### Variables de entorno (CI)

```yaml
DATABASE_URL: postgresql://sae_admin:SaeColegio2026@localhost:5432/sae_colegio_san_diego_test
JWT_SECRET: ci-secret-key-para-pruebas-minimo-32-chars
NODE_ENV: test
PORT: 3001
```

> La contraseña `SaeColegio2026` es **exclusiva del entorno CI efímero**. No corresponde
> a ninguna credencial de producción.

---

## Servicio PostgreSQL en CI

GitHub Actions levanta PostgreSQL 16-alpine como servicio Docker antes del job:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: sae_admin
      POSTGRES_PASSWORD: SaeColegio2026
      POSTGRES_DB: sae_colegio_san_diego_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

El runner espera automáticamente a que PostgreSQL esté `healthy` antes de ejecutar los steps
(gracias a `health-check`).

---

## Init-DB — Scripts SQL

El esquema se aplica **antes** de Prisma migrate para asegurar FK constraints y triggers:

```
BD-ColegioSandiego/init-db/
├── 01_esquema_base.sql          ← Tablas base (sin FK)
├── 02_configuracion.sql         ← Datos de configuración inicial
├── 03_integridad_referencial.sql ← Foreign keys + constraints
├── 04_triggers_auditoria.sql    ← Triggers de auditoría
└── 05_datos_prueba.sql          ← (no aplicado en CI — usa seed de Node.js)
```

> El script `05_datos_prueba.sql` **no se aplica en CI**. Los datos de prueba los inyecta
> el seed de Node.js (`npm run db:seed`) para coherencia con la lógica de negocio.

---

## Prisma Migrations en CI

El proyecto usa la estrategia de **baseline manual**:

```bash
npx prisma migrate resolve --applied 20260527000001_init_postgresql
```

Esto le indica a Prisma que el schema SQL ya fue aplicado por los scripts `init-db` y no debe
intentar re-ejecutar la migración inicial. Garantiza que `prisma migrate status` no marque el
baseline como pendiente.

### Por qué no se usa `migrate deploy` en CI

`prisma migrate deploy` fallaría porque la migración `init` ya fue aplicada por los scripts SQL.
Usar `migrate resolve --applied` es el patrón correcto para proyectos con schema SQL pre-existente.

---

## ESLint — No Bloqueante

ESLint 9.x está configurado en modo **no bloqueante** en CI:

```yaml
- name: ESLint
  run: npm run lint
  continue-on-error: true  # No falla el pipeline en warnings de estilo
```

**Justificación:** El sistema escolar LAN prioriza funcionalidad sobre pureza de estilo.
Los warnings de lint se reportan en el log de CI para revisión, pero no bloquean
la integración de cambios funcionales urgentes.

Configuración: `backend/.eslintrc.cjs` (CommonJS mode, ESLint 9.x).

---

## Prettier — No Bloqueante

Prettier se valida en CI con `--check` (read-only, no escribe):

```yaml
- name: Prettier (format check)
  run: npx prettier --check "src/**/*.js" "scripts/**/*.js" "prisma/**/*.js"
  continue-on-error: true  # Formato no bloquea el pipeline
```

Para corregir formato localmente:
```bash
cd backend
npm run format   # equivale a: prettier --write src/**/*.js scripts/**/*.js ...
```

Configuración: `backend/.prettierrc` — `singleQuote: true`, `tabWidth: 2`, `trailingComma: 'all'`.

---

## Job 2 — `docker-build`

| Propiedad | Valor |
|-----------|-------|
| Runner | `ubuntu-latest` |
| Depende de | `lint-and-test` (debe pasar primero) |
| Objetivo | Verificar que el stack Docker arranca correctamente |

### Steps

| # | Step | Descripción |
|---|------|-------------|
| 1 | Checkout código | `actions/checkout@v4` |
| 2 | Build imagen Docker | `docker build ./backend` |
| 3 | Smoke test `/health` | `docker compose up` + retry curl |

### Smoke test — lógica de espera

```bash
# Generar .env mínimo para CI — NO usar .env.example (tiene placeholders)
printf 'POSTGRES_PASSWORD=SaeColegio2026\nJWT_SECRET=ci-docker-smoke-test-secret-32-chars\n' > backend/.env
docker compose up -d

# Retry hasta 60s (12 × 5s)
for i in $(seq 1 12); do
  sleep 5
  if curl -sf --max-time 5 http://localhost:3000/health > /dev/null; then
    break
  fi
done
```

**Por qué no se usa `.env.example`:** Tras la corrección de seguridad BF-11, `.env.example`
contiene `POSTGRES_PASSWORD=<CAMBIAR_ANTES_DE_PRODUCCION>` como placeholder. Si se copiara a
`.env`, docker compose usaría ese string literal como contraseña, rompiendo la autenticación
PostgreSQL. El smoke test genera un `.env` mínimo con valores CI reales.

**Por qué retry en lugar de `sleep 15`:** El tiempo de arranque del backend en GitHub Actions
varía. Un `sleep` fijo puede fallar por ser demasiado corto o desperdiciar tiempo si el
backend arranca rápido. El retry con `max-time 5` es más robusto y eficiente.

---

## Suite de Tests (Vitest)

```
backend/src/__tests__/
├── auth.test.js                  ← Autenticación JWT (unit)
├── auth.integration.test.js      ← Endpoints /auth/* (supertest)
├── alumnos.test.js               ← CRUD alumnos (unit)
├── alumnos.integration.test.js   ← Endpoints /alumnos/* (supertest)
├── calificaciones.test.js        ← Lógica calificaciones (unit)
├── pagos.test.js                 ← Lógica pagos (unit)
├── becas.test.js                 ← Lógica becas (unit)
├── grupos.test.js                ← Lógica grupos (unit)
├── usuarios.test.js              ← Lógica usuarios (unit)
├── rbac.test.js                  ← Middleware RBAC (unit)
├── validate.test.js              ← Middleware validación (unit)
└── db.integrity.test.js          ← Integridad BD: soft delete, Decimal, P2002 (unit)
```

**Total:** 118+ tests | Framework: Vitest 2.x + Supertest 7.x
**Timeout:** 10s por test | **Globals:** `describe`, `test`, `expect`, `vi` disponibles sin import

---

## Deploy manual — Servidor LAN

El deploy en el servidor institucional es **completamente manual por diseño**:

```bash
# En el servidor escolar (Windows/Linux con Docker)

# 1. Actualizar código
git pull origin main

# 2. Backup previo al deploy
cd backend
node scripts/db-backup.js --label="pre-deploy"

# 3. Reconstruir y levantar
cd ..
docker compose build backend
docker compose up -d

# 4. Verificar salud
curl http://localhost:3000/health
```

### Por qué deploy manual

| Razón | Detalle |
|-------|---------|
| **Entorno offline** | El servidor escolar no tiene acceso a internet; no puede recibir webhooks de GitHub ni acceder a registros cloud |
| **Control administrativo** | El personal de TI del colegio decide cuándo aplicar actualizaciones |
| **Sin exposición pública** | No hay URL pública donde desplegar automáticamente |
| **Seguridad de datos** | Las actualizaciones que tocan el schema de BD requieren revisión manual antes de aplicarse |

> Esto **no es una limitación técnica** — es una decisión arquitectónica correcta para
> un sistema escolar institucional LAN.

---

## Checklist de validación CI

Antes de mergear a `main`, verificar que el pipeline haya pasado:

- [ ] `lint-and-test` → ✅ verde
  - [ ] PostgreSQL service iniciado
  - [ ] Los 4 scripts init-db aplicados sin error
  - [ ] Prisma baseline marcado
  - [ ] Seed cargado
  - [ ] ESLint ejecutado (puede ser ⚠️ con warnings — no bloquea)
  - [ ] Prettier ejecutado (puede ser ⚠️ — no bloquea)
  - [ ] Todos los tests pasan (`npm test`)
- [ ] `docker-build` → ✅ verde
  - [ ] Imagen Docker construida
  - [ ] Smoke test `/health` respondió 200

---

## Configuración local (desarrollo)

Para ejecutar CI localmente antes de hacer push:

```bash
cd backend

# Lint
npm run lint

# Formato
npm run format:check   # equivale a: prettier --check ...

# Tests (requiere PostgreSQL local o Docker)
npm test

# Tests con cobertura
npm run test:coverage
```

---

*Última actualización: Sesión 11 · 2026-06-08*
