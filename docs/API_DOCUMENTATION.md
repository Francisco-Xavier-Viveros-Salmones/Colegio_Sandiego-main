# 📡 API_DOCUMENTATION — SAE Colegio San Diego

**Base URL:** `http://[IP_LAN]:3000/api/v1`
**Versión:** 2.0.0 · **Motor:** PostgreSQL 16 · **Auth:** JWT Bearer

---

## 📋 Convenciones

### Formato de respuesta estándar

```ts
// Éxito
{ ok: true,  message: string, data: T }

// Éxito con paginación
{ ok: true, message: string, data: T[], pagination: Pagination }

// Error
{ ok: false, message: string }
```

```ts
interface Pagination {
  page:    number   // Página actual (1-based)
  limit:   number   // Registros por página
  total:   number   // Total de registros que coinciden
  pages:   number   // Total de páginas
  hasNext: boolean
  hasPrev: boolean
}
```

### Autenticación

Todos los endpoints (salvo `/auth/login` y `/auth/refresh`) requieren:

```
Authorization: Bearer <jwt_token>
```

### Códigos de error frecuentes

| HTTP | Significado |
|------|-------------|
| `400` | Validación fallida — ver `message` |
| `401` | Token inválido o expirado |
| `403` | Rol insuficiente (RBAC) |
| `404` | Recurso no encontrado |
| `409` | Conflicto — duplicado o estado inválido |
| `423` | Cuenta bloqueada temporalmente |
| `500` | Error interno del servidor |

---

## 🔐 AUTH

### POST `/auth/login`

Autentica al usuario. Devuelve JWT + datos del usuario + ruta de redirección por rol.

**Auth:** No requerida · **Rate limit:** 10 req / 15 min

**Request body:**
```ts
{
  username: string   // nombre de usuario (sin @, sin espacios)
  password: string   // contraseña en texto plano
}
```

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id":       1,
      "nombre":   "Elizabeth Mendoza",
      "username": "elizabeth.admin",
      "rol":      "ADMIN"
    },
    "redirectTo": "/admin_panel.html"
  }
}
```

**Valores de `redirectTo`:**

| Rol | Ruta |
|-----|------|
| `ADMIN` | `/admin_panel.html` |
| `GESTOR` | `/gestor_panel.html` |
| `MAESTRA` | `/maestra_panel.html` |

**Errores posibles:**
- `401` — Credenciales incorrectas
- `423` — `"Cuenta bloqueada. Intenta en N minuto(s)."` (tras 5 fallos)

---

### GET `/auth/me`

Devuelve el perfil del usuario autenticado (leído del JWT).

**Auth:** Bearer · **Roles:** ADMIN, GESTOR, MAESTRA

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "id": 1, "nombre": "Elizabeth Mendoza",
    "username": "elizabeth.admin", "rol": "ADMIN"
  }
}
```

---

### POST `/auth/refresh`

Renueva el access token sin requerir nuevas credenciales.

**Auth:** Bearer (token válido O expirado hace < 2 horas) · **No** tiene middleware `authenticate`

**Cuándo llamar:**
- El cliente llama proactivamente cuando el token expira en < 15 min
- El cliente llama reactivamente cuando recibe un `401` en cualquier otro endpoint

**Request:** Sin body. Solo el header `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "ok": true,
  "message": "Token renovado correctamente.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errores posibles:**
- `401` — Token malformado, firma inválida, o expirado hace > 2 horas (re-login requerido)

> **Ventana de gracia:** 2 horas desde la expiración. Fuera de esa ventana, el usuario debe hacer login nuevamente.

---

### PATCH `/auth/usuarios/:id/reset-password`

El ADMIN restablece la contraseña de cualquier usuario del sistema.
La nueva contraseña debe comunicarse al usuario por otro canal (verbal/físico — sistema LAN).
El usuario verá `debeCambiarPwd = true` y **debe cambiarla** en su próximo acceso.

**Auth:** Bearer · **Roles:** Solo ADMIN

**Path params:**
- `:id` — `number` — ID del usuario (`usuarioId`)

**Request body:**
```ts
{
  nuevaPassword: string   // mínimo 6 caracteres
}
```

**Response 200:**
```json
{
  "ok": true,
  "message": "Contraseña restablecida. El usuario deberá cambiarla en el próximo inicio de sesión.",
  "data": {
    "id":             2,
    "nombre":         "Laura Ríos",
    "username":       "laura.rios",
    "debeCambiarPwd": true
  }
}
```

**Efectos secundarios:**
- `intentosFallidos` se resetea a `0`
- `bloqueadoHasta` se limpia (si estaba bloqueado)
- `passwordHash` se reemplaza con el nuevo hash bcrypt

**Errores posibles:**
- `400` — Contraseña menor a 6 caracteres
- `403` — No es ADMIN
- `404` — Usuario no encontrado o dado de baja

---

## 👤 ALUMNOS

### GET `/alumnos`

Lista alumnos activos con filtros y paginación opcional.

**Auth:** Bearer · **Roles:** ADMIN, GESTOR

**Query params:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `q` | `string` | — | Búsqueda insensible a mayúsculas en nombre, matrícula, CURP |
| `grupoId` | `number` | — | Filtrar por grupo específico |
| `nivel` | `string` | — | `PRIMARIA` \| `SECUNDARIA` \| `BACHILLERATO` \| `PREESCOLAR` |
| `estado` | `string` | — | `Activo` \| `Baja Temporal` \| `Baja Definitiva` |
| `page` | `number` | — | Página 1-based. **Si se omite → respuesta sin paginación (array)** |
| `limit` | `number` | `20` | Registros/página. Máx: `100` |

**Response sin paginación** (omitir `page`):
```json
{
  "ok": true,
  "message": "N alumnos encontrados.",
  "data": [ <Alumno>, ... ]
}
```

**Response con paginación** (`?page=1&limit=20`):
```json
{
  "ok": true,
  "message": "243 alumnos encontrados (página 1/13).",
  "data": [ <Alumno>, ... ],
  "pagination": { "page": 1, "limit": 20, "total": 243, "pages": 13, "hasNext": true, "hasPrev": false }
}
```

**Objeto `Alumno`:**
```ts
{
  id:          number
  nombre:      string           // nombreCompleto de la BD
  matricula:   string           // "SDM-2026-XXXX"
  curp:        string | null
  grupoId:     number | null
  activo:      boolean
  estado:      string
  nivel:       string | null    // código del nivel
  fechaNacimiento: string | null  // "YYYY-MM-DD"
  sexo:        string | null    // "M" | "F"
  diaLimitePago: number | null  // Override del día de corte
  estadoPago:  string | null    // "al_corriente" | "pendiente" | "suspendido"
  mesesAdeudo: number           // 0 si al corriente
  grupo: {                      // Inscripción actual
    id:     number
    nombre: string
    nivel:  string | null
  } | null
  padres: Array<{
    id:       number
    nombre:   string
    telefono: string | null
    email:    string | null
    esTutor:  boolean
    tipoRelacion: string
    rfc:      string | null
    regimenFiscal: string | null
    correoFacturacion: string | null
  }>
}
```

---

### GET `/alumnos/:id`

Ficha completa de un alumno. Misma forma que el objeto `Alumno` anterior.

**Roles:** ADMIN, GESTOR, MAESTRA

---

### POST `/alumnos`

Registra un nuevo alumno con su tutor.

**Roles:** ADMIN, GESTOR

**Request body:**
```ts
{
  nombre:    string             // Requerido
  matricula: string             // Requerido — debe ser único
  curp?:     string             // Opcional — debe ser único si se provee
  grupoId?:  number             // ID del grupo para inscripción automática
  nivel?:    string             // "PRIMARIA" | "SECUNDARIA" | etc.
  fechaNacimiento?: string      // "YYYY-MM-DD"
  sexo?:     "M" | "F"
  diaLimitePago?: number        // Override del día de corte global (1-31)
  padres?: Array<{
    nombre:    string           // Requerido si se incluye el tutor
    telefono?: string
    email?:    string
    esTutor?:  boolean          // Default: true
    tipoRelacion?: string       // Default: "tutor"
    rfc?:      string
    regimenFiscal?: string
    correoFacturacion?: string
  }>
}
```

**Response 201:** Objeto `Alumno` completo.

**Errores:** `409` si matrícula o CURP ya existen.

---

### PUT `/alumnos/:id`

Actualiza datos de un alumno. Acepta los mismos campos que POST (todos opcionales).

**Roles:** ADMIN, GESTOR

---

### DELETE `/alumnos/:id`

Soft delete: establece `eliminadoEn` y `estado = "Baja Definitiva"`.

**Roles:** Solo ADMIN

---

## 💰 PAGOS

### GET `/pagos`

Lista pagos con filtros y paginación opcional.

**Auth:** Bearer · **Roles:** ADMIN, GESTOR

**Query params:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `alumnoId` | `number` | — | Filtrar por alumno |
| `tutorId` | `number` | — | Filtrar por tutor |
| `concepto` | `string` | — | `colegiatura` \| `inscripcion` \| `material` \| `uniforme` \| `otro` |
| `fechaDesde` | `string` (ISO date) | — | `"2026-09-01"` |
| `fechaHasta` | `string` (ISO date) | — | `"2026-09-30"` |
| `page` | `number` | — | Página 1-based. **Si se omite → array plano** |
| `limit` | `number` | `25` | Registros/página. Máx: `100` |

**Response con paginación:**
```json
{
  "ok": true,
  "message": "48 pagos encontrados (página 1/2).",
  "data": [ <Pago>, ... ],
  "pagination": { "page": 1, "limit": 25, "total": 48, "pages": 2, "hasNext": true, "hasPrev": false }
}
```

**Objeto `Pago`:**
```ts
{
  id:          number
  alumnoId:    number | null
  tutorId:     number | null
  concepto:    string           // "colegiatura" | "inscripcion" | ...
  mes:         string | null    // "septiembre"
  monto:       number           // Monto total en pesos
  fecha:       string           // "YYYY-MM-DD"
  metodoPago:  string           // "efectivo" | "transferencia" | "tarjeta"
  tieneRecargo:boolean
  montoRecargo:number           // 0 si no aplica
  observaciones: string | null
  alumno: { id: number, nombre: string, matricula: string } | null
  registradoPor: { id: number, nombre: string } | null
  aplicaciones: Array<{
    id:               number
    calendarioPagoId: number
    montoAplicado:    number
    aplicadoA:        "capital" | "recargo"
  }>
}
```

---

### GET `/pagos/calendario`

Retorna las cuotas programadas (calendario de pagos) de uno o varios alumnos.

**Roles:** ADMIN, GESTOR

**Query:** `?alumnoId=1` · `?cicloId=1` · `?estadoCobro=pendiente`

**Valores de `estadoCobro`:** `pendiente` · `parcial` · `pagado`

**Response 200:** Array de registros `calendario_pago`:
```ts
{
  calendarioPagoId: number
  alumnoId:         number
  cicloId:          number
  concepto:         string
  mes:              string | null
  fechaVencimiento: string        // "YYYY-MM-DD"
  montoOriginal:    number
  montoPagado:      number
  montoRecargo:     number
  saldoPendiente:   number        // Calculado: original + recargo - pagado
  estadoCobro:      string
  liquidadoAt:      string | null // ISO timestamp
  recargos: Array<{
    recargoId:     number
    montoOriginal: number
    montoActual:   number
    estado:        string
  }>
}
```

---

### GET `/pagos/total/:alumnoId`

Suma total de pagos registrados para un alumno.

**Roles:** ADMIN, GESTOR

**Response 200:**
```json
{ "ok": true, "data": { "_sum": { "monto": 16000 } } }
```

---

### POST `/pagos`

Registra un pago y aplica la regla de recargo automático.

**Regla de recargo:**
- Solo aplica a concepto `COLEGIATURA`
- Si `día(fecha) > recargo_dia_tope_mes` (default: 5) → recargo automático
- Monto del recargo leído de `configuracion_sistema.recargo_colegiatura_monto` (default: $400)
- Si el alumno tiene `diaLimitePago` propio, ese valor tiene prioridad sobre el global

**Roles:** ADMIN, GESTOR

**Request body:**
```ts
{
  alumnoId:     number       // Requerido
  concepto:     string       // "COLEGIATURA" | "INSCRIPCION" | "MATERIAL_DIDACTICO" | "UNIFORME" | "OTRO"
  monto:        number       // Monto en pesos (sin incluir recargo — se suma automáticamente)
  fecha:        string       // "YYYY-MM-DD" — determina si aplica recargo
  observaciones?: string
  metodoPago?:  string       // Default: "efectivo"
  tutorId?:     number
  calendarioPagoId?: number  // Si se conoce el ID de la cuota programada
}
```

**Response 201:** Objeto `Pago` completo (ver arriba).

---

## 🎓 CALIFICACIONES

### GET `/calificaciones`

Lista calificaciones con filtros.

**Roles:** ADMIN, GESTOR, MAESTRA

**Query:** `?alumnoId=1` · `?grupoId=1` · `?grupoMateriaId=1` · `?periodo=TRIMESTRE_1`

**Valores de `periodo`:** `TRIMESTRE_1` · `TRIMESTRE_2` · `TRIMESTRE_3` · `BIMESTRE_1` · `SEMESTRE_1` · `FINAL`

---

### GET `/calificaciones/alumno/:alumnoId`

Calificaciones de un alumno en un periodo.

**Roles:** ADMIN, GESTOR, MAESTRA

**Query:** `?periodo=TRIMESTRE_1`

**Response 200:** Array de objetos `Calificacion`:
```ts
{
  id:             number
  alumnoId:       number
  grupoMateriaId: number
  periodoId:      number
  periodo:        string | null   // "Trimestre 1" (nombre legible)
  tipoEvaluacion: string          // "numerica" | "cualitativa"
  valor:          number | null   // 0.00 – 10.00
  valorCualitativo: string | null
  cuentaParaPromedio: boolean
  alumno:       { id: number, nombre: string, matricula: string } | null
  grupoMateria: {
    id:      number
    materia: string | null
    docente: string | null
    grupo:   { id: number, nombre: string } | null
  } | null
  registradoPor: { id: number, nombre: string } | null
}
```

---

### GET `/calificaciones/promedio/:alumnoId`

Calcula el promedio de un alumno por materia y el promedio general.
Solo incluye calificaciones con `cuentaParaPromedio = true` y `valor` numérico.

**Roles:** ADMIN, GESTOR, MAESTRA

**Query:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `periodoId` | `number` | FK exacto de `periodo_evaluacion` |
| `periodo` | `string` | `TRIMESTRE_1` \| `TRIMESTRE_2` \| etc. |
| *(sin query)* | — | Calcula sobre todos los períodos disponibles |

**Response 200:**
```json
{
  "ok": true,
  "message": "Promedio calculado: 9.08",
  "data": {
    "alumnoId":           1,
    "totalCalificaciones": 12,
    "promedioGeneral":    9.08,
    "materias": [
      { "materia": "Español",      "grupoMateriaId": 1, "promedio": 9.5,  "calificaciones": 3 },
      { "materia": "Matemáticas",  "grupoMateriaId": 2, "promedio": 8.67, "calificaciones": 3 },
      { "materia": "Ciencias",     "grupoMateriaId": 3, "promedio": 9.0,  "calificaciones": 3 },
      { "materia": "Historia",     "grupoMateriaId": 4, "promedio": 9.17, "calificaciones": 3 }
    ]
  }
}
```

**Errores:** `404` si el alumno no existe.

---

### POST `/calificaciones`

Guarda o actualiza (upsert) una calificación individual.

**Roles:** ADMIN, GESTOR, MAESTRA

**Request body:**
```ts
{
  alumnoId:       number   // Requerido
  grupoMateriaId: number   // Requerido
  periodo:        string   // "TRIMESTRE_1" — se resuelve automáticamente al periodoId del ciclo activo
  valor:          number   // 0.0 – 10.0
  tipoEvaluacion?: string  // Default: "numerica"
}
```

La resolución de `periodo` (string) a `periodoId` (FK) es automática.
Si el `periodo_evaluacion` no existe para el ciclo activo, se crea automáticamente.

**Response 201:** Objeto `Calificacion`.

---

### POST `/calificaciones/lote`

Guarda múltiples calificaciones en una operación. Útil para el panel de maestras.

**Roles:** ADMIN, GESTOR, MAESTRA

**Request body:**
```ts
{
  calificaciones: Array<{
    alumnoId:       number
    grupoMateriaId: number
    periodo:        string
    valor:          number
    tipoEvaluacion?: string
  }>
}
```

**Response 201:** Array de objetos `Calificacion`.

---

## 🎖️ BECAS

### GET `/becas`

Lista el catálogo de becas disponibles.

**Roles:** ADMIN, GESTOR, MAESTRA

**Response 200:** Array de `{ id, nombre, criterio, porcentaje }`.

---

### GET `/becas/solicitudes`

Lista solicitudes de beca. El GESTOR solo ve las suyas; el ADMIN ve todas.

**Roles:** ADMIN, GESTOR

**Query:** `?estado=pendiente` · `?estado=aprobada` · `?estado=rechazada`

---

### POST `/becas/solicitudes`

El GESTOR crea una solicitud de beca (RF-21). No aplica descuento hasta aprobación.

**Roles:** ADMIN, GESTOR

**Request body:**
```ts
{
  alumnoId: number
  tipo:     string   // "HERMANOS" | "EXCELENCIA" | "INSCRIPCION_TEMPRANA" | "OTRO"
  motivo:   string
}
```

---

### PATCH `/becas/solicitudes/:id/resolver`

El ADMIN aprueba o rechaza una solicitud. Si aprueba, crea automáticamente el registro `asignacion_beca`.

**Roles:** Solo ADMIN

**Request body:**
```ts
{
  estado:        "APROBADA" | "RECHAZADA"
  observaciones?: string
}
```

**Errores:** `409` si la solicitud ya fue resuelta.

---

## 🏫 GRUPOS

### GET `/grupos`

Lista grupos del ciclo activo.

**Roles:** ADMIN, GESTOR, MAESTRA

**Query:** `?nivel=PRIMARIA`

**Response 200:** Array de `Grupo`:
```ts
{
  id:       number
  nombre:   string      // "Primaria 4°A"
  nivel:    string      // "PRIMARIA"
  titular:  string      // Nombre del docente titular
  activo:   boolean
  alumnos:  number      // _count de inscripciones activas
  materias: Array<{ id: number, materia: string, docente: string, horario: string, aula: string }>
}
```

---

### GET `/grupos/:id`

Detalle completo de un grupo con sus materias.

**Roles:** ADMIN, GESTOR, MAESTRA

---

### POST `/grupos`

Crea un nuevo grupo.

**Roles:** ADMIN, GESTOR

**Request body:**
```ts
{
  nombre:          string    // Ej: "Primaria 4°A"
  nivelId:         number
  cicloId?:        number    // Default: ciclo activo
  grado:           string    // "4"
  seccion:         string    // "A"
  docenteTitularId?: number
  cupoMaximo?:     number
}
```

---

### POST `/grupos/:id/materias`

Asigna una materia a un grupo.

**Roles:** ADMIN, GESTOR

**Request body:**
```ts
{
  materia:   string    // Nombre o ID de la materia
  docente:   string    // Nombre del docente (se resuelve a usuario)
  horario?:  string    // "Lun-Mié-Vie 7:00-8:30"
  aula?:     string    // "B-201"
}
```

---

### DELETE `/grupos/:id/materias/:materiaId`

Elimina (soft delete) una materia de un grupo.

**Roles:** ADMIN, GESTOR

---

## 👥 USUARIOS

### GET `/usuarios`

Lista usuarios activos del sistema.

**Roles:** Solo ADMIN

**Query:** `?rol=MAESTRA` · `?rol=GESTOR` · `?rol=ADMIN`

**Response 200:** Array de `Usuario`:
```ts
{
  id:       number
  nombre:   string   // nombreCompleto
  username: string
  rol:      string   // "ADMIN" | "GESTOR" | "MAESTRA"
  activo:   boolean
  correo:   string | null
  telefono: string | null
}
```

---

### GET `/usuarios/:id`

Detalle de un usuario.

**Roles:** Solo ADMIN

---

### POST `/usuarios`

Crea un nuevo usuario del sistema.

**Roles:** Solo ADMIN

**Request body:**
```ts
{
  nombre:   string   // Nombre completo
  username: string   // Sin espacios
  password: string   // Texto plano — se hashea con bcrypt
  rol:      string   // "ADMIN" | "GESTOR" | "MAESTRA"
  correo?:  string
  telefono?: string
}
```

**Response 201:** Objeto `Usuario`.

**Errores:** `409` si `username` ya existe.

---

### PUT `/usuarios/:id`

Actualiza datos de un usuario. Todos los campos son opcionales.

**Roles:** Solo ADMIN

**Request body:** Mismos campos que POST, todos opcionales.
Si se incluye `password`, se re-hashea automáticamente.

---

### DELETE `/usuarios/:id`

Soft delete del usuario: `activo = false`, `eliminadoEn = now()`.

**Roles:** Solo ADMIN

---

### PATCH `/auth/usuarios/:id/reset-password`

*(Ver sección AUTH — Reset Password arriba)*

---

## 📋 ASISTENCIAS

### GET `/asistencias`

Lista asistencias con filtros.

**Roles:** ADMIN, GESTOR, MAESTRA

**Query:** `?grupoId=1` · `?fecha=2026-05-21` · `?alumnoId=1`

---

### POST `/asistencias`

Registra o actualiza (upsert) la asistencia de un alumno.

**Roles:** ADMIN, GESTOR, MAESTRA

**Request body:**
```ts
{
  alumnoId:      number
  grupoMateriaId?: number   // ID de grupo_materia (usa la combinación alumno+grupo+fecha para upsert)
  grupoId?:      number     // Alternativa: se resuelve al grupoMateriaId
  fecha:         string     // "YYYY-MM-DD"
  estado:        string     // "PRESENTE" | "AUSENTE" | "RETARDO"
  justificacion?: string
}
```

---

### POST `/asistencias/lote`

Registra la asistencia del grupo completo para una fecha.

**Roles:** ADMIN, GESTOR, MAESTRA

**Request body:**
```ts
{
  grupoId: number
  fecha:   string   // "YYYY-MM-DD"
  asistencias: Array<{
    alumnoId:      number
    estado:        string    // "PRESENTE" | "AUSENTE" | "RETARDO"
    justificacion?: string
  }>
}
```

---

## ⚙️ SISTEMA

### GET `/health`

Health check del servidor. No requiere autenticación.

**Response 200:**
```json
{
  "ok":      true,
  "sistema": "SAE Colegio San Diego",
  "version": "2.0.0",
  "entorno": "production",
  "timestamp": "2026-05-29T10:00:00.000Z"
}
```

---

### GET `/config.js`

Script JavaScript que inyecta la IP LAN del servidor en los clientes.
Cargado automáticamente por los paneles HTML. No es un endpoint JSON.

**Response:** `application/javascript`
```js
window.SAE_CONFIG = {
  API_BASE:  'http://192.168.1.100:3000/api/v1',
  SERVER_IP: '192.168.1.100',
  PORT:      3000,
  VERSION:   '2.0.0',
};
```

---

## 🔢 Referencia rápida de endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/auth/login` | No | Iniciar sesión |
| `GET` | `/auth/me` | Todos | Perfil del usuario actual |
| `POST` | `/auth/refresh` | Bearer (puede expirado < 2h) | Renovar token |
| `PATCH` | `/auth/usuarios/:id/reset-password` | ADMIN | Restablecer contraseña |
| `GET` | `/alumnos` | ADMIN, GESTOR | Listar alumnos (con/sin paginación) |
| `GET` | `/alumnos/:id` | Todos | Ficha de alumno |
| `POST` | `/alumnos` | ADMIN, GESTOR | Registrar alumno |
| `PUT` | `/alumnos/:id` | ADMIN, GESTOR | Actualizar alumno |
| `DELETE` | `/alumnos/:id` | ADMIN | Dar de baja alumno |
| `GET` | `/pagos` | ADMIN, GESTOR | Listar pagos (con/sin paginación) |
| `GET` | `/pagos/calendario` | ADMIN, GESTOR | Calendario de cuotas |
| `GET` | `/pagos/total/:alumnoId` | ADMIN, GESTOR | Suma de pagos por alumno |
| `POST` | `/pagos` | ADMIN, GESTOR | Registrar pago |
| `GET` | `/calificaciones` | Todos | Listar calificaciones |
| `GET` | `/calificaciones/alumno/:id` | Todos | Calificaciones por alumno |
| `GET` | `/calificaciones/promedio/:id` | Todos | Promedio por materia y general |
| `POST` | `/calificaciones` | Todos | Guardar/actualizar calificación |
| `POST` | `/calificaciones/lote` | Todos | Guardar lote de calificaciones |
| `GET` | `/becas` | Todos | Catálogo de becas |
| `GET` | `/becas/solicitudes` | ADMIN, GESTOR | Solicitudes de beca |
| `POST` | `/becas/solicitudes` | ADMIN, GESTOR | Crear solicitud (RF-21) |
| `PATCH` | `/becas/solicitudes/:id/resolver` | ADMIN | Aprobar/rechazar solicitud |
| `GET` | `/grupos` | Todos | Listar grupos |
| `GET` | `/grupos/:id` | Todos | Detalle de grupo |
| `POST` | `/grupos` | ADMIN, GESTOR | Crear grupo |
| `POST` | `/grupos/:id/materias` | ADMIN, GESTOR | Asignar materia |
| `DELETE` | `/grupos/:id/materias/:id` | ADMIN, GESTOR | Remover materia |
| `GET` | `/usuarios` | ADMIN | Listar usuarios |
| `GET` | `/usuarios/:id` | ADMIN | Detalle de usuario |
| `POST` | `/usuarios` | ADMIN | Crear usuario |
| `PUT` | `/usuarios/:id` | ADMIN | Actualizar usuario |
| `DELETE` | `/usuarios/:id` | ADMIN | Soft delete de usuario |
| `GET` | `/asistencias` | Todos | Listar asistencias |
| `POST` | `/asistencias` | Todos | Registrar asistencia |
| `POST` | `/asistencias/lote` | Todos | Registrar asistencia del grupo |
| `GET` | `/health` | No | Health check |

---

*Última actualización: 2026-05-29 · Sesión 07 · SAE v2.0.0 · PostgreSQL 16*
