# 📊 DB_MIGRATION_ANALYSIS — SAE Colegio San Diego
## Análisis Comparativo: SQLite Temporal → PostgreSQL 16 Real

> **Fecha de análisis:** 2026-05-27  
> **BD Origen:** `backend/prisma/schema.prisma` (SQLite prototipo)  
> **BD Destino:** `BD-ColegioSandiego/init-db/01_esquema_base.sql` (PostgreSQL v6)  
> **Responsable:** Plan Implementación v3

---

## 1. MOTOR DE BASE DE DATOS

| Aspecto | Actual (SQLite) | Real (PostgreSQL 16) |
|---|---|---|
| Motor | SQLite 3.x | PostgreSQL 16-alpine |
| Tipos avanzados | No soportado | JSONB, CITEXT, INET, UUID, NUMERIC |
| Columnas GENERATED | No | Sí (`saldo_pendiente` calculated) |
| Triggers | Parcial | Sí (auditoría completa) |
| Extensions | No | pgcrypto, citext, btree_gist |
| Exclusion constraints | No | Sí (`periodo_evaluacion` sin solapamiento) |
| Índices parciales | No | Sí (filtros por `eliminado_en IS NULL`) |
| Transacciones | Básicas | ACID completo, SET LOCAL |
| Soporte timezone | No | TIMESTAMPTZ nativo |

---

## 2. MAPEO COMPLETO DE MODELOS

### 2.1 Usuario (Roles: String → N:M)

| Campo SQLite (Prisma) | Campo PostgreSQL | Cambio |
|---|---|---|
| `id` | `usuario_id` | Rename |
| `nombre` | `nombre_completo` | Rename |
| `username` | `nombre_usuario` | Rename |
| `password` | `password_hash` | Rename |
| `rol` (String) | Via `usuario_rol` N:M | **RESTRUCTURA MAYOR** |
| `activo` | `activo` | Mantiene |
| `createdAt` | `creado_en` | Rename |
| `updatedAt` | `actualizado_en` | Rename |
| *(no existía)* | `eliminado_en` | **NUEVO** (soft delete real) |
| *(no existía)* | `correo`, `telefono` | **NUEVOS** |
| *(no existía)* | `intentos_fallidos`, `bloqueado_hasta` | **NUEVOS** (seguridad) |
| *(no existía)* | `debe_cambiar_pwd`, `ultimo_acceso` | **NUEVOS** |

**Nuevo modelo rol:**
```sql
CREATE TABLE rol (rol_id, codigo, nombre, descripcion, ...)
-- Valores: administrador, directora, empleado, docente
```

**Tabla puente usuario_rol:**
```sql
CREATE TABLE usuario_rol (usuario_rol_id, usuario_id, rol_id, asignado_por, activo, ...)
```

**Mapping de roles para compatibilidad frontend:**
| PostgreSQL (nuevo) | Frontend (RBAC actual) |
|---|---|
| `administrador` | `ADMIN` |
| `directora` | `ADMIN` |
| `empleado` | `GESTOR` |
| `docente` | `MAESTRA` |

---

### 2.2 Alumno

| Campo SQLite | Campo PostgreSQL | Cambio |
|---|---|---|
| `id` | `alumno_id` | Rename |
| `nombre` | `nombre_completo` | Rename |
| `matricula` | `matricula` | Mantiene |
| `curp` | `curp` | Mantiene |
| `grupoId` | Via `inscripcion_ciclo.grupo_id` | **MOVIDO** a inscripción |
| `activo` | `eliminado_en IS NULL` | **Cambio** de soft delete |
| `rfc` | Movido a `tutor.rfc` | **MOVIDO** |
| `regimenFiscal` | Movido a `tutor.regimen_fiscal` | **MOVIDO** |
| `correoFacturacion` | Movido a `tutor.correo_facturacion` | **MOVIDO** |
| `autorizadosRecoger` | `personas_autorizadas` (JSONB) | **REESTRUCTURADO** |
| *(no existía)* | `nivel_id` | **NUEVO** |
| *(no existía)* | `estado`, `fecha_baja`, `motivo_baja` | **NUEVOS** |
| *(no existía)* | `sexo`, `fecha_nacimiento`, `dia_limite_pago` | **NUEVOS** |
| *(no existía)* | `observaciones` | **NUEVO** |

---

### 2.3 PadreTutor → Tutor (MAJOR RENAME)

| Modelo SQLite | Modelo PostgreSQL | Cambio |
|---|---|---|
| `PadreTutor` (1:N por alumno) | `Tutor` + `TutorAlumno` (N:M) | **RESTRUCTURA MAYOR** |
| `padres[]` embebido en alumno | `tutores[]` vía tabla puente | N:M completo |

**Tabla tutor** (antes no existía independientemente):
- `rfc`, `curp`, `regimen_fiscal` movidos desde `alumno`
- `saldo_a_favor` (RF-36)
- `tipo_pago_habitual`
- Datos de facturación CFDI 4.0

**Tabla tutor_alumno** (relación N:M):
- `tipo_relacion`: padre/madre/tutor_legal/abuelo/otro
- `es_responsable_financiero`
- `puede_recoger`
- `recibe_notificaciones`

---

### 2.4 Grupo

| Campo SQLite | Campo PostgreSQL | Cambio |
|---|---|---|
| `id` | `grupo_id` | Rename |
| `nombre` | `nombre` | Mantiene |
| `nivel` (String) | `nivel_id` FK → `nivel_educativo` | **FK real** |
| `titular` (String) | `docente_titular_id` FK → `usuario` | **FK real** |
| `activo` | `eliminado_en IS NULL` | Soft delete |
| *(no existía)* | `ciclo_id`, `grado`, `seccion`, `cupo_maximo` | **NUEVOS** |

---

### 2.5 GrupoMateria (MAJOR CHANGE)

| Campo SQLite | Campo PostgreSQL | Cambio |
|---|---|---|
| `materia` (String) | `materia_id` FK → `materia` | **FK real** |
| `docente` (String) | `docente_id` FK → `usuario` | **FK real** |
| `horario` | `horario` | Mantiene |
| `aula` | `aula` | Mantiene |

**Nueva tabla materia:**
```sql
CREATE TABLE materia (materia_id, nivel_id, nombre, tipo, cuenta_para_promedio, ...)
```

---

### 2.6 Pago (MAJOR RESTRUCTURE)

| Modelo SQLite | Modelo PostgreSQL | Cambio |
|---|---|---|
| `Pago.concepto` | → `calendario_pago.concepto` | **MOVIDO** |
| `Pago.monto` | `pago.monto_total` | Rename |
| `Pago.fecha` | `pago.fecha_pago` | Rename |
| `Pago.tieneRecargo` | Via `recargo` table | **REEMPLAZADO** |
| `Pago.montoRecargo` | Via `recargo.monto_actual` | **REEMPLAZADO** |
| *(no existía)* | `calendario_pago` | **NUEVA TABLA** |
| *(no existía)* | `aplicacion_pago` | **NUEVA TABLA** |
| *(no existía)* | `recargo` | **NUEVA TABLA** |
| `Pago.alumnoId` | `pago.alumno_id` (nullable) | RF-37 multi-hijo |
| *(no existía)* | `pago.tutor_id` | **NUEVO** |
| *(no existía)* | `pago.metodo_pago` | **NUEVO** |

**Nueva estructura de pagos:**
```
calendario_pago (schedule) → aplicacion_pago → pago (transacción)
                              recargo (si aplica)
```

---

### 2.7 Beca (MAJOR RESTRUCTURE)

| Modelo SQLite | Modelo PostgreSQL | Cambio |
|---|---|---|
| `Beca` (por alumno) | `beca` (catálogo) | **SEPARADO** |
| `tipo` (String) | `criterio` + `nombre_beca` | **REESTRUCTURADO** |
| `porcentaje` | `porcentaje` en `beca` | Movido al catálogo |
| *(no existía)* | `asignacion_beca` | **NUEVA TABLA** |
| `SolicitudBeca` | `solicitud_beca` | Unificado al flujo |
| *(no existía)* | `ventana_inscripcion_temprana` | **NUEVA TABLA** |

---

### 2.8 Calificacion

| Campo SQLite | Campo PostgreSQL | Cambio |
|---|---|---|
| `valor` (Float) | `valor_numerico` (NUMERIC 4,2) | Rename + tipo |
| `periodo` (String) | `periodo_id` FK → `periodo_evaluacion` | **FK real** |
| *(no existía)* | `tipo_evaluacion`, `valor_cualitativo` | **NUEVOS** |
| *(no existía)* | `texto_observacion` | **NUEVO** (preescolar) |
| *(no existía)* | `modificada_motivo` | **NUEVO** (auditoría) |

**Nueva tabla periodo_evaluacion:**
```sql
CREATE TABLE periodo_evaluacion (periodo_id, ciclo_id, nivel_id, tipo, numero, nombre, ...)
```

---

### 2.9 CicloEscolar (Config externalizada)

| Campo SQLite | Campo PostgreSQL | Cambio |
|---|---|---|
| `diaCortePago` | → `configuracion_sistema.recargo_dia_tope_mes` | **EXTERNALIZADO** |
| `montoRecargo` | → `configuracion_sistema.recargo_colegiatura_monto` | **EXTERNALIZADO** |
| `mesesParaBaja` | → `configuracion_sistema.baja_temporal_meses_adeudo` | **EXTERNALIZADO** |
| *(no existía)* | `configuracion_sistema` tabla completa | **NUEVA TABLA** |

---

### 2.10 AlumnoCiclo → InscripcionCiclo

| Campo SQLite | Campo PostgreSQL | Cambio |
|---|---|---|
| `estadoPago` | `estado_financiero` | Rename |
| `mesesAdeudo` | `meses_adeudo` | Rename |
| *(no existía)* | `estado_en_ciclo` | **NUEVO** |
| *(no existía)* | `es_ingreso_tardio` | **NUEVO** |
| `planPago` (String DEPRECATED) | `plan_pago_id` FK → `plan_pago` | FK real |

---

## 3. TABLAS NUEVAS SIN EQUIVALENTE EN SQLITE

| Tabla PostgreSQL | Propósito |
|---|---|
| `rol` | Catálogo de roles |
| `usuario_rol` | Asignación N:M usuario↔rol |
| `nivel_educativo` | Catálogo: PREESCOLAR, PRIMARIA, SECUNDARIA, BACHILLERATO |
| `materia` | Catálogo de materias por nivel |
| `periodo_evaluacion` | Periodos académicos por ciclo/nivel |
| `tutor` | Tutores/padres de alumnos |
| `tutor_alumno` | N:M tutor↔alumno |
| `tarifa` | Tarifas por ciclo y nivel |
| `calendario_pago` | Calendario de cobros por alumno |
| `aplicacion_pago` | Cómo se distribuye un pago |
| `recargo` | Recargos con trazabilidad |
| `movimiento_saldo` | Bolsa de saldo a favor (RF-36) |
| `factura` | Facturas CFDI 4.0 |
| `factura_pago` | N:M factura↔pago |
| `asignacion_beca` | Becas asignadas por ciclo |
| `ventana_inscripcion_temprana` | Ventanas de inscripción temprana |
| `solicitud_beca` | Workflow RF-21 (antes era SolicitudBeca simplificado) |
| `documento` | Expediente digital |
| `notificacion` | Notificaciones automáticas |
| `intento_login` | Log de intentos de acceso |
| `log_auditoria` | Auditoría completa de cambios |
| `configuracion_sistema` | Parámetros configurables en DB |

---

## 4. DIFERENCIAS CRÍTICAS DE DISEÑO

### 4.1 Soft Delete
| SQLite | PostgreSQL |
|---|---|
| `activo: false` | `eliminado_en: timestamp NOT NULL` |
| Queries: `WHERE activo = true` | Queries: `WHERE eliminado_en IS NULL` |

### 4.2 Tipos de datos
| SQLite | PostgreSQL |
|---|---|
| `Float` | `NUMERIC(12,2)` (exacto) |
| `String` para JSON | `JSONB` nativo |
| `DateTime` | `TIMESTAMPTZ` (timezone-aware) |
| `String` para IPs | `INET` |
| N/A | `UUID` (SAT) |
| N/A | `CITEXT` (emails case-insensitive) |

### 4.3 Columna GENERATED
La columna `saldo_pendiente` en `calendario_pago` es:
```sql
saldo_pendiente NUMERIC GENERATED ALWAYS AS (monto_original + monto_recargo - monto_pagado) STORED
```
PostgreSQL la mantiene coherente automáticamente. Prisma la define como read-only con `@default(dbgenerated(...))`.

---

## 5. INCOMPATIBILIDADES IDENTIFICADAS

| # | Área | Problema | Solución |
|---|---|---|---|
| 1 | Roles | Frontend espera `ADMIN/GESTOR/MAESTRA` | Mapper en auth service |
| 2 | Alumno.activo | Queries usan `activo: true` | Cambiar a `eliminadoEn: null` |
| 3 | Grupo.nivel | Frontend usa string "PRIMARIA" | Incluir `nivel.codigo` en response |
| 4 | Pago.concepto | Movido a `calendario_pago` | Nuevo endpoint de calendario |
| 5 | Beca denormalizada | Era por alumno, ahora catálogo | Mapper en becas repository |
| 6 | GrupoMateria.materia | Era string, ahora FK | Auto-lookup por nombre |
| 7 | CicloEscolar.diaCortePago | Hardcodeado en modelo | Leer de `configuracion_sistema` |
| 8 | Calificacion.periodo | Era string, ahora FK a periodo | Mantener string en API, mapear en DB |
| 9 | PadreTutor | Era 1:N, ahora N:M tutor_alumno | Mapper para backward compat |
| 10 | Upsert calificaciones | @@unique cambió | Añadir `@@unique([alumnoId, grupoMateriaId, periodoId])` |

---

## 6. RIESGOS DE MIGRACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Pérdida de datos SQLite existentes | Medio | Alto | Backup automático antes de migrar |
| Mappers de roles incorrectos | Bajo | Alto | Tests unitarios de auth |
| Frontend rompe por cambio de campo | Medio | Alto | Mantener nombres de respuesta API |
| `saldo_pendiente` no calculado | Bajo | Medio | PostgreSQL lo calcula automáticamente |
| Triggers de auditoría en dev | Bajo | Bajo | Docker init-db los crea automáticamente |
| CITEXT no disponible en SQLite | N/A | N/A | Solo aplica en PostgreSQL |

---

## 7. ESTRATEGIA DE MIGRACIÓN RECOMENDADA

### Paso 1: Backup SQLite (si hay datos en producción)
```bash
npm run db:backup
```

### Paso 2: Levantar PostgreSQL via Docker
```bash
docker compose up postgres_sae -d
# Esperar healthcheck: pg_isready -U sae_admin
```

### Paso 3: Generar cliente Prisma
```bash
npm run db:generate
```

### Paso 4: Ejecutar migración inicial
```bash
npm run db:migrate
```

### Paso 5: Poblar datos iniciales
```bash
npm run db:seed
```

### Paso 6: Validar backend
```bash
npm run dev
# Verificar: GET /api/v1/auth/login, /api/v1/alumnos, /api/v1/pagos
```

---

## 8. MAPA DE IMPACTO TOTAL

### Impacto en Repositorios
| Repositorio | Cambio | Prioridad |
|---|---|---|
| `auth.repository.js` | Query por `nombre_usuario`, derivar rol | 🔴 Crítico |
| `alumnos.repository.js` | `nombre_completo`, soft delete, tutores | 🔴 Crítico |
| `pagos.repository.js` | Nueva estructura con calendario | 🔴 Crítico |
| `becas.repository.js` | Catálogo + asignaciones | 🔴 Crítico |
| `calificaciones.repository.js` | `valor_numerico`, periodo_id | 🔴 Crítico |
| `usuarios.repository.js` | Roles N:M, `nombre_usuario` | 🔴 Crítico |
| `grupos.repository.js` | `nivel_id` FK, soft delete | 🟡 Alto |

### Impacto en Servicios
| Servicio | Cambio | Prioridad |
|---|---|---|
| `auth.service.js` | Mapear roles N:M → string para JWT | 🔴 Crítico |
| `pagos.service.js` | Leer config de `configuracion_sistema` | 🔴 Crítico |
| `alumnos.service.js` | Soft delete con `eliminadoEn` | 🟡 Alto |

### Impacto en Frontend
| Archivo | Cambio | Prioridad |
|---|---|---|
| `login.html` | CDN → vendor local | 🟡 Alto |
| `admin_panel.html` | CDN → vendor local | 🟡 Alto |
| `gestor_panel.html` | CDN → vendor local | 🟡 Alto |
| `maestra_panel.html` | CDN → vendor local | 🟡 Alto |
| Todos los paneles | Banner offline, modales destructivos | 🟡 Alto |

---

*Documento generado por el proceso de implementación v3 — SAE Colegio San Diego*
