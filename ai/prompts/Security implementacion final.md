# AUTH_SECURITY_FINALIZATION_IMPLEMENTATION.md

# CONTEXTO

Proyecto:
SAE Colegio San Diego

Estado actual Seguridad/Auth:
97%

Arquitectura actual:
JWT + RBAC + Prisma + PostgreSQL + Express + LAN offline-first.

Objetivo:
Completar estabilización final de autenticación y seguridad SIN modificar arquitectura existente.

---

# IMPORTANTE

El sistema YA funciona.

NO reescribir:

* auth flow
* JWT flow
* RBAC
* middleware principal
* Prisma auth
* interceptores frontend
* Docker
* arquitectura backend

SOLO:

* validar
* estabilizar
* corregir edge cases
* endurecer comportamiento
* completar documentación

---

# REGLAS CRÍTICAS

## PROHIBIDO

* reescribir auth completo
* cambiar JWT structure
* cambiar refresh flow
* modificar contratos API
* modificar roles existentes
* introducir OAuth
* introducir sesiones Redis
* introducir providers externos
* modificar frontend innecesariamente
* cambiar Prisma schema innecesariamente
* introducir librerías nuevas innecesarias

---

## OBLIGATORIO

* cambios mínimos
* mantener compatibilidad total
* mantener frontend funcionando
* mantener refresh silencioso
* mantener Docker funcionando
* mantener PostgreSQL funcionando
* mantener LAN funcionando

---

# MODO DE TRABAJO

Antes de modificar:

1. inspeccionar implementación REAL
2. reproducir problema real
3. identificar causa raíz
4. aplicar fix mínimo
5. validar compatibilidad

Si una solución requiere:

* refactor masivo
* reestructuración auth
* nueva arquitectura seguridad

DETENERSE y reportarlo.

---

# ESTADO ACTUAL CONFIRMADO

## YA IMPLEMENTADO

* JWT issuer sae-sandiego
* expiración configurable
* verifyToken() seguro
* verifyIgnoreExpiration() con jwt.verify()
* authenticate diferencia expiración/token inválido
* RBAC completo
* refresh verifica firma
* auth/me valida usuario activo
* bcryptjs configurable
* lockout por intentos
* intento_login tracking
* rate limiter auth
* limpiarFallos()
* lockout configurable DB
* interceptor proactivo
* interceptor reactivo
* .env no trackeado
* anti auto-degradación ADMIN

---

# OBJETIVO REAL

NO recrear seguridad.

SOLO completar:

* estabilidad
* edge cases
* validaciones finales
* documentación
* hardening mínimo LAN

---

# MÓDULO 1 — JWT VALIDATION

## Objetivo

Validar:

* firma
* expiración
* issuer
* payloads corruptos
* malformed tokens

---

## Verificar

### verifyToken()

Debe retornar:

* valid
* payload
* error

SIN lanzar excepciones.

---

## Verificar

### verifyIgnoreExpiration()

Debe usar:
jwt.verify()

NO:
jwt.decode()

---

## Validar

* tokens falsificados
* firmas inválidas
* payloads alterados
* tokens vacíos
* tokens truncados

---

## PROHIBIDO

Reescribir JWT helper completo.

---

# MÓDULO 2 — REFRESH FLOW VALIDATION

## Objetivo

Validar:
POST /auth/refresh

---

## Verificar

Debe:

* validar firma
* respetar ventana 2h
* rechazar tokens corruptos
* rechazar firmas inválidas

---

## Validar

* refresh silencioso frontend
* compatibilidad interceptor
* retry flow

---

## PROHIBIDO

Modificar interceptores frontend innecesariamente.

---

# MÓDULO 3 — AUTHENTICATE MIDDLEWARE

## Objetivo

Validar:
middleware authenticate

---

## Verificar

Debe diferenciar:

* TokenExpiredError
* token inválido
* token ausente

---

## Validar

### Status codes

* 401 correcto
* mensajes consistentes
* logs claros

---

# MÓDULO 4 — RBAC VALIDATION

## Objetivo

Validar:
authorize()

en TODAS las rutas protegidas.

---

## Verificar especialmente

### ADMIN only

* reset-password
* usuarios críticos
* endpoints sensibles

---

## Validar

* 403 correcto
* bypass permisos
* manipulación roles
* tokens alterados

---

## PROHIBIDO

Reescribir RBAC architecture.

---

# MÓDULO 5 — AUTH/ME VALIDATION

## Objetivo

Validar:
GET /auth/me

---

## Verificar

Debe usar:
authService.findUsuarioActivo()

---

## Confirmar

Valida:

* activo=true
* eliminadoEn=null

---

## Validar

Usuario:

* eliminado
* desactivado

Debe responder:
401

---

# MÓDULO 6 — LOCKOUT VALIDATION

## Objetivo

Validar:

* intentosFallidos
* bloqueadoHasta
* limpiarFallos()

---

## Verificar

### Login fallido

Debe:

* aumentar intentos
* registrar IP
* registrar userAgent

---

## Login exitoso

Debe:

* limpiarFallos()

---

## Validar

* desbloqueo correcto
* lockout configurable
* edge cases tiempo

---

# MÓDULO 7 — LOGIN TRACKING

## Objetivo

Validar:
tabla intento_login

---

## Verificar

Registro:

* exitoso/fallido
* IP
* userAgent
* timestamp

---

## Validar

* datos correctos
* inserts correctos
* errores silenciosos

---

# MÓDULO 8 — RATE LIMIT VALIDATION

## Objetivo

Validar:
rate limiter auth

---

## Verificar

/api/v1/auth

Debe:
10 req / 15 min

---

## Validar

* status 429
* retry headers
* bypass simples

---

# MÓDULO 9 — INTERCEPTOR VALIDATION

## Objetivo

Validar:
api.js interceptors

---

## Verificar

### Proactivo

Renueva:
< 15 min restantes

---

### Reactivo

Retry:
401

Con:
semáforo anti-bucle

---

## Validar

* loops infinitos
* refresh duplicado
* race conditions simples

---

# MÓDULO 10 — ENV SECURITY

## Objetivo

Validar:
backend/.env

NO trackeado Git.

---

## Verificar

git ls-files --cached | grep .env

---

## Confirmar

.env NO aparece.

---

# MÓDULO 11 — ROLE SELF-PROTECTION

## Objetivo

Validar:
anti auto-degradación ADMIN

---

## Verificar

ADMIN:
NO puede cambiar su propio rol.

---

## Validar

* controller guards
* bypass simples
* payloads manipulados

---

# MÓDULO 12 — HTTPS DOCUMENTATION

## IMPORTANTE

NO implementar HTTPS ahora.

Arquitectura actual:
LAN privada offline-first.

HTTP plano:
DECISIÓN ARQUITECTÓNICA DOCUMENTADA.

---

# Objetivo

Documentar claramente:

* por qué no HTTPS
* entorno LAN privado
* despliegue local
* no exposición pública internet

---

## PROHIBIDO

Implementar:

* nginx SSL
* certbot
* reverse proxy complejo
* cloud HTTPS

---

# MÓDULO 13 — SECURITY TESTING

## Objetivo

Crear SOLO pruebas críticas seguridad.

---

## Prioridad

### JWT

### RBAC

### Refresh

### Lockout

### Auth/me

---

## Validar

* status codes
* tokens inválidos
* roles inválidos
* expiraciones
* bypass simples

---

# DOCUMENTACIÓN OBLIGATORIA

Actualizar:

* SECURITY.md
* API_DOCUMENTATION.md
* CHANGELOG.md
* TROUBLESHOOTING.md

---

# SECURITY.md

Debe incluir:

## JWT Flow

## Refresh Flow

## RBAC

## Lockout

## Rate limiting

## intento_login

## Auth/me validation

## LAN security model

## HTTP sin HTTPS (explicación arquitectónica)

---

# TROUBLESHOOTING.md

Agregar:

* JWT inválido
* sesión expirada
* lockout usuario
* refresh fallido
* rate limit 429
* usuario desactivado

---

# VALIDACIÓN FINAL OBLIGATORIA

Confirmar:

* login funciona
* refresh funciona
* RBAC funciona
* auth/me funciona
* Prisma conecta
* PostgreSQL estable
* frontend sigue operativo
* interceptores funcionan
* Docker estable
* LAN estable

---

# CHECKLIST FINAL

## JWT

* firma válida
* issuer correcto
* expiración correcta

---

## Auth

* login estable
* refresh estable
* lockout estable

---

## RBAC

* ADMIN protegido
* permisos correctos

---

## Frontend

* interceptores correctos
* no loops refresh

---

## Docs

* SECURITY.md actualizado
* troubleshooting actualizado

---

# FORMATO DE RESPUESTA

Para cada cambio mostrar:

## Archivo

## Problema

## Cambio aplicado

## Riesgo mitigado

## Compatibilidad afectada

## Validación realizada

---

# IMPORTANTE

Prioridad máxima:
ESTABILIDAD > COMPLEJIDAD

NO asumir.
NO inventar.
NO sobreingeniería.
NO reescribir módulos funcionales.

Implementar únicamente:

* fixes mínimos
* validaciones reales
* estabilización seguridad basada en arquitectura existente.
