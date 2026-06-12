# 🐛 BUGFIXES — SAE Colegio San Diego

Registro de correcciones aplicadas post-Auditoría 6.
Basado en hallazgos reales de código — sin fixes inventados.

---

## [BF-01] Log de inicio del servidor indica "SQLite" en sistema PostgreSQL

**Archivo:** `backend/src/server.js`

**Bug detectado:** Al arrancar el servidor, el log muestra `[DB] Conexión a SQLite establecida correctamente.` cuando el motor actual es PostgreSQL 16.

**Causa raíz:** Mensaje quedó sin actualizar tras la migración de SQLite a PostgreSQL en Sesión 05.

**Cambio aplicado:**
```js
// Antes:
console.log('[DB] Conexión a SQLite establecida correctamente.');
// Después:
console.log('[DB] Conexión a PostgreSQL establecida correctamente.');
```

**Riesgo mitigado:** Confusión operacional en producción al monitorear logs.

**Compatibilidad afectada:** Ninguna — solo mensaje de log.

**Validación:** Arrancar el servidor y verificar output en consola.

---

## [BF-02] Sin handlers de `unhandledRejection` / `uncaughtException`

**Archivo:** `backend/src/server.js`

**Bug detectado:** El proceso Node.js no manejaba rechazos de promesas no capturados ni excepciones no manejadas. En Node.js moderno, un `unhandledRejection` puede terminar el proceso silenciosamente.

**Causa raíz:** Solo se registraban handlers `SIGINT` y `SIGTERM`. Faltaba la capa de protección contra errores asíncronos no capturados.

**Cambio aplicado:**
```js
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
```

**Riesgo mitigado:** Cierre silencioso del servidor por promesa rechazada no capturada.

**Compatibilidad afectada:** Ninguna — solo handlers de proceso.

**Validación:** Lanzar una promesa rechazada no capturada y verificar que el servidor loguea el error sin caerse silenciosamente.

---

## [BF-03] `montoCapital` puede ser negativo al registrar un pago

**Archivo:** `backend/src/repositories/pagos/pagos.repository.js`

**Bug detectado:** Al crear una `aplicacion_pago` de tipo `capital`, el campo `montoAplicado` podía resultar negativo si el recargo configurado era mayor al monto del pago.

**Causa raíz:**
```js
// Sin validación de límite inferior:
const montoCapital = tieneRecargo ? (monto - (montoRecargo ?? 0)) : monto;
// Ejemplo: monto=$100, recargo=$400 → montoCapital=-300
```

**Cambio aplicado:**
```js
const montoCapital = Math.max(0, tieneRecargo ? (monto - (montoRecargo ?? 0)) : monto);
```

**Riesgo mitigado:** Corrupción del saldo en `calendario_pago` con `aplicacion_pago.montoAplicado` negativo.

**Compatibilidad afectada:** Ninguna — el contrato de la API no cambia. Pagos con monto < recargo quedan con `montoCapital=0` en vez de un valor negativo.

**Validación:** Registrar un pago donde `monto < montoRecargo` y verificar que `montoAplicado` en `aplicacion_pago` es `0`, no negativo.

---

## [BF-04] Race condition al crear períodos de evaluación automáticamente

**Archivo:** `backend/src/repositories/calificaciones/calificaciones.repository.js`

**Bug detectado:** Si dos requests simultáneas intentaban guardar una calificación con el mismo período no existente, ambas ejecutaban `findFirst + create`. La segunda request fallaba con `P2002` (unique constraint violation) y devolvía HTTP 500.

**Causa raíz:**
```js
// Sin captura de P2002:
if (!periodoReg) {
  const nuevoPeriodo = await prisma.periodoEvaluacion.create({ data: {...} });
  // ← Segunda request explota aquí con Prisma P2002
}
```

**Cambio aplicado:** El `create` queda envuelto en `try/catch`. Si ocurre `P2002`, se recupera el período ya creado por la request ganadora:
```js
try {
  const nuevoPeriodo = await prisma.periodoEvaluacion.create({ data: {...} });
  return nuevoPeriodo.periodoId;
} catch (e) {
  if (e.code === 'P2002') {
    const existente = await prisma.periodoEvaluacion.findFirst({ where: {...} });
    return existente?.periodoId ?? null;
  }
  throw e;
}
```

**Riesgo mitigado:** HTTP 500 ante requests concurrentes de calificaciones con período nuevo.

**Compatibilidad afectada:** Ninguna — el comportamiento visible para el cliente es idéntico.

**Validación:** Enviar dos `POST /calificaciones` simultáneos con período no existente. Ambos deben responder correctamente.

---

## [BF-05] Campo `metodoPago` no validado en el endpoint de pagos

**Archivos:**
- `backend/src/utils/validators/pagos.validator.js`
- `backend/src/utils/constants.js`

**Bug detectado:** El campo `metodoPago` en `POST /api/v1/pagos` aceptaba cualquier string arbitrario sin validación. Valores como `"bitcoin"` o `"permuta"` se persistían en la BD.

**Causa raíz:** `crearPagoValidators` no incluía una regla para `metodoPago`.

**Cambio aplicado:**
```js
// En constants.js — nueva constante:
const METODOS_PAGO = Object.freeze({
  EFECTIVO: 'efectivo', TRANSFERENCIA: 'transferencia',
  TARJETA: 'tarjeta', CHEQUE: 'cheque',
});
const METODOS_PAGO_VALIDOS = Object.values(METODOS_PAGO);

// En pagos.validator.js — nueva regla:
body('metodoPago')
  .optional({ nullable: true })
  .isIn(METODOS_PAGO_VALIDOS)
  .withMessage(`El método de pago debe ser uno de: ${METODOS_PAGO_VALIDOS.join(', ')}.`),
```

**Riesgo mitigado:** Valores inválidos persistidos en la columna `metodo_pago` de la tabla `pago`.

**Compatibilidad afectada:** Requests existentes con `metodoPago` omitido siguen funcionando (`optional`). El campo `"efectivo"` es el default en el repositorio.

**Validación:** `POST /api/v1/pagos` con `metodoPago: "bitcoin"` debe responder `422 Unprocessable Entity`.

---

## [BF-06] Filtro `cuentaParaPromedio` aplicado en memoria JS en vez de en la query DB

**Archivos:**
- `backend/src/repositories/calificaciones/calificaciones.repository.js`
- `backend/src/services/calificaciones/calificaciones.service.js`

**Bug detectado:** `calcularPromedio()` cargaba **todas** las calificaciones de un alumno en memoria y luego filtraba con `.filter()` en JavaScript, descartando la mayoría de registros.

**Causa raíz:**
```js
// Cargaba todo sin filtro:
const todasLasCalificaciones = await calificacionesRepository.findAll({ alumnoId });
// Filtraba en JS:
const validas = calificaciones.filter(c => c.cuentaParaPromedio !== false && ...);
```

**Cambio aplicado:** Nuevo parámetro `soloParaPromedio` en `findAll()` empuja el filtro a Prisma:
```js
// En repository — filtro a nivel DB:
if (soloParaPromedio) {
  where.cuentaParaPromedio = true;
  where.valorNumerico      = { not: null };
}
// En service — se pasa el flag:
const filtros = { alumnoId, soloParaPromedio: true };
```

**Riesgo mitigado:** Uso excesivo de memoria en alumnos con historial extenso (múltiples ciclos).

**Compatibilidad afectada:** El contrato de respuesta de `GET /calificaciones/promedio/:id` no cambia. Llamadas a `findAll()` sin `soloParaPromedio` mantienen comportamiento idéntico.

**Validación:** El endpoint `GET /calificaciones/promedio/:alumnoId` debe retornar el mismo resultado que antes.

---

## [BF-07] Admin puede degradar su propio rol sin restricción

**Archivo:** `backend/src/controllers/usuarios/usuarios.controller.js`

**Bug detectado:** Un ADMIN podía hacer `PUT /api/v1/usuarios/:id` con `{ rol: 'MAESTRA' }` apuntando a su propio ID, perdiendo acceso administrativo. Si era el único ADMIN, el sistema quedaba sin administrador accesible.

**Causa raíz:** No existía ningún guard que impidiera la auto-modificación de rol.

**Cambio aplicado:**
```js
// Guard en el controller, antes de delegar al service:
if (req.body.rol && req.usuario?.id === Number(req.params.id)) {
  return res.status(403).json({
    ok: false,
    message: 'No puedes modificar el rol de tu propia cuenta.',
  });
}
```

**Riesgo mitigado:** Bloqueo permanente del sistema por un ADMIN que accidentalmente degrada su propio rol.

**Compatibilidad afectada:** Solo impide `rol` en el body cuando `req.params.id === req.usuario.id`. Los demás campos (nombre, password) siguen siendo actualizables por el propio usuario.

**Validación:** `PUT /api/v1/usuarios/1` (siendo el usuario ID 1 el admin logueado) con `{ rol: 'MAESTRA' }` debe responder `403 Forbidden`.

---

## [BF-08] Badge de deudores hardcodeado en sidebar del Admin Panel

**Archivo:** `frontend/admin_panel.html`

**Bug detectado:** El badge numérico en el sidebar mostraba siempre `7` independientemente del número real de alumnos deudores en la BD.

**Causa raíz:** Valor estático en el HTML:
```html
<span ...>7</span>
```

**Cambio aplicado:**
```html
<span ... x-show="dashSummary.deudores>0" x-text="dashSummary.deudores"></span>
```

El dato `dashSummary.deudores` ya era calculado correctamente en el `init()` del componente Alpine.js.

**Riesgo mitigado:** Mostrar información falsa al operador del sistema.

**Compatibilidad afectada:** Ninguna — el dato reactivo ya existía en el estado Alpine.

**Validación:** Con 0 deudores en BD, el badge no debe aparecer. Con N deudores, debe mostrar N.

---

## [BF-09] Vista "Deudores" con datos hardcodeados (no conectada a la API)

**Archivo:** `frontend/admin_panel.html`

**Bug detectado:** La vista `view==='deudores'` mostraba 3 alumnos ficticios del seed de prueba (Carlos Fernández, Sofía Ramírez, Miguel Torres) con montos y meses inventados, ignorando completamente los datos reales de `listaAlumnos`.

**Causa raíz:** Template con HTML estático en lugar de un loop `x-for` sobre los datos reales.

**Cambio aplicado:** El template estático fue reemplazado por un loop dinámico:
```html
<template x-for="a in listaAlumnos.filter(a=>a.mesesAdeudo>0)
                              .sort((x,y)=>y.mesesAdeudo-x.mesesAdeudo)" :key="a.id">
  <div class="card-clean p-4"
       :class="{'severity-critical':a.mesesAdeudo>=3,
                'severity-high':a.mesesAdeudo===2,
                'severity-medium':a.mesesAdeudo===1}">
    <!-- nombre, meses adeudo, badge de sanción, botón registrar pago -->
  </div>
</template>
```

La severidad visual (`severity-critical/high/medium`) y el badge de sanción (`Baja temporal / Examen restringido / Aviso preventivo`) se asignan dinámicamente según `a.mesesAdeudo`.

**Riesgo mitigado:** Operadores del colegio viendo datos falsos como si fueran reales.

**Compatibilidad afectada:** `listaAlumnos` ya se cargaba con `mesesAdeudo` desde el `init()`. No se requieren cambios en API ni en `api.js`.

**Validación:** La vista Deudores debe mostrar los alumnos reales con adeudos, ordenados de mayor a menor meses de deuda.

---

## [BF-10] Comentario residual de SQLite en `database.js`

**Archivo:** `backend/src/config/database.js`

**Bug detectado:** El JSDoc del módulo decía `"Compatible con SQLite (inicial) y PostgreSQL (migración futura)"` cuando el motor actual y único es PostgreSQL 16.

**Causa raíz:** Comentario no actualizado tras la migración.

**Cambio aplicado:**
```js
// Antes:
* Compatible con SQLite (inicial) y PostgreSQL (migración futura).
// Después:
* Motor actual: PostgreSQL 16.
```

**Riesgo mitigado:** Confusión para desarrolladores que lean el código.

**Compatibilidad afectada:** Ninguna — solo comentario.

---

## [BF-11] `.env.example` con contraseñas de ejemplo obvias

**Archivo:** `backend/.env.example`

**Bug detectado:** El archivo de ejemplo contenía `POSTGRES_PASSWORD=SaeColegio2026` y `DATABASE_URL` con la misma contraseña, valores que un operador podría usar en producción sin cambiarlos.

**Causa raíz:** Valores de ejemplo demasiado "cómodos" que invitan a ser usados como estén.

**Cambio aplicado:**
```bash
# Antes:
DATABASE_URL="postgresql://sae_admin:SaeColegio2026@localhost:5432/..."
POSTGRES_PASSWORD=SaeColegio2026

# Después:
DATABASE_URL="postgresql://sae_admin:<CAMBIAR_PASSWORD>@localhost:5432/..."
POSTGRES_PASSWORD=<CAMBIAR_ANTES_DE_PRODUCCION>
```

**Riesgo mitigado:** Despliegue en producción con credenciales predecibles.

**Compatibilidad afectada:** El archivo `.env` real (no versionado) en desarrollo no se modifica. Solo la plantilla de referencia.

---

*Generado: 2026-06-08 · SAE v2.0.0 · Basado en AUDITORÍA 6*
