# SECURITY_AND_DOCKER_IMPLEMENTATION.md

# CONTEXTO

Proyecto:
SAE Colegio San Diego

Objetivo actual:
Completar al 100% los módulos:

* Seguridad
* Docker / Infraestructura

NO trabajar otros módulos.

Basarse EXCLUSIVAMENTE en:

* código real
* estructura real
* auditoría existente

NO inventar arquitectura.
NO asumir patrones inexistentes.
NO hacer refactors masivos.

---

# OBJETIVO PRINCIPAL

Implementar únicamente:

## SEGURIDAD

* RBAC reset-password
* JWT verify refresh
* auth/me validación usuario activo
* hardening Docker user
* .env tracking fix
* validaciones críticas

## DOCKER

* frontend mount fix
* dockerignore
* validación despliegue LAN
* validación docker compose
* hardening básico contenedor

---

# REGLAS CRÍTICAS

## PROHIBIDO

* refactorizar arquitectura
* reorganizar carpetas
* cambiar nombres públicos
* modificar frontend innecesariamente
* actualizar dependencias
* introducir librerías nuevas
* cambiar Prisma schema innecesariamente
* modificar lógica no relacionada
* hacer optimizaciones fuera del alcance
* tocar módulos ajenos a seguridad/docker

---

## OBLIGATORIO

* cambios mínimos
* cambios seguros
* mantener compatibilidad
* mantener APIs existentes
* mantener refresh token actual
* mantener RBAC actual
* mantener Docker actual compatible

---

# MODO DE TRABAJO

Trabajar SOLO sobre:

* hallazgos reales de auditoría
* evidencia existente en código

Antes de modificar:

1. inspeccionar archivo real
2. entender flujo actual
3. aplicar cambio mínimo

Si una implementación rompe:

* compatibilidad
* flujo actual
* refresh
* login
* docker compose
* frontend LAN

DETENERSE y reportarlo.

---

# MÓDULO 1 — RBAC RESET PASSWORD

## Problema

Ruta vulnerable:

PATCH /auth/usuarios/:id/reset-password

Actualmente:

* solo usa authenticate
* cualquier usuario autenticado puede resetear passwords

---

## Objetivo

Permitir acceso SOLO a ADMIN.

---

## Implementación esperada

Usar middleware RBAC existente.

Preferir:

* soloAdmin
  o
* authorize('ADMIN')

según arquitectura REAL existente.

---

## Archivos permitidos

* backend/src/routes/auth.routes.js
* backend/src/middleware/rbac.middleware.js

NO tocar otros módulos.

---

## Validaciones obligatorias

### ADMIN

Debe funcionar.

### GESTOR

Debe responder 403.

### MAESTRA

Debe responder 403.

---

# MÓDULO 2 — JWT VERIFY REFRESH TOKEN

## Problema

POST /auth/refresh usa:

* jwt.decode()
* NO verifica firma

Vulnerabilidad crítica.

---

## Objetivo

Usar:

* jwt.verify()
* ignoreExpiration: true

Manteniendo:

* ventana de gracia actual
* refresh silencioso
* interceptor frontend existente

---

## Implementación esperada

NO reescribir auth completo.

Cambiar SOLAMENTE:

* validación refresh token

---

## Archivos permitidos

* backend/src/controllers/auth/auth.controller.js
* utils JWT SOLO si es estrictamente necesario

---

## Validaciones obligatorias

### Debe permitir

* tokens legítimos expirados dentro de grace window

### Debe rechazar

* tokens falsificados
* firmas inválidas
* payloads alterados

---

# MÓDULO 3 — AUTH/ME VALIDACIÓN

## Problema

GET /auth/me:

* devuelve payload JWT
* NO valida usuario activo en BD

---

## Objetivo

Verificar:

* activo=true
* eliminadoEn=null

---

## Archivos permitidos

* auth.controller.js
* services/repos SOLO si es necesario

---

## Validaciones

Usuario:

* desactivado
* eliminado

Debe retornar:
401

---

# MÓDULO 4 — DOCKER FRONTEND FIX

## Problema

Frontend NO existe dentro del contenedor Docker.

Resultado:

* /admin
* /gestor
* /maestra

responden 404.

---

## Objetivo

Montar frontend correctamente.

---

## Archivos permitidos

* docker-compose.yml

Evitar cambios masivos.

---

## Validaciones

Docker compose debe:

* levantar backend
* servir frontend
* responder paneles

---

# MÓDULO 5 — DOCKER HARDENING

## Objetivo

Evitar ejecución Node como root.

---

## Implementación

Agregar:

* USER node
* permisos necesarios

---

## Archivos permitidos

* backend/Dockerfile

---

# MÓDULO 6 — DOCKERIGNORE

## Objetivo

Excluir:

* logs
* node_modules
* tests
* coverage
* envs
* archivos innecesarios

---

## Archivo permitido

* backend/.dockerignore

---

# MÓDULO 7 — ENV SECURITY

## Objetivo

Remover:
backend/.env

del tracking Git.

---

## NO borrar archivo físico.

Solo:
git rm --cached

---

# DOCUMENTACIÓN OBLIGATORIA

Actualizar SOLO si existe:

* docs/SECURITY.md
* docs/API_DOCUMENTATION.md
* docs/CHANGELOG.md
* docs/DEPLOYMENT.md

Si no existen:
crear versión mínima profesional.

---

# DOCUMENTACIÓN DE DESPLIEGUE

Documentar:

## Backend

cd backend
npm install
npm run dev

---

## Docker

docker compose up --build

---

## PostgreSQL

docker compose up -d postgres_sae

---

## LAN

Cómo obtener IP:

Windows:
ipconfig

Linux:
ip addr

---

## Acceso clientes LAN

Ejemplo:
http://192.168.1.10:3000

---

## Firewall Windows

netsh advfirewall firewall add rule name="SAE 3000" dir=in action=allow protocol=TCP localport=3000

---

# TESTING MANUAL OBLIGATORIO

Generar checklist manual:

## Seguridad

* ADMIN reset password
* GESTOR forbidden
* JWT válido
* JWT inválido
* JWT falsificado
* refresh válido
* auth/me usuario eliminado

---

## Docker

* compose up
* frontend visible
* API responde
* paneles accesibles
* acceso LAN funcional

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
PRECISIÓN > VELOCIDAD

NO asumir.
NO inventar.
NO sobreingeniería.
NO refactors innecesarios.

Implementar únicamente lo solicitado.
