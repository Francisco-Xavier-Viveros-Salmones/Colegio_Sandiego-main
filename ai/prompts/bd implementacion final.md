# DATABASE_FINALIZATION_IMPLEMENTATION.md

# CONTEXTO

Proyecto:
SAE Colegio San Diego

Estado actual BD:
95%

Objetivo:
Completar y validar estabilidad final de PostgreSQL + Prisma SIN refactorizar arquitectura.

---

# IMPORTANTE

El sistema YA funciona.

NO reescribir:

* Prisma schema
* migraciones
* relaciones
* arquitectura DB

SOLO:

* validar
* estabilizar
* corregir edge cases
* cerrar pendientes mínimos

---

# REGLAS CRÍTICAS

## PROHIBIDO

* refactorizar schema Prisma
* renombrar modelos
* cambiar relaciones existentes
* modificar nombres snake_case
* alterar migraciones históricas
* recrear base datos
* cambiar PostgreSQL por SQLite
* introducir ORM nuevo
* modificar Docker PostgreSQL sin necesidad
* alterar soft delete global

---

## OBLIGATORIO

* cambios mínimos
* mantener compatibilidad total
* mantener migraciones actuales
* mantener Prisma actual
* mantener PostgreSQL actual
* validar antes de modificar

---

# MODO DE TRABAJO

Antes de modificar:

1. inspeccionar implementación REAL
2. confirmar bug real
3. aplicar fix mínimo
4. validar compatibilidad

Si una solución requiere:

* refactor masivo
* recrear migraciones
* cambiar arquitectura DB

DETENERSE y reportarlo.

---

# OBJETIVO

Completar únicamente:

* validaciones faltantes
* edge cases PostgreSQL
* scripts DB
* estabilidad Prisma
* consistencia datos
* documentación DB
* testing DB

NO crear nuevas features.

---

# ESTADO ACTUAL CONFIRMADO

## YA IMPLEMENTADO

* Prisma v6
* 33 modelos
* snake_case exacto
* soft delete
* usuario_rol N:M
* unique constraints críticas
* PostgreSQL types correctos
* baseline migration
* init-db scripts
* locale UTF-8 correcto
* db-validate.js
* db-backup.js
* db-restore.js
* db-reset.js protegido
* montoCapital protegido con Math.max(0)

---

# PRIORIDAD

NO volver a implementar lo ya completado.

SOLO validar:

* estabilidad
* edge cases
* consistencia
* documentación
* testing

---

# MÓDULO 1 — PRISMA CONSISTENCY VALIDATION

## Objetivo

Validar:

* relaciones
* foreign keys
* soft delete consistency
* unique constraints

---

## Verificar

### Calificacion

Debe mantener:
@@unique([alumnoId, grupoMateriaId, periodoId])

---

### InscripcionCiclo

Debe mantener:
@@unique([alumnoId, cicloId])

---

## Validar

* inserts duplicados
* deletes lógicos
* relaciones huérfanas

---

## PROHIBIDO

Modificar constraints sin evidencia real.

---

# MÓDULO 2 — SOFT DELETE VALIDATION

## Objetivo

Validar que:
eliminadoEn funcione consistentemente.

---

## Verificar

* queries activas
* filtros eliminadoEn=null
* relaciones activas
* restores lógicos

---

## Validar

Que registros eliminados:

* NO aparezcan en consultas normales
* NO rompan relaciones

---

# MÓDULO 3 — DB SCRIPTS VALIDATION

## Objetivo

Validar scripts existentes.

---

## Scripts obligatorios

### db-validate.js

Verificar:

* conexión
* PostgreSQL >= 14
* 33 tablas
* seed mínimo

---

### db-backup.js

Verificar:

* pg_dump
* timestamps
* retención backups

---

### db-restore.js

Verificar:

* confirmación CONFIRMAR
* restore seguro

---

### db-reset.js

Verificar:

* bloqueo producción
* validaciones NODE_ENV

---

# MÓDULO 4 — PRISMA EDGE CASES

## Objetivo

Corregir únicamente:

* null inesperados
* Decimal issues
* Date inconsistencies
* Prisma exceptions silenciosas

---

## Implementación esperada

Usar:

* guards mínimos
* try/catch mínimos
* validaciones pequeñas

---

## PROHIBIDO

Reescribir services completos.

---

# MÓDULO 5 — POSTGRESQL VALIDATION

## Objetivo

Validar estabilidad PostgreSQL.

---

## Verificar

* locale UTF-8
* timestamps timezone
* decimals correctos
* índices
* migrations
* conexiones Docker

---

## Validar especialmente

Caracteres:

* ñ
* tildes
* UTF-8

---

# MÓDULO 6 — MIGRATIONS VALIDATION

## Objetivo

Validar:

* historial consistente
* migration_lock.toml
* baseline migration

---

## Verificar

Que:

* migrate deploy funcione
* migrate status funcione
* schema sincronizado

---

## PROHIBIDO

Recrear migraciones históricas.

---

# MÓDULO 7 — DATA INTEGRITY

## Objetivo

Validar:

* pagos
* becas
* calificaciones
* relaciones críticas

---

## Validaciones obligatorias

### AplicacionPago

montoAplicado:
NUNCA negativo.

Mantener:
Math.max(0, montoCapital)

---

## Validar

* cálculos
* Decimal precision
* rounding issues

---

# MÓDULO 8 — DOCKER POSTGRESQL

## Objetivo

Validar:

* persistencia volumes
* conexión backend
* init scripts
* restore backups

---

## Validar

docker compose up

debe:

* crear DB
* aplicar scripts
* conectar Prisma

---

# MÓDULO 9 — TESTING DB

## Objetivo

Crear SOLO pruebas críticas DB.

---

## Prioridad

### Constraints

* duplicados
* FK inválidas
* soft delete

---

### Prisma

* conexión
* queries críticas
* transacciones

---

### Scripts

* validate
* backup
* restore

---

# DOCUMENTACIÓN OBLIGATORIA

Actualizar:

* DATABASE.md
* CHANGELOG.md
* BACKUP_AND_RECOVERY.md

---

# DATABASE.md DEBE INCLUIR

## Arquitectura Prisma/PostgreSQL

## Relaciones principales

## Soft delete

## Constraints críticas

## Scripts DB

## Backup/Restore

## Migraciones

## Docker PostgreSQL

---

# BACKUP_AND_RECOVERY.md

Debe incluir:

## Backup

node scripts/db-backup.js

---

## Restore

node scripts/db-restore.js

---

## Migraciones

npx prisma migrate deploy

---

## Validate

node scripts/db-validate.js

---

# VALIDACIÓN FINAL OBLIGATORIA

Confirmar:

* Prisma conecta
* PostgreSQL estable
* Docker estable
* migraciones correctas
* backups funcionan
* restore funciona
* soft delete consistente
* constraints funcionan
* frontend sigue operativo

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
ESTABILIDAD > REFACTOR

NO asumir.
NO inventar.
NO recrear migraciones.
NO modificar schema innecesariamente.

Implementar únicamente:

* fixes mínimos
* validaciones reales
* estabilización DB basada en código existente.
