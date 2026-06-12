# 🔒 SECURITY.md — SAE Colegio San Diego

Modelo de seguridad del sistema SAE. Aplica a la versión LAN offline-first.

---

## Autenticación

- **JWT (JSON Web Tokens)** firmados con HMAC-SHA256 (`HS256`)
- Duración del token: `8h` (configurable vía `JWT_EXPIRES_IN`)
- **Refresh silencioso:** tokens expirados hace < 2 horas se renuevan automáticamente
- Ventana de gracia: `7200 segundos` (hardcoded en `auth.controller.js`)
- La firma se verifica en TODOS los flujos (incluyendo refresh con `ignoreExpiration: true`)
- Tokens falsificados o con payload alterado → `401` inmediato

## Control de Acceso (RBAC)

Roles del sistema (jerárquico descendente):

| Rol     | Descripción                          |
|---------|--------------------------------------|
| ADMIN   | Acceso total — directora/administrador |
| GESTOR  | Acceso administrativo parcial — empleados |
| MAESTRA | Acceso académico restringido — docentes |

Middleware: `authorize(...rolesPermitidos)` en `rbac.middleware.js`  
Atajos: `soloAdmin`, `adminOGestor`, `todosLosRoles`

### Endpoints protegidos por ADMIN

| Método | Ruta                                    |
|--------|-----------------------------------------|
| PATCH  | `/api/v1/auth/usuarios/:id/reset-password` |
| POST   | `/api/v1/usuarios`                      |
| DELETE | `/api/v1/usuarios/:id`                  |
| POST   | `/api/v1/becas/:id/resolver`            |

## Protección contra Fuerza Bruta

- Máximo de intentos fallidos: `5` (configurable en `configuracion_sistema`)
- Bloqueo temporal: `30 minutos` por defecto
- Se registra cada intento (exitoso o fallido) en `intento_login`

## Rate Limiting

- API general: `100 req / 15 min`
- Auth endpoints: `10 req / 15 min`
- Implementado con `express-rate-limit`

## Headers de Seguridad

- `helmet` activo con CSP desactivada (frontend CDN)
- CORS: orígenes explícitos + detección automática de subred LAN `/24`

## Variables de Entorno Críticas

| Variable         | Descripción                          |
|------------------|--------------------------------------|
| `JWT_SECRET`     | Secreto de firma JWT (obligatorio)   |
| `DATABASE_URL`   | Cadena de conexión PostgreSQL        |
| `BCRYPT_ROUNDS`  | Rounds de bcrypt (default: 10)       |

⚠️ **Nunca** subir `.env` al repositorio. El archivo está excluido en `backend/.gitignore`.

## Validación de Usuario Activo en /auth/me

`GET /api/v1/auth/me` verifica en BD que el usuario:
- `activo = true`
- `eliminadoEn = null`

Si alguna condición falla → `401` aunque el JWT sea válido.

## Modelo de Seguridad LAN

SAE opera en una **red de área local (LAN) privada** del colegio, sin exposición a internet.
Este entorno define el modelo de seguridad apropiado:

| Característica | Valor |
|---|---|
| Exposición pública | ❌ Ninguna — solo accesible desde la LAN |
| Autenticación requerida | ✅ JWT en todos los endpoints de API |
| Cifrado de tráfico | HTTP plano (ver sección siguiente) |
| Almacenamiento de datos | PostgreSQL en servidor local del colegio |
| Clientes | Dispositivos de la misma subred escolar |

## HTTP sin HTTPS — Decisión Arquitectónica

SAE utiliza **HTTP plano** de forma intencional. Esto **no es una vulnerabilidad** sino una
decisión arquitectónica documentada:

### Por qué no HTTPS

| Razón | Detalle |
|---|---|
| **Red privada** | Todo el tráfico circula dentro de la LAN del colegio — no atraviesa internet |
| **Sin exposición externa** | No hay URL pública, ni dominio, ni balanceador con SSL |
| **Entorno offline-first** | El servidor no tiene acceso a internet para obtener certificados (Let's Encrypt requiere validación HTTP-01 o DNS-01 vía internet) |
| **Complejidad innecesaria** | nginx + certbot + renovación automática en un servidor escolar institucional introduce puntos de fallo sin beneficio real |
| **Control administrativo** | El personal de TI del colegio gestiona el servidor — HTTPS agrega complejidad operativa sin contrapartida |

### Qué se protege con JWT aunque sea HTTP

- Las contraseñas **nunca se almacenan en texto plano** — bcrypt con `BCRYPT_ROUNDS` rounds
- Cada request requiere un **JWT firmado** — no hay session cookies susceptibles a CSRF
- Los tokens tienen **expiración corta** (8h) con refresh silencioso
- La firma JWT usa **HMAC-SHA256 con secreto largo** — tokens falsificados → 401 inmediato

### Si en el futuro se requiere HTTPS

Agregar nginx como proxy inverso con certificado auto-firmado para la LAN:

```bash
# Ejemplo mínimo (no implementar en producción sin análisis previo)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/sae.key \
  -out    /etc/nginx/ssl/sae.crt \
  -subj "/CN=sae.colegio.local"
```

> Esta implementación NO está incluida en el proyecto actual. Si el entorno cambia
> (exposición a internet, WAN multiescuelas), debe planificarse como un proyecto separado.

## Checklist de Testing Manual

| Caso                                       | Resultado esperado |
|--------------------------------------------|-------------------|
| ADMIN → `reset-password`                   | `200 OK`          |
| GESTOR → `reset-password`                  | `403 Forbidden`   |
| MAESTRA → `reset-password`                 | `403 Forbidden`   |
| JWT válido → `/auth/me`                    | `200 OK`          |
| JWT de usuario desactivado → `/auth/me`    | `401`             |
| JWT de usuario eliminado → `/auth/me`      | `401`             |
| Refresh con token legítimo expirado < 2h   | `200 nuevo token` |
| Refresh con token firmado inválido         | `401`             |
| Refresh con payload alterado               | `401`             |
| Refresh con token expirado > 2h            | `401`             |

---

_Última actualización: Sesión 12 · 2026-06-08_
