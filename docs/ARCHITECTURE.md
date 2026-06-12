# 🏗️ ARCHITECTURE — SAE Colegio San Diego

## Principio fundamental

Sistema **Offline-First**. Corre completamente en red local (LAN).
No depende de internet para ninguna operación crítica.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│                      RED LOCAL (LAN)                            │
│                                                                 │
│  ┌──────────────────┐    HTTP/REST    ┌────────────────────┐   │
│  │   FRONTEND       │ ──────────────> │   BACKEND          │   │
│  │   (HTML estático)│ <────────────── │   (Express.js)     │   │
│  │                  │  JSON responses │                    │   │
│  │  admin_panel.html│                 │  /api/v1/*         │   │
│  │  gestor_panel.html                 │                    │   │
│  │  maestra_panel.html                │  JWT Auth          │   │
│  │                  │                 │  RBAC              │   │
│  │  Alpine.js       │                 │  Rate Limiting     │   │
│  │  Tailwind CSS    │                 │  Helmet            │   │
│  └──────────────────┘                 └────────┬───────────┘   │
│                                                │                │
│                                       ┌────────▼───────────┐   │
│                                       │   PRISMA ORM       │   │
│                                       │   (SQLite → PG)    │   │
│                                       └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitectura en capas del backend

```
Request HTTP
    │
    ▼
┌─────────────────────────────────────┐
│         MIDDLEWARE GLOBAL           │
│  helmet · cors · rate-limit · morgan│
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│              ROUTES                 │
│  /api/v1/[módulo]                  │
│  authenticate → authorize → validate│
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│            CONTROLLERS              │
│  Solo: req → service → res          │
│  Sin lógica de negocio              │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│             SERVICES                │
│  Reglas de negocio                  │
│  Validaciones de dominio            │
│  Orquestación de flujos             │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│           REPOSITORIES              │
│  Solo Prisma queries                │
│  Sin lógica de negocio              │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│         PRISMA ORM + SQLite         │
│  Compatible con PostgreSQL futuro   │
└─────────────────────────────────────┘
```

---

## Sistema de roles (RBAC)

| Acción                     | ADMIN | GESTOR | MAESTRA |
|----------------------------|:-----:|:------:|:-------:|
| Ver alumnos                | ✅    | ✅     | ✅      |
| Crear/editar alumnos       | ✅    | ✅     | ❌      |
| Eliminar alumnos           | ✅    | ❌     | ❌      |
| Registrar pagos            | ✅    | ✅     | ❌      |
| Ver pagos                  | ✅    | ✅     | ❌      |
| Solicitar beca             | ✅    | ✅     | ❌      |
| Aprobar/rechazar beca      | ✅    | ❌     | ❌      |
| Registrar asistencia       | ✅    | ✅     | ✅      |
| Registrar calificaciones   | ✅    | ✅     | ✅      |
| Gestionar usuarios         | ✅    | ❌     | ❌      |
| Configurar ciclo escolar   | ✅    | ❌     | ❌      |

---

## Reglas de negocio implementadas

### RF-21: Flujo de becas Gestor → Admin
1. El Gestor **solicita** una beca (crea `SolicitudBeca` con estado `PENDIENTE`)
2. El Admin **aprueba o rechaza** la solicitud
3. Solo al aprobarse se crea el registro en `Beca` y el descuento aplica

### Recargo automático de colegiaturas
- Si el pago de COLEGIATURA se registra **después del día 5** del mes,
  se aplica automáticamente un recargo de $400
- Configurable por ciclo escolar

### Sanciones por adeudo
| Meses de adeudo | Estado          | Consecuencia                      |
|:---------------:|-----------------|-----------------------------------|
| 1 mes           | Aviso preventivo | Notificación a familia           |
| 2 meses         | Examen restringido | No puede presentar exámenes    |
| 3+ meses        | Baja temporal    | No asiste + pierde beca activa   |

---

## Stack tecnológico oficial

| Capa       | Tecnología              | Versión |
|------------|-------------------------|---------|
| Frontend   | HTML5 + Tailwind CSS    | —       |
| Frontend   | Alpine.js               | 3.x     |
| Frontend   | jsPDF                   | 2.5.1   |
| Backend    | Node.js                 | ≥18     |
| Backend    | Express.js              | 4.x     |
| ORM        | Prisma                  | 5.x     |
| Base de datos | PostgreSQL           | 16      |
| Auth       | JWT (jsonwebtoken)      | 9.x     |
| Passwords  | bcryptjs                | 2.x     |
| Seguridad  | Helmet + Rate Limit     | —       |
| Testing    | Vitest + Supertest      | 2.x / 7.x |
| Contenedores | Docker + Compose      | —       |
