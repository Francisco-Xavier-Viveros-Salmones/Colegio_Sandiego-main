# FRONTEND_FINALIZATION_IMPLEMENTATION.md

# CONTEXTO

Proyecto:
SAE Colegio San Diego

Estado actual Frontend:
99%

Arquitectura actual:
Frontend estático + Alpine.js + api.js centralizado + JWT + refresh automático + LAN offline-first.

Objetivo:
Completar estabilización final frontend SIN modificar arquitectura existente.

---

# IMPORTANTE

El frontend YA funciona.

NO reescribir:

* arquitectura frontend
* auth flow
* api.js
* Alpine.js structure
* dashboards
* paneles
* refresh flow
* modales funcionales

SOLO:

* validar
* estabilizar
* corregir edge cases
* completar documentación
* cerrar pendientes mínimos

---

# REGLAS CRÍTICAS

## PROHIBIDO

* migrar framework
* introducir React/Vue/Angular
* refactorizar frontend completo
* cambiar estructura paneles
* modificar contratos API
* modificar JWT flow
* modificar RBAC flow
* introducir librerías innecesarias
* usar CDNs externos
* romper compatibilidad LAN
* modificar backend innecesariamente

---

## OBLIGATORIO

* cambios mínimos
* mantener compatibilidad total
* mantener frontend funcionando
* mantener backend funcionando
* mantener Docker funcionando
* mantener PostgreSQL funcionando
* mantener LAN funcionando
* mantener vendor local

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
* reestructuración frontend
* framework nuevo

DETENERSE y reportarlo.

---

# ESTADO ACTUAL CONFIRMADO

## YA IMPLEMENTADO

* auth-guard.js
* api.js centralizado
* Bearer auto-injection
* refresh proactivo
* refresh reactivo
* semáforo anti-bucle
* 401 clearSession()
* offline handling
* offline-indicator
* toast dinámico
* CRUD Admin
* Gestor RF-21
* Maestra lote
* modal eliminarUsuario()
* modal Asignar Beca
* modal Nuevo Alumno
* dashboard métricas reales
* vendor local
* badge Deudores
* vista Deudores dinámica

---

# OBJETIVO REAL

NO recrear frontend.

SOLO completar:

* estabilidad
* edge cases
* validaciones finales
* documentación
* robustez offline/LAN

---

# MÓDULO 1 — AUTH GUARD VALIDATION

## Objetivo

Validar:
auth-guard.js

---

## Verificar

Debe:

* validar JWT
* bloquear acceso inválido
* redirect login
* limpiar sesión inválida

---

## Validar

* token expirado
* token corrupto
* sesión inválida
* refresh fallido

---

## PROHIBIDO

Reescribir auth frontend completo.

---

# MÓDULO 2 — API.JS VALIDATION

## Objetivo

Validar:
api.js centralizado

---

## Verificar

Debe:

* inyectar Bearer automáticamente
* usar API_BASE dinámico
* NO usar localhost hardcodeado

---

## Validar

* requests simultáneas
* refresh automático
* headers correctos
* errores red

---

# MÓDULO 3 — REFRESH FLOW VALIDATION

## Objetivo

Validar:
refresh proactivo + reactivo

---

## Verificar

### Proactivo

Refresca:
antes expiración.

---

### Reactivo

Retry:
401

Con:
semáforo anti-bucle.

---

## Validar

* loops infinitos
* refresh duplicado
* race conditions simples
* sesión corrupta

---

## PROHIBIDO

Modificar arquitectura refresh.

---

# MÓDULO 4 — OFFLINE HANDLING

## Objetivo

Validar:
manejo offline

---

## Verificar

Error red:
retorna

{ ok: false, offline: true }

---

## Confirmar

UI:
NO se rompe.

---

## Validar

* backend apagado
* pérdida WiFi
* Docker backend detenido
* timeout requests

---

# MÓDULO 5 — OFFLINE INDICATOR

## Objetivo

Validar:
offline-indicator.js

---

## Verificar

Carga en:

* admin
* gestor
* maestra

---

## Validar

* detecta offline
* detecta reconexión
* UI consistente

---

# MÓDULO 6 — TOAST SYSTEM VALIDATION

## Objetivo

Validar:
toast dinámico

---

## Confirmar

NO usar:
alert()

---

## Validar

* errores API
* éxito operaciones
* offline
* auth errors

---

## PROHIBIDO

Agregar librerías toast nuevas.

---

# MÓDULO 7 — ADMIN PANEL VALIDATION

## Objetivo

Validar:
panel Admin

---

## Verificar

CRUD:

* alumnos
* pagos
* calificaciones
* becas
* usuarios
* grupos

---

## Validar

* modales
* formularios
* errores API
* refresh UI
* edge cases

---

# MÓDULO 8 — GESTOR PANEL VALIDATION

## Objetivo

Validar:
panel Gestor

---

## Verificar

* alumnos
* pagos
* becas RF-21
* calificaciones

---

## Confirmar

Gestor:
SOLO solicita becas.

NO resuelve.

---

# MÓDULO 9 — MAESTRA PANEL VALIDATION

## Objetivo

Validar:
panel Maestra

---

## Verificar

* alumnos
* grupos
* calificaciones lote

---

## Validar

* lotes grandes
* errores parciales
* UI estable

---

# MÓDULO 10 — MODAL VALIDATION

## Objetivo

Validar:
modales Alpine.js

---

## Verificar

### eliminarUsuario()

Modal confirmación correcto.

---

### Asignar Beca

x-for:
listaAlumnos

---

### Nuevo Alumno

x-for:
gruposData

---

## Validar

* arrays vacíos
* render dinámico
* race conditions simples

---

# MÓDULO 11 — DASHBOARD VALIDATION

## Objetivo

Validar:
métricas reales API

---

## Verificar

* datos correctos
* refresh correcto
* errores backend
* loading states

---

# MÓDULO 12 — DEUDORES VALIDATION

## Objetivo

Validar:
badge + vista Deudores

---

## Verificar

### Badge

Conectado:
dashSummary.deudores

Usa:
x-show
x-text

---

### Vista Deudores

Debe:

* usar x-for dinámico
* ordenar por meses
* mostrar severidad visual

---

## Validar

* cero deudores
* listas grandes
* datos inconsistentes

---

# MÓDULO 13 — LOCAL VENDOR VALIDATION

## Objetivo

Validar:
frontend/vendor/

---

## Confirmar

0 CDNs externos.

---

## Verificar

* archivos locales
* rutas correctas
* carga offline

---

## PROHIBIDO

Agregar CDNs externos.

---

# MÓDULO 14 — FRONTEND PAGINATION

## IMPORTANTE

API:
YA soporta:
?page=

Frontend:
AÚN NO implementa paginación.

---

# Objetivo

NO implementar paginación completa ahora
salvo que exista requerimiento REAL inmediato.

---

## Solo validar

* performance actual
* listas existentes
* estabilidad UI

---

## PROHIBIDO

Refactor tablas completas innecesariamente.

---

# MÓDULO 15 — LAN FRONTEND VALIDATION

## Objetivo

Validar:
frontend en LAN

---

## Verificar

* config.js carga
* API_BASE correcto
* acceso otras PCs
* acceso móvil LAN

---

## Validar

* backend offline
* IP dinámica
* Docker compose

---

# MÓDULO 16 — FRONTEND TESTING

## Objetivo

Crear SOLO pruebas críticas frontend.

---

## Prioridad

### auth-guard

### api.js

### refresh

### offline

### dashboards

---

## Validar

* auth
* refresh
* errores red
* modales
* dashboards

---

# DOCUMENTACIÓN OBLIGATORIA

Actualizar:

* MANUAL_USUARIO.md
* TROUBLESHOOTING.md
* FRONTEND.md
* CHANGELOG.md

---

# FRONTEND.md

Debe incluir:

## Arquitectura frontend

## auth-guard.js

## api.js

## Refresh flow

## Offline handling

## Panels

* Admin
* Gestor
* Maestra

---

## Modales Alpine.js

## Dashboard

## Vendor local

---

# TROUBLESHOOTING.md

Agregar:

* frontend no conecta
* refresh loop
* sesión inválida
* config.js falla
* backend offline
* toast no aparece
* dashboard vacío

---

# VALIDACIÓN FINAL OBLIGATORIA

Confirmar:

* login funciona
* refresh funciona
* RBAC funciona
* frontend estable
* backend estable
* Docker estable
* PostgreSQL estable
* LAN estable
* offline handling correcto

---

# CHECKLIST FINAL

## Auth

* guard correcto
* refresh correcto
* logout automático correcto

---

## API

* Bearer correcto
* API_BASE dinámico
* errores manejados

---

## UI

* modales correctos
* dashboards correctos
* deudores correctos
* toast correcto

---

## LAN

* acceso otras PCs
* offline correcto

---

## Docs

* FRONTEND.md actualizado
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
NO reescribir frontend funcional.

Implementar únicamente:

* fixes mínimos
* validaciones reales
* estabilización frontend basada en arquitectura existente.
