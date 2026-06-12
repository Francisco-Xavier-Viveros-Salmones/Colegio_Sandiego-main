# 🗄️ DATABASE — SAE Colegio San Diego

**Motor:** PostgreSQL 16 · **ORM:** Prisma 5.x · **Schema:** v6
**Archivo fuente:** `backend/prisma/schema.prisma`
**SQL de referencia:** `BD-ColegioSandiego/init-db/01_esquema_base.sql`

---

## 📐 Convenciones del Schema

| Convención | Regla |
|------------|-------|
| Nombres de tabla | `snake_case` (mapeados con `@@map()`) |
| Modelos Prisma | `PascalCase` |
| Columnas | `snake_case` (mapeadas con `@map()`) |
| Timestamps | `@db.Timestamptz()` — con zona horaria explícita |
| Fechas puras | `@db.Date` — sin hora |
| Montos | `@db.Decimal(12,2)` — sin pérdida de precisión |
| Soft delete | Campo `eliminado_en TIMESTAMPTZ NULL` (no `activo bool`) |
| Roles | N:M via tabla puente `usuario_rol` |
| IDs | `@id @default(autoincrement())` — Int secuencial |

---

## 🗺️ Mapa de Bloques

```
┌──────────────────────────────────────────────────────┐
│  BLOQUE 1: SEGURIDAD          usuario, rol, usuario_rol│
│  BLOQUE 2: CATÁLOGOS          nivel_educativo, ciclo_escolar │
│  BLOQUE 3: ACADÉMICA          grupo, materia, grupo_materia, periodo_evaluacion │
│  BLOQUE 4: COMUNIDAD          tutor, alumno, tutor_alumno │
│  BLOQUE 5: INSCRIPCIÓN        plan_pago, inscripcion_ciclo │
│  BLOQUE 6: ACADÉMICA          calificacion, asistencia │
│  BLOQUE 7: FINANZAS           tarifa, calendario_pago, pago, aplicacion_pago, recargo, movimiento_saldo, factura, factura_pago │
│  BLOQUE 8: BECAS              beca, solicitud_beca, asignacion_beca, ventana_inscripcion_temprana │
│  BLOQUE 9: SOPORTE            documento, notificacion │
│  BLOQUE 10: AUDITORÍA         intento_login, log_auditoria, configuracion_sistema │
└──────────────────────────────────────────────────────┘
Total: 33 modelos / 33 tablas PostgreSQL
```

---

## BLOQUE 1 — SEGURIDAD

### `usuario` (tabla: `usuario`)

| Campo | Tipo Prisma | Tipo PG | Notas |
|-------|------------|---------|-------|
| `usuarioId` | `Int @id` | `SERIAL PK` | |
| `nombreUsuario` | `String @unique` | `VARCHAR(80)` | Login único |
| `nombreCompleto` | `String` | `VARCHAR(120)` | Nombre para mostrar |
| `correo` | `String? @unique` | `VARCHAR(120)` | Opcional, único |
| `telefono` | `String?` | `VARCHAR(15)` | |
| `passwordHash` | `String` | `VARCHAR(255)` | bcrypt 10-12 rounds |
| `activo` | `Boolean` | `BOOLEAN` | `DEFAULT true` |
| `intentosFallidos` | `Int` | `INT` | `DEFAULT 0` |
| `bloqueadoHasta` | `DateTime?` | `TIMESTAMPTZ` | Lockout temporal |
| `ultimoAcceso` | `DateTime?` | `TIMESTAMPTZ` | |
| `debeCambiarPwd` | `Boolean` | `BOOLEAN` | `DEFAULT false` — forzado tras reset |
| `creadoEn` | `DateTime` | `TIMESTAMPTZ` | `DEFAULT now()` |
| `actualizadoEn` | `DateTime @updatedAt` | `TIMESTAMPTZ` | Auto-gestionado Prisma |
| `eliminadoEn` | `DateTime?` | `TIMESTAMPTZ` | Soft delete |

---

### `rol` (tabla: `rol`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `rolId` | `SERIAL PK` | |
| `codigo` | `VARCHAR(20) UNIQUE` | `administrador`, `directora`, `empleado`, `docente` |
| `nombre` | `VARCHAR(60)` | Nombre legible |
| `descripcion` | `TEXT?` | |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

---

### `usuario_rol` (tabla: `usuario_rol`)

Tabla puente N:M entre `usuario` y `rol`. Permite múltiples roles por usuario.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `usuarioRolId` | `SERIAL PK` | |
| `usuarioId` | `INT FK→usuario` | `ON DELETE CASCADE` |
| `rolId` | `INT FK→rol` | `ON DELETE RESTRICT` |
| `asignadoPor` | `INT? FK→usuario` | Quién asignó el rol |
| `activo` | `BOOLEAN` | `DEFAULT true` |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

**Constraint:** `@@unique([usuarioId, rolId])`

> **Mapeo de roles al sistema:**
> `administrador` + `directora` → `ADMIN` · `empleado` → `GESTOR` · `docente` → `MAESTRA`

---

## BLOQUE 2 — CATÁLOGOS

### `nivel_educativo` (tabla: `nivel_educativo`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `nivelId` | `SERIAL PK` | |
| `codigo` | `VARCHAR(15) UNIQUE` | `PRIMARIA`, `SECUNDARIA`, `BACHILLERATO`, `PREESCOLAR` |
| `nombre` | `VARCHAR(60)` | |
| `rvoe` | `VARCHAR(40)?` | Reconocimiento de Validez Oficial |
| `orden` | `INT` | Para ordenamiento |

---

### `ciclo_escolar` (tabla: `ciclo_escolar`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `cicloId` | `SERIAL PK` | |
| `nombre` | `VARCHAR(20) UNIQUE` | Ej: `2026-2027` |
| `fechaInicio` | `DATE` | |
| `fechaFin` | `DATE` | |
| `activo` | `BOOLEAN` | `DEFAULT false` — solo 1 ciclo activo a la vez |

---

## BLOQUE 3 — ESTRUCTURA ACADÉMICA

### `grupo` (tabla: `grupo`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `grupoId` | `SERIAL PK` | |
| `cicloId` | `INT FK→ciclo_escolar` | |
| `nivelId` | `INT FK→nivel_educativo` | |
| `grado` | `VARCHAR(10) NOT NULL` | Ej: `4`, `2do` |
| `seccion` | `VARCHAR(5) NOT NULL` | Ej: `A`, `B` |
| `nombre` | `VARCHAR(60)` | Nombre compuesto, ej: `Primaria 4°A` |
| `docenteTitularId` | `INT? FK→usuario` | `ON DELETE SET NULL` |
| `cupoMaximo` | `INT?` | |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

**Constraint:** `@@unique([cicloId, nivelId, grado, seccion])` — no se puede duplicar grupo en mismo ciclo

---

### `materia` (tabla: `materia`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `materiaId` | `SERIAL PK` | |
| `nivelId` | `INT FK→nivel_educativo` | |
| `claveSep` | `VARCHAR(20)?` | Clave SEP oficial |
| `nombre` | `VARCHAR(80)` | Ej: `Matemáticas` |
| `horasSemanales` | `INT?` | |
| `creditos` | `DECIMAL(4,1)?` | |
| `tipo` | `VARCHAR(15)` | `curricular`, `extracurricular` |
| `cuentaParaPromedio` | `BOOLEAN` | `DEFAULT true` |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

**Constraint:** `@@unique([nivelId, nombre, tipo])`

---

### `grupo_materia` (tabla: `grupo_materia`)

Tabla puente Grupo ↔ Materia. Una materia puede estar en varios grupos; un grupo puede tener varias materias.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `grupoMateriaId` | `SERIAL PK` | ID usado en calificaciones y asistencias |
| `grupoId` | `INT FK→grupo` | |
| `materiaId` | `INT FK→materia` | |
| `docenteId` | `INT? FK→usuario` | Docente asignado a esta materia en este grupo |
| `horario` | `VARCHAR(80)?` | Ej: `Lun-Mié-Vie 7:00-8:30` |
| `aula` | `VARCHAR(40)?` | |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete (no tiene campo `activo`) |

**Constraint:** `@@unique([grupoId, materiaId])`

> ⚠️ **ERR-005:** Filtrar soft delete con `eliminadoEn: null` — NO existe campo `activo` en `GrupoMateria`.

---

### `periodo_evaluacion` (tabla: `periodo_evaluacion`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `periodoId` | `SERIAL PK` | |
| `cicloId` | `INT FK→ciclo_escolar` | |
| `nivelId` | `INT FK→nivel_educativo` | |
| `tipo` | `VARCHAR(15)` | `trimestre`, `bimestre`, `semestre`, `final` |
| `numero` | `INT` | 1, 2, 3… |
| `nombre` | `VARCHAR(40)` | Ej: `Trimestre 1` |
| `fechaInicio` | `DATE` | |
| `fechaFin` | `DATE` | |
| `esFinalCiclo` | `BOOLEAN` | `DEFAULT false` |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

**Constraint:** `@@unique([cicloId, nivelId, tipo, numero])` — se crea automáticamente si no existe (`resolverPeriodoId()`)

---

## BLOQUE 4 — COMUNIDAD ESCOLAR

### `tutor` (tabla: `tutor`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `tutorId` | `SERIAL PK` | |
| `nombreCompleto` | `VARCHAR(120)` | |
| `correoElectronico` | `VARCHAR(120)?` | |
| `telefono` | `VARCHAR(15)?` | |
| `rfc` | `VARCHAR(13)? UNIQUE` | Para facturación |
| `curp` | `VARCHAR(18)?` | |
| `regimenFiscal` | `VARCHAR(10)?` | Código SAT |
| `usoCfdi` | `VARCHAR(10)?` | |
| `correoFacturacion` | `VARCHAR(120)?` | |
| `requiereFactura` | `BOOLEAN` | `DEFAULT false` |
| `tipoPagoHabitual` | `VARCHAR(15)?` | `efectivo`, `transferencia`, `tarjeta` |
| `saldoAFavor` | `DECIMAL(12,2)` | `DEFAULT 0` |
| `activo` | `BOOLEAN` | `DEFAULT true` |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

---

### `alumno` (tabla: `alumno`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `alumnoId` | `SERIAL PK` | |
| `matricula` | `VARCHAR(30) UNIQUE` | Ej: `SDM-2026-0001` |
| `curp` | `VARCHAR(18)? UNIQUE` | |
| `nombreCompleto` | `VARCHAR(120)` | |
| `fechaNacimiento` | `DATE?` | |
| `sexo` | `CHAR(1)?` | `M` / `F` |
| `nivelId` | `INT? FK→nivel_educativo` | |
| `estado` | `VARCHAR(20)` | `Activo`, `Baja Temporal`, `Baja Definitiva` |
| `diaLimitePago` | `INT?` | Override del día de corte global |
| `personasAutorizadas` | `JSONB` | `DEFAULT '[]'` — array de `{nombre, parentesco}` |
| `observaciones` | `TEXT?` | |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

---

### `tutor_alumno` (tabla: `tutor_alumno`)

Tabla puente N:M Tutor ↔ Alumno.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `tutorAlumnoId` | `SERIAL PK` | |
| `tutorId` | `INT FK→tutor` | `ON DELETE CASCADE` |
| `alumnoId` | `INT FK→alumno` | `ON DELETE CASCADE` |
| `tipoRelacion` | `VARCHAR(15)` | `padre`, `madre`, `tutor`, `abuelo`, etc. |
| `esResponsableFinanciero` | `BOOLEAN` | `DEFAULT false` |
| `puedeRecoger` | `BOOLEAN` | `DEFAULT true` |
| `recibeNotificaciones` | `BOOLEAN` | `DEFAULT true` |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

**Constraint:** `@@unique([tutorId, alumnoId])`

---

## BLOQUE 5 — PLAN DE PAGO E INSCRIPCIÓN

### `plan_pago` (tabla: `plan_pago`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `planPagoId` | `SERIAL PK` | |
| `cicloId` | `INT FK→ciclo_escolar` | |
| `nombre` | `VARCHAR(40)` | Ej: `Plan 10 meses` |
| `meses` | `INT` | Número de mensualidades |
| `montoMensual` | `DECIMAL(12,2)` | Monto mensual base |
| `montoDiciembre` | `DECIMAL(12,2)` | Cobro doble en diciembre |
| `activo` | `BOOLEAN` | `DEFAULT true` |

**Constraint:** `@@unique([cicloId, nombre])`

---

### `inscripcion_ciclo` (tabla: `inscripcion_ciclo`)

Inscripción de un alumno en un ciclo escolar (1 por ciclo por alumno).

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `inscripcionId` | `SERIAL PK` | |
| `alumnoId` | `INT FK→alumno` | |
| `cicloId` | `INT FK→ciclo_escolar` | |
| `grupoId` | `INT FK→grupo` | |
| `planPagoId` | `INT? FK→plan_pago` | Plan asignado |
| `estadoEnCiclo` | `VARCHAR(20)` | `activa`, `baja_temporal`, `baja_definitiva` |
| `estadoFinanciero` | `VARCHAR(20)` | `al_corriente`, `pendiente`, `suspendido` |
| `mesesAdeudo` | `INT` | `DEFAULT 0` |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

**Constraint:** `@@unique([alumnoId, cicloId])` — un alumno solo se inscribe una vez por ciclo

---

## BLOQUE 6 — CALIFICACIONES Y ASISTENCIA

### `calificacion` (tabla: `calificacion`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `calificacionId` | `SERIAL PK` | |
| `alumnoId` | `INT FK→alumno` | |
| `grupoMateriaId` | `INT FK→grupo_materia` | |
| `periodoId` | `INT FK→periodo_evaluacion` | Resuelto automáticamente desde string |
| `tipoEvaluacion` | `VARCHAR(15)` | `numerica`, `cualitativa` |
| `valorNumerico` | `DECIMAL(4,2)?` | Rango 0.00–10.00 |
| `valorCualitativo` | `VARCHAR(5)?` | `A`, `B`, `C`, `NA` |
| `cuentaParaPromedio` | `BOOLEAN` | `DEFAULT true` |
| `registradaPor` | `INT? FK→usuario` | |
| `registradaEn` | `TIMESTAMPTZ` | `DEFAULT now()` |

**Constraint:** `@@unique([alumnoId, grupoMateriaId, periodoId])` — permite upsert seguro

---

### `asistencia` (tabla: `asistencia`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `asistenciaId` | `SERIAL PK` | |
| `alumnoId` | `INT FK→alumno` | |
| `grupoMateriaId` | `INT FK→grupo_materia` | |
| `fecha` | `DATE` | |
| `estado` | `VARCHAR(10)` | `PRESENTE`, `AUSENTE`, `RETARDO` |
| `justificacion` | `TEXT?` | |
| `registradaPor` | `INT? FK→usuario` | |

**Constraint:** `@@unique([alumnoId, grupoMateriaId, fecha])` — 1 registro por alumno/materia/día

---

## BLOQUE 7 — FINANZAS

### `tarifa` (tabla: `tarifa`)

Catálogo de tarifas por nivel y ciclo.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `tarifaId` | `SERIAL PK` | |
| `cicloId` | `INT FK→ciclo_escolar` | |
| `nivelId` | `INT FK→nivel_educativo` | |
| `concepto` | `VARCHAR(15)` | `colegiatura`, `inscripcion`, `material` |
| `monto` | `DECIMAL(12,2)` | |

**Constraint:** `@@unique([cicloId, nivelId, concepto])`

---

### `calendario_pago` (tabla: `calendario_pago`)

Cuota programada por alumno (schedule de pagos).

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `calendarioPagoId` | `SERIAL PK` | |
| `alumnoId` | `INT FK→alumno` | |
| `cicloId` | `INT FK→ciclo_escolar` | |
| `concepto` | `VARCHAR(15)` | `colegiatura`, `inscripcion`, etc. |
| `mes` | `VARCHAR(15)?` | Ej: `septiembre` |
| `fechaVencimiento` | `DATE` | |
| `montoOriginal` | `DECIMAL(12,2)` | |
| `montoPagado` | `DECIMAL(12,2)` | `DEFAULT 0` |
| `montoRecargo` | `DECIMAL(12,2)` | `DEFAULT 0` |
| `saldoPendiente` | `DECIMAL(12,2)` | **GENERATED ALWAYS AS** `(monto_original + monto_recargo - monto_pagado)` STORED |
| `estadoCobro` | `VARCHAR(15)` | `pendiente`, `parcial`, `pagado` |
| `liquidadoAt` | `TIMESTAMPTZ?` | Cuándo se saldó |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

**Constraint:** `@@unique([alumnoId, cicloId, concepto, mes])`

---

### `pago` (tabla: `pago`)

Registro de un pago efectivo realizado.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `pagoId` | `SERIAL PK` | |
| `alumnoId` | `INT? FK→alumno` | |
| `tutorId` | `INT? FK→tutor` | |
| `fechaPago` | `DATE` | `DEFAULT now()` |
| `montoTotal` | `DECIMAL(12,2)` | Monto pagado (capital + recargo) |
| `metodoPago` | `VARCHAR(15)` | `efectivo`, `transferencia`, `tarjeta` |
| `registradoPor` | `INT? FK→usuario` | |
| `registradoEn` | `TIMESTAMPTZ` | |

---

### `aplicacion_pago` (tabla: `aplicacion_pago`)

Vincula un `pago` con su `calendario_pago` correspondiente.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `aplicacionId` | `SERIAL PK` | |
| `pagoId` | `INT FK→pago` | `ON DELETE CASCADE` |
| `calendarioPagoId` | `INT FK→calendario_pago` | |
| `montoAplicado` | `DECIMAL(12,2)` | |
| `aplicadoA` | `VARCHAR(15)` | `capital`, `recargo` |

**Constraint:** `@@unique([pagoId, calendarioPagoId, aplicadoA])`

---

### `recargo` (tabla: `recargo`)

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `recargoId` | `SERIAL PK` | |
| `calendarioPagoId` | `INT FK→calendario_pago` | `ON DELETE CASCADE` |
| `montoOriginal` | `DECIMAL(12,2)` | Monto al momento de creación |
| `montoActual` | `DECIMAL(12,2)` | Puede modificarse con justificación |
| `estado` | `VARCHAR(15)` | `aplicado`, `condonado`, `modificado` |
| `aplicadoEn` | `DATE` | |

---

### `movimiento_saldo` (tabla: `movimiento_saldo`)

Registro de créditos/débitos en el saldo a favor de un tutor.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `movimientoId` | `SERIAL PK` | |
| `tutorId` | `INT FK→tutor` | `ON DELETE CASCADE` |
| `tipo` | `VARCHAR(15)` | `credito`, `debito` |
| `monto` | `DECIMAL(12,2)` | |
| `pagoId` | `INT? FK→pago` | |
| `aplicacionId` | `INT? FK→aplicacion_pago` | |

---

### `factura` (tabla: `factura`)

Factura CFDI emitida para un tutor.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `facturaId` | `SERIAL PK` | |
| `tutorId` | `INT FK→tutor` | |
| `numeroFactura` | `VARCHAR(40)? UNIQUE` | Folio interno |
| `uuidSat` | `UUID?` | UUID del CFDI |
| `montoTotal` | `DECIMAL(12,2)` | |
| `estado` | `VARCHAR(15)` | `emitida`, `cancelada`, `vigente` |

---

### `factura_pago` (tabla: `factura_pago`)

Tabla puente Factura ↔ Pago (N:M).

**PK compuesta:** `@@id([facturaId, pagoId])`

---

## BLOQUE 8 — BECAS

### `beca` (tabla: `beca`)

Catálogo de tipos de beca.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `becaId` | `SERIAL PK` | |
| `nombreBeca` | `VARCHAR(60) UNIQUE` | |
| `criterio` | `VARCHAR(25)` | `HERMANOS`, `EXCELENCIA`, `INSCRIPCION_TEMPRANA`, `OTRO` |
| `porcentaje` | `DECIMAL(5,2)` | Ej: `15.00`, `20.00` |
| `eliminadoEn` | `TIMESTAMPTZ?` | Soft delete |

---

### `solicitud_beca` (tabla: `solicitud_beca`)

Solicitud creada por GESTOR → aprobada/rechazada por ADMIN (RF-21).

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `solicitudId` | `SERIAL PK` | |
| `alumnoId` | `INT FK→alumno` | |
| `becaId` | `INT FK→beca` | |
| `cicloId` | `INT FK→ciclo_escolar` | |
| `motivo` | `TEXT` | |
| `estado` | `VARCHAR(15)` | `pendiente`, `aprobada`, `rechazada` |
| `solicitadaPor` | `INT? FK→usuario` | GESTOR |
| `resueltaPor` | `INT? FK→usuario` | ADMIN |
| `fechaSolicitud` | `TIMESTAMPTZ` | |
| `fechaResolucion` | `TIMESTAMPTZ?` | |

---

### `asignacion_beca` (tabla: `asignacion_beca`)

Beca activa asignada a un alumno en un ciclo.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `asignacionId` | `SERIAL PK` | |
| `alumnoId` | `INT FK→alumno` | |
| `becaId` | `INT FK→beca` | |
| `cicloId` | `INT FK→ciclo_escolar` | |
| `solicitudId` | `INT? FK→solicitud_beca` | Origen de la asignación |
| `estado` | `VARCHAR(15)` | `activa`, `retirada` |
| `fechaAsignacion` | `DATE` | |
| `fechaRetiro` | `DATE?` | |

**Constraint:** `@@unique([alumnoId, becaId, cicloId])` — un alumno no puede tener la misma beca dos veces en el mismo ciclo

---

### `ventana_inscripcion_temprana` (tabla: `ventana_inscripcion_temprana`)

Define el periodo de inscripción temprana para aplicar la beca correspondiente.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `ventanaId` | `SERIAL PK` | |
| `cicloId` | `INT FK→ciclo_escolar` | |
| `fechaInicio` | `DATE` | |
| `fechaFin` | `DATE` | |
| `becaId` | `INT FK→beca` | Beca que aplica por inscripción temprana |
| `activa` | `BOOLEAN` | `DEFAULT true` |

---

## BLOQUE 9 — SOPORTE

### `documento` (tabla: `documento`)

Almacén de referencias a archivos del sistema (no almacena binarios en BD).

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `documentoId` | `SERIAL PK` | |
| `tipoDocumento` | `VARCHAR(25)` | `comprobante_pago`, `cfdi_xml`, `cfdi_pdf`, etc. |
| `nombreOriginal` | `VARCHAR(255)` | |
| `rutaAlmacen` | `TEXT` | Ruta relativa del archivo en disco |
| `mimeType` | `VARCHAR(100)` | |
| `tamanoBytes` | `BIGINT` | |
| `hashSha256` | `CHAR(64)?` | Verificación de integridad |
| `alumnoId` | `INT? FK→alumno` | Vinculación opcional |
| `tutorId` | `INT? FK→tutor` | |
| `pagoId` | `INT? FK→pago` | |
| `facturaId` | `INT? FK→factura` | |
| `subidoPor` | `INT? FK→usuario` | |
| `subidoEn` | `TIMESTAMPTZ` | `DEFAULT now()` |

---

### `notificacion` (tabla: `notificacion`)

Cola de notificaciones pendientes o enviadas.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `notificacionId` | `SERIAL PK` | |
| `tipo` | `VARCHAR(30)` | `recordatorio_pago`, `beca_aprobada`, etc. |
| `canal` | `VARCHAR(10)` | `email`, `sms`, `push` |
| `destinatarioTutorId` | `INT? FK→tutor` | |
| `destinatarioEmail` | `VARCHAR?` | Directo sin FK |
| `estado` | `VARCHAR(15)` | `pendiente`, `enviado`, `fallido` |
| `intentos` | `INT` | `DEFAULT 0` |
| `programadaPara` | `TIMESTAMPTZ?` | Para envío diferido |
| `enviadaEn` | `TIMESTAMPTZ?` | |

---

## BLOQUE 10 — AUDITORÍA Y CONFIGURACIÓN

### `intento_login` (tabla: `intento_login`)

Registro inmutable de cada intento de autenticación.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `intentoId` | `SERIAL PK` | |
| `usuarioId` | `INT? FK→usuario` | `NULL` si usuario no existe |
| `nombreUsuarioIntentado` | `VARCHAR(80)?` | El string que se intentó |
| `exitoso` | `BOOLEAN` | |
| `direccionIp` | `TEXT?` | |
| `userAgent` | `TEXT?` | |
| `creadoEn` | `TIMESTAMPTZ` | `DEFAULT now()` — sin `updatedAt` |

---

### `log_auditoria` (tabla: `log_auditoria`)

Registro inmutable de cambios en entidades críticas.

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `logId` | `BIGSERIAL PK` | BigInt para alto volumen |
| `usuarioId` | `INT? FK→usuario` | Quién realizó la acción |
| `accion` | `VARCHAR(10)` | `INSERT`, `UPDATE`, `DELETE` |
| `tablaAfectada` | `VARCHAR(60)` | Nombre de la tabla |
| `registroId` | `VARCHAR(50)?` | ID del registro afectado |
| `valoresAntes` | `JSONB?` | Estado previo |
| `valoresDespues` | `JSONB?` | Estado posterior |
| `fechaHora` | `TIMESTAMPTZ` | `DEFAULT now()` |
| `direccionIp` | `TEXT?` | |

---

### `configuracion_sistema` (tabla: `configuracion_sistema`)

Parámetros configurables del sistema (key-value store).

| Campo | Tipo PG | Notas |
|-------|---------|-------|
| `configId` | `SERIAL PK` | |
| `clave` | `VARCHAR(80)` | Ej: `recargo_dia_tope_mes` |
| `valor` | `TEXT` | Valor como string |
| `tipoDato` | `VARCHAR(20)` | `integer`, `decimal`, `string`, `boolean` |
| `cicloId` | `INT? FK→ciclo_escolar` | `NULL` = configuración global |
| `actualizadoPor` | `INT? FK→usuario` | |

**Constraint:** `@@unique([clave, cicloId])`

> ⚠️ **ERR-004:** Nunca usar `findUnique` ni `upsert` con solo la clave.
> Siempre usar `findFirst({ where: { clave, cicloId: null } })` para configs globales.

**Claves de configuración del sistema:**

| Clave | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `recargo_dia_tope_mes` | `integer` | `5` | Día límite para pagar sin recargo |
| `recargo_colegiatura_monto` | `decimal` | `400` | Monto del recargo por colegiatura tardía |
| `login_max_intentos` | `integer` | `5` | Intentos fallidos antes del bloqueo |
| `login_minutos_bloqueo` | `integer` | `30` | Minutos de bloqueo tras exceder intentos |

---

## 🛠️ Comandos de base de datos

```bash
# Generar Prisma Client (obligatorio tras cambios al schema)
npm run db:generate       # → npx prisma generate

# Aplicar migración en desarrollo
npm run db:migrate        # → npx prisma migrate dev

# Aplicar migraciones en producción (sin prompts)
npm run db:deploy         # → npx prisma migrate deploy

# Marcar baseline (PostgreSQL ya inicializado por Docker)
npm run db:baseline       # → prisma migrate resolve --applied 20260527000001_init_postgresql

# Setup completo desde cero
npm run db:setup          # → generate + baseline + seed

# Poblar con datos iniciales
npm run db:seed           # → node prisma/seed.js

# Validar estado de la BD (33 tablas + datos seed)
npm run db:validate       # → node scripts/db-validate.js

# Backup con timestamp (requiere pg_dump)
npm run db:backup         # → node scripts/db-backup.js

# Restaurar desde backup (requiere confirmación)
npm run db:restore        # → node scripts/db-restore.js

# Reset completo (BLOQUEADO en producción)
npm run db:reset          # → node scripts/db-reset.js
```

---

## 👤 Credenciales iniciales (seed)

| Rol | Usuario | Contraseña | Acceso |
|-----|---------|-----------|--------|
| ADMIN | `elizabeth.admin` | `sandiego2026` | Panel Administrador |
| GESTOR | `gestor.admin` | `sandiego2026` | Panel Gestor |
| MAESTRA | `laura.rios` | `sandiego2026` | Panel Docente |

> ⚠️ **Cambiar todas las contraseñas antes de despliegue en producción.**
> Usar `PATCH /api/v1/auth/usuarios/:id/reset-password` (ADMIN) para el reset forzado.

---

## 🔗 Resumen de constraints `@@unique`

| Tabla | Constraint |
|-------|-----------|
| `usuario_rol` | `[usuarioId, rolId]` |
| `grupo` | `[cicloId, nivelId, grado, seccion]` |
| `materia` | `[nivelId, nombre, tipo]` |
| `grupo_materia` | `[grupoId, materiaId]` |
| `periodo_evaluacion` | `[cicloId, nivelId, tipo, numero]` |
| `tutor_alumno` | `[tutorId, alumnoId]` |
| `plan_pago` | `[cicloId, nombre]` |
| `inscripcion_ciclo` | `[alumnoId, cicloId]` |
| `calificacion` | `[alumnoId, grupoMateriaId, periodoId]` |
| `asistencia` | `[alumnoId, grupoMateriaId, fecha]` |
| `tarifa` | `[cicloId, nivelId, concepto]` |
| `calendario_pago` | `[alumnoId, cicloId, concepto, mes]` |
| `aplicacion_pago` | `[pagoId, calendarioPagoId, aplicadoA]` |
| `asignacion_beca` | `[alumnoId, becaId, cicloId]` |
| `configuracion_sistema` | `[clave, cicloId]` |

---

## 🗄️ Scripts de Base de Datos

Scripts en `backend/scripts/` para operaciones críticas de BD. Todos resuelven `.env` de forma explícita (no dependen del directorio de ejecución).

| Script | Comando npm | Descripción |
|--------|-------------|-------------|
| `db-validate.js` | `npm run db:validate` | Verifica conexión + versión PG ≥14 + 33 tablas + seed mínimo |
| `db-backup.js`   | `npm run db:backup`   | `pg_dump` plain SQL con timestamp — retención últimos 10 backups |
| `db-restore.js`  | `npm run db:restore`  | Restaura backup con confirmación explícita `CONFIRMAR` |
| `db-reset.js`    | `npm run db:reset`    | Backup auto + migrate reset + seed (**bloqueado en producción**) |

### Flujo de validación recomendado antes de go-live

```bash
# 1. Validar que la BD está correcta
node scripts/db-validate.js

# 2. Backup de seguridad
node scripts/db-backup.js --label="pre-deploy"

# 3. Aplicar migraciones pendientes (si las hay)
npx prisma migrate deploy

# 4. Verificar migraciones aplicadas
npx prisma migrate status
```

### Notas importantes

- `db-backup.js` usa `pg_dump --format=plain` → archivos `.sql` (no `.sql.gz`)
- En entorno Docker: el backup se ejecuta dentro del contenedor `sae_postgres`
- `POSTGRES_PASSWORD` **DEBE** estar configurado en `.env` para backups locales
- El script detecta automáticamente si Docker está corriendo y ajusta el comando

---

*Última actualización: 2026-06-08 · Sesión 10 · SAE v2.0.0 · PostgreSQL 16 · Prisma 5.x*
