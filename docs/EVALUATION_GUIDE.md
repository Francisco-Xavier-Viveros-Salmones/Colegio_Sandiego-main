# 🎓 EVALUATION_GUIDE — SAE Colegio San Diego

Guía de preparación para la exposición y defensa académica del proyecto.

**Mapa rápido:** "Si preguntan X → leer archivo Y"

---

## Mapa técnico de referencia

| Pregunta sobre... | Archivo a revisar |
|-------------------|--------------------|
| Arquitectura general | `docs/ARCHITECTURE.md` |
| Flujo JWT / Auth | `docs/SECURITY.md` + `backend/src/utils/jwt.utils.js` |
| Control de roles (RBAC) | `backend/src/middleware/rbac.middleware.js` |
| Base de datos / esquema | `docs/DATABASE.md` + `backend/prisma/schema.prisma` |
| Despliegue / Docker | `docs/DEPLOYMENT.md` + `docker-compose.yml` |
| Red LAN / Offline-first | `docs/LAN_SETUP.md` + `backend/src/app.js` |
| Pruebas automatizadas | `docs/TESTING.md` + `backend/src/__tests__/` |
| Reglas de negocio | `docs/ARCHITECTURE.md` + `backend/src/services/` |
| Auditorías del proyecto | `audits/` |

---

## Preguntas frecuentes y respuestas

---

### ¿Qué es JWT y cómo lo usa el sistema?

**JWT (JSON Web Token)** es un estándar para transmitir información firmada digitalmente.

En SAE:
1. El usuario hace `POST /api/v1/auth/login` con usuario + contraseña
2. El servidor verifica la contraseña con **bcrypt** (hash seguro)
3. Si es válida, genera un token firmado con `HMAC-SHA256` usando `JWT_SECRET`
4. El token contiene: `{ id, nombre, username, rol }` + expiración de **8 horas**
5. El cliente envía el token en cada request: `Authorization: Bearer <token>`
6. El middleware `authenticate` verifica la firma del token en cada petición

**Código relevante:** `backend/src/utils/jwt.utils.js`, `backend/src/middleware/auth.middleware.js`

---

### ¿Qué es RBAC y cómo está implementado?

**RBAC (Role-Based Access Control)** = control de acceso basado en roles.

El sistema tiene 3 roles: `ADMIN`, `GESTOR`, `MAESTRA`.

Cada endpoint declara qué roles pueden acceder:
```js
// Ejemplo real en auth.routes.js:
router.patch('/usuarios/:id/reset-password', authenticate, soloAdmin, controller.resetPassword)

// Ejemplo en alumnos.routes.js:
router.delete('/:id', authorize('ADMIN'), alumnosController.eliminar)
router.get('/',       authorize('ADMIN', 'GESTOR'), alumnosController.listar)
```

Si el rol no está permitido → `HTTP 403 Forbidden`.

**Código relevante:** `backend/src/middleware/rbac.middleware.js`

---

### ¿Por qué Docker?

Docker garantiza que el sistema funcione igual en **cualquier máquina**:
- Misma versión de Node.js, PostgreSQL y dependencias
- Sin diferencias entre Windows, Linux o Mac
- Un solo comando para levantar todo: `docker compose up --build`

El sistema tiene 2 servicios:
- `postgres_sae` → PostgreSQL 16 con datos persistentes en volumen Docker
- `sae-backend` → Node.js / Express sirviendo la API y el frontend

**Código relevante:** `docker-compose.yml`

---

### ¿Qué significa Offline-First?

El sistema **no necesita internet** para operar. Todo corre en la LAN del colegio:

- Backend en un equipo del colegio (servidor)
- Base de datos en el mismo servidor (Docker)
- Clientes acceden por navegador desde la misma red
- Si falla internet → el sistema sigue funcionando

**Código relevante:** `backend/src/app.js` (función `esOrigenLAN`), `docs/LAN_SETUP.md`

---

### ¿Cómo funciona la seguridad del sistema?

Capas de seguridad implementadas:

| Capa | Mecanismo | Código |
|------|-----------|--------|
| Contraseñas | bcrypt hash (10 rondas) | `hash.utils.js` |
| Tokens | JWT firmado HMAC-SHA256 | `jwt.utils.js` |
| Autenticación | Middleware `authenticate` | `auth.middleware.js` |
| Autorización | Middleware `authorize` (RBAC) | `rbac.middleware.js` |
| Headers HTTP | Helmet (XSS, clickjacking, etc.) | `app.js` |
| Fuerza bruta | Rate limiting + bloqueo por intentos | `app.js` + `auth.service.js` |
| Validación | express-validator en cada ruta | `validators/` |

---

### ¿Cómo funciona PostgreSQL con Prisma?

**Prisma** es el ORM (Object-Relational Mapper) que traduce código JavaScript a SQL:

```js
// Código JavaScript (service)
const usuario = await prisma.usuario.findFirst({
  where: { nombreUsuario: 'admin', activo: true }
});

// SQL generado por Prisma
SELECT * FROM usuario WHERE nombre_usuario = 'admin' AND activo = true LIMIT 1;
```

El esquema se define en `backend/prisma/schema.prisma` con todos los modelos del sistema.

---

### ¿Cómo está organizado el backend?

Arquitectura en capas:

```
Request HTTP
    │
    ▼  [Routes] — define qué middlewares y controladores aplican
    ▼  [Middleware] — authenticate, authorize, validate
    ▼  [Controller] — recibe req, llama service, envía res
    ▼  [Service] — lógica de negocio (reglas, validaciones)
    ▼  [Repository] — solo queries Prisma a la BD
    ▼  [PostgreSQL]
```

Cada módulo (alumnos, pagos, becas, etc.) tiene su carpeta propia en cada capa.

---

### ¿Qué pruebas automatizadas tiene el sistema?

El sistema cuenta con **118 tests** organizados en 5 módulos:

| Módulo | Tests | Qué verifica |
|--------|-------|--------------|
| Auth service | 12 | Login, bloqueo de cuenta, redirectTo por rol |
| JWT utils | 5 | Generación, verificación, firma falsificada |
| Hash utils | 6 | bcrypt hash y comparación |
| Middleware auth | 12 | authenticate: sin token, token inválido, válido |
| Middleware RBAC | 18 | authorize: permisos por rol, respuesta 403 |
| Middleware validate | 11 | Validación de campos, respuesta 422 |
| Alumnos service | 11 | CRUD, matrícula duplicada, errores 404/409 |
| Calificaciones service | 12 | calcularPromedio, reglas de inclusión/exclusión |
| Pagos service | 9 | Regla de recargo automático |
| Becas service | 8 | Flujo RF-21: solicitar, aprobar, rechazar |
| Integración HTTP | 14 | Endpoints reales con supertest |

Ejecutar: `cd backend && npm test`

---

### ¿Cuáles son las reglas de negocio más importantes?

#### RF-21: Flujo de becas (Gestor → Admin)
1. El Gestor **solicita** una beca → estado `PENDIENTE`
2. El Admin **aprueba o rechaza** → estado `APROBADA` o `RECHAZADA`
3. Solo al aprobar se crea el registro de beca activa

#### Recargo automático de colegiaturas
- Pago de COLEGIATURA **después del día 5** del mes → recargo automático de **$400**
- Alumno puede tener día límite personalizado (prevalece sobre el global)
- Otros conceptos (INSCRIPCION, MATERIAL_DIDACTICO) **nunca** generan recargo

#### Sanciones por adeudo
| Meses de adeudo | Estado | Consecuencia |
|:---:|---|---|
| 1 | `AVISO_PREVENTIVO` | Notificación |
| 2 | `EXAMEN_RESTRINGIDO` | Sin exámenes |
| 3+ | `BAJA_TEMPORAL` | Sin acceso + pierde beca |

---

## Checklist de defensa

- [ ] Explicar arquitectura cliente-servidor LAN
- [ ] Demostrar login y token JWT en DevTools (Network)
- [ ] Mostrar RBAC: GESTOR recibe 403 en endpoint ADMIN
- [ ] Mostrar test suite corriendo: `npm test`
- [ ] Explicar el flujo de becas RF-21
- [ ] Mostrar docker-compose.yml con 2 servicios
- [ ] Demostrar acceso desde otro dispositivo en la red
- [ ] Mostrar estructura de carpetas del proyecto
