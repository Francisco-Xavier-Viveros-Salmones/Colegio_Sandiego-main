# Carpeta `queries/` — Recetario SQL del SAE

Consultas SQL parametrizadas listas para producción, pensadas para que el equipo de Backend las consuma directamente desde el código sin modificar nada.

## Convenciones

- **Parámetros**: cada query usa marcadores `$1`, `$2`, etc. (sintaxis nativa de `node-postgres` y `psycopg`). El Backend pasa los valores en el orden indicado en el encabezado de cada archivo.
- **Versión del modelo**: alineadas con el esquema v2 (post-revisión del profesor). Si el esquema cambia, estas queries deben revisarse.
- **No hardcodear**: ningún archivo contiene valores literales como `ciclo_id = 2` o `usuario_id = 1`. Todo se parametriza.
- **Filtros estándar**: las queries asumen que el equipo quiere datos "vivos" — alumnos activos, inscripciones activas, cargos no liquidados. Si se requiere lo opuesto (alumnos egresados, histórico completo), se hace un archivo separado.

## Índice de archivos

| Archivo | Propósito | Parámetros |
|---|---|---|
| `01_alumnos_activos_por_grupo.sql` | Lista alumnos activos de un grupo + datos del tutor | `$1 = grupo_id` |
| `02_calendario_pendiente_alumno.sql` | Cargos pendientes de un alumno con flag de vencimiento | `$1 = alumno_id` |
| `03_auditoria_por_usuario.sql` | Bitácora de actividad de un usuario operador | `$1..$5` (ver archivo) |

## Detalle de cada query

### 1. Alumnos activos por grupo

**Caso de uso**: pantalla "Detalle de grupo" en el panel administrativo. La directora abre `4°A Primaria` y ve los 25 alumnos con sus tutores.

**Devuelve**: lista de alumnos con matrícula, CURP, fecha de nacimiento, datos del tutor responsable (nombre, teléfono, correo, si requiere factura) y el día límite de pago efectivo del alumno (override individual o global). Ordenado alfabéticamente.

**Garantías**:
- Solo alumnos con `estado = 'Activo'` y `estado_en_ciclo = 'activa'`.
- Si el grupo no existe o está vacío, devuelve 0 filas (no error).

**Ejemplo**:

```javascript
import { readFileSync } from 'fs';
const SQL = readFileSync('queries/01_alumnos_activos_por_grupo.sql', 'utf8');
const result = await db.query(SQL, [grupoId]);
```

### 2. Calendario pendiente del alumno

**Caso de uso**: pantalla "Estado de cuenta" cuando el padre o la directora consulta los pagos pendientes de un alumno específico.

**Devuelve**: cargos no liquidados (estado distinto de `pagado` y `condonado`) con monto, saldo pendiente, días de atraso y un flag booleano `vencido`. Ordenado por fecha de vencimiento ascendente (lo más urgente primero).

**Versión utilizada (A — robusta)**: vencimiento por `calendario_pago.fecha_vencimiento`. Es la que usa el Backend para reportes de morosidad porque respeta tarifas y planes históricos.

**Versión alternativa (B — comentada al final del archivo)**: vencimiento por `alumno.dia_limite_pago`. Útil para validar en tiempo real la colegiatura del mes en curso. Si tu compañero la necesita en otro endpoint, descomenta y úsala.

**Ejemplo**:

```javascript
const SQL = readFileSync('queries/02_calendario_pendiente_alumno.sql', 'utf8');
const result = await db.query(SQL, [alumnoId]);
```

### 3. Auditoría por usuario

**Caso de uso**: pantalla "Historial de actividad" cuando la directora pregunta "¿qué hizo Laura el martes pasado?". Útil para investigaciones internas y para responder a auditorías externas.

**Devuelve**: filas de `log_auditoria` filtradas por usuario, con snapshots completos en JSONB de los valores antes y después del cambio. Ordenado por fecha descendente (lo más reciente primero).

**Parámetros completos**:
- `$1 = usuario_id` (obligatorio)
- `$2 = fecha_desde` (opcional, pasar `NULL` para no filtrar)
- `$3 = fecha_hasta` (opcional, pasar `NULL` para no filtrar)
- `$4 = limite` (recomendado: 100)
- `$5 = offset` (paginación, empezar en 0)

**Ejemplo** (toda la actividad de Laura sin filtro de fecha, primera página):

```javascript
const SQL = readFileSync('queries/03_auditoria_por_usuario.sql', 'utf8');
const result = await db.query(SQL, [3, null, null, 100, 0]);
```

**Ejemplo** (actividad de Laura entre dos fechas específicas):

```javascript
const result = await db.query(SQL, [
    3,
    '2026-09-01T00:00:00-06:00',
    '2026-09-30T23:59:59-06:00',
    100,
    0
]);
```

## Performance: índices que usan estas queries

Las tres queries están diseñadas para apoyarse en índices que ya existen en el esquema base:

| Query | Índices usados |
|---|---|
| 01 | `idx_inscripcion_ciclo_grupo`, `idx_inscripcion_ciclo_estado`, `idx_alumno_estado` |
| 02 | `idx_calendario_pago_estado`, `idx_calendario_pago_vencim` |
| 03 | `idx_log_auditoria_fecha`, FK index implícito sobre `log_auditoria.usuario_id` |

Si en producción alguna corre lenta, ejecuta `EXPLAIN ANALYZE` con datos reales para ver el plan. Con menos de 5,000 alumnos no debería ser un problema.

## Cómo extender este recetario

Cuando aparezcan nuevas consultas frecuentes desde Backend o Frontend, agrégalas siguiendo el patrón:

1. Un archivo `.sql` por consulta, con prefijo numérico (`04_`, `05_`, ...).
2. Encabezado en comentarios con: propósito, parámetros, garantías y ejemplo de uso.
3. Parámetros nativos `$1`, `$2`, etc. — nunca valores hardcodeados.
4. Registrar el nuevo archivo en este README, en el índice y con su sección descriptiva.

## Lo que NO va en esta carpeta

- **Stored Procedures / Functions complejas**: si una operación requiere lógica de varios pasos, vive en código de Backend (regla acordada). La excepción es `fn_audit_trigger`, que es auditoría pura.
- **DDL de tablas o triggers**: eso vive en `init-db/`.
- **Migraciones**: van a `migrations/` cuando hagan falta.
- **Vistas (`VIEW`)**: por ahora todas las consultas son parametrizadas. Si en el futuro alguna se usa tan frecuente y sin cambios que valga la pena promoverla a VIEW, lo discutimos y se mueve al `init-db/`.
