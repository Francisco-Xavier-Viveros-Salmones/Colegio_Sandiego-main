# BUGFIX_AND_STABILIZATION_IMPLEMENTATION.md

# CONTEXTO

Proyecto:
SAE Colegio San Diego

Objetivo actual:
Corregir:

* bugs
* errores funcionales
* inconsistencias
* edge cases
* fallos detectados en Auditoría 6

NO desarrollar:

* nuevas features
* refactors grandes
* cambios arquitectura
* optimizaciones innecesarias

---

# OBJETIVO PRINCIPAL

Implementar únicamente:

* correcciones seguras
* fixes mínimos
* estabilización sistema
* validaciones faltantes
* hardening funcional

Basarse EXCLUSIVAMENTE en:

* auditoría 6
* código real
* estructura real
* flujos existentes

NO inventar:

* arquitectura nueva
* servicios nuevos
* patrones inexistentes
* refactors innecesarios

---

# PRIORIDAD MÁXIMA

Objetivo principal:
ESTABILIDAD > FEATURES

El sistema YA funciona.

NO reescribir módulos completos.

Solo:

* corregir
* estabilizar
* validar
* endurecer

---

# REGLAS CRÍTICAS

## PROHIBIDO

* refactorizar arquitectura
* reorganizar backend
* mover frontend
* cambiar endpoints públicos
* alterar contratos API
* cambiar estructura Prisma
* introducir nuevas librerías innecesarias
* modificar JWT flow sin necesidad
* modificar RBAC flow sin necesidad
* optimizar código fuera del alcance
* reescribir módulos funcionales

---

## OBLIGATORIO

* cambios mínimos
* fixes seguros
* mantener compatibilidad
* mantener frontend funcionando
* mantener Docker funcionando
* mantener PostgreSQL funcionando
* mantener LAN funcionando

---

# MODO DE TRABAJO

Antes de modificar:

1. inspeccionar implementación real
2. reproducir bug
3. identificar causa raíz
4. aplicar fix mínimo
5. validar compatibilidad

Si una solución requiere:

* refactor masivo
* reescribir módulo
* cambiar arquitectura

DETENERSE y reportarlo.

---

# FILOSOFÍA IMPLEMENTACIÓN

Preferir:

* validaciones pequeñas
* guards
* checks
* manejo errores
* saneamiento inputs

Evitar:

* sobreingeniería
* abstractions innecesarias
* patrones nuevos
* reestructuración

---

# ÁREAS OBJETIVO

Implementar SOLO fixes relacionados con:

* backend bugs
* frontend integration bugs
* Prisma inconsistencies
* Docker issues
* RBAC edge cases
* JWT edge cases
* LAN edge cases
* validaciones faltantes
* errores silenciosos
* race conditions simples
* status codes incorrectos

---

# BUGFIX 1 — VALIDACIONES FALTANTES

## Objetivo

Corregir:

* inputs inválidos
* null inesperados
* undefined
* NaN
* strings vacíos
* IDs inválidos

---

## Implementación esperada

Agregar:

* guards mínimos
* validaciones existentes reutilizadas
* status codes correctos

---

## PROHIBIDO

Crear nuevo sistema validación.

---

# BUGFIX 2 — STATUS CODES INCORRECTOS

## Objetivo

Corregir respuestas HTTP inconsistentes.

---

## Validar

* 400
* 401
* 403
* 404
* 409
* 422
* 500

---

## Prioridad

Auth y módulos críticos primero.

---

# BUGFIX 3 — ERRORES SILENCIOSOS

## Objetivo

Evitar:

* crashes silenciosos
* promise rejections
* errores tragados
* logs ambiguos

---

## Implementación esperada

Agregar:

* try/catch mínimos
* logs claros
* manejo centralizado existente

---

# BUGFIX 4 — RBAC EDGE CASES

## Objetivo

Corregir:

* acceso indebido
* bypass permisos
* endpoints mal protegidos

---

## Validar

* ADMIN
* GESTOR
* MAESTRA

---

## Verificar especialmente

* reset-password
* endpoints admin
* operaciones sensibles

---

# BUGFIX 5 — JWT EDGE CASES

## Objetivo

Corregir:

* refresh inválidos
* payloads corruptos
* expiraciones mal manejadas
* tokens vacíos
* malformed tokens

---

## PROHIBIDO

Reescribir auth completo.

---

# BUGFIX 6 — PRISMA / DB CONSISTENCY

## Objetivo

Corregir:

* consultas inconsistentes
* relaciones rotas
* deletes inseguros
* errores transacciones

---

## Implementación esperada

Usar:

* Prisma existente
* transacciones existentes
* patterns actuales

---

# BUGFIX 7 — RACE CONDITIONS

## Objetivo

Corregir:

* duplicados
* operaciones concurrentes
* conflictos simples

---

## Implementación esperada

Preferir:

* validaciones previas
* transacciones Prisma
* checks simples

---

## PROHIBIDO

Implementar arquitectura distribuida.

---

# BUGFIX 8 — DOCKER STABILITY

## Objetivo

Corregir:

* mounts incorrectos
* frontend missing
* permisos
* env inconsistentes
* puertos

---

## Validar

docker compose up --build

---

# BUGFIX 9 — LAN STABILITY

## Objetivo

Corregir:

* acceso clientes LAN
* CORS inconsistentes
* IP dinámica
* errores subred

---

## Mantener

Arquitectura offline-first actual.

---

# BUGFIX 10 — FRONTEND INTEGRATION

## Objetivo

Corregir:

* llamadas API rotas
* manejo errores frontend
* endpoints inconsistentes
* responses inesperadas

---

## PROHIBIDO

Reescribir frontend.

---

# DOCUMENTACIÓN OBLIGATORIA

Actualizar:

* CHANGELOG.md
* TROUBLESHOOTING.md
* BUGFIXES.md

---

# BUGFIXES.md DEBE INCLUIR

## Bug

## Causa raíz

## Archivo afectado

## Solución aplicada

## Riesgo mitigado

## Compatibilidad afectada

---

# TESTING OBLIGATORIO

Después de cada fix validar:

* login
* refresh
* RBAC
* frontend acceso
* docker compose
* PostgreSQL
* LAN access

---

# CHECKLIST VALIDACIÓN FINAL

## Backend

* login funciona
* refresh funciona
* endpoints responden
* Prisma conecta
* PostgreSQL estable

---

## Frontend

* admin carga
* gestor carga
* maestra carga
* requests funcionan

---

## Docker

* compose levanta
* frontend visible
* backend responde
* volúmenes correctos

---

## LAN

* acceso desde clientes
* CORS correcto
* IP accesible

---

# FORMATO DE RESPUESTA

Para cada fix mostrar:

## Archivo

## Bug detectado

## Causa raíz

## Cambio aplicado

## Riesgo mitigado

## Compatibilidad afectada

## Validación realizada

---

# IMPORTANTE

Prioridad máxima:
ESTABILIDAD > VELOCIDAD

NO asumir.
NO inventar.
NO sobreingeniería.
NO refactors innecesarios.

Implementar únicamente fixes reales basados en:

* auditoría 6
* código real
* errores reproducibles.
