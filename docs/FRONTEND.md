# 🖥️ FRONTEND — SAE Colegio San Diego

Documentación técnica del frontend estático del sistema SAE.

---

## Arquitectura Frontend

El frontend es completamente **estático** (HTML + JS): no hay bundler, no hay framework SPA.
Funciona directamente desde el sistema de archivos montado como volumen Docker.

```
frontend/
├── auth/
│   └── login.html              ← Página de inicio de sesión
├── admin_panel.html            ← Panel Administrador (ADMIN)
├── gestor_panel.html           ← Panel Gestor Administrativo (GESTOR)
├── maestra_panel.html          ← Panel Docente (MAESTRA)
├── shared/
│   ├── api.js                  ← Cliente API centralizado + mappers + toast
│   ├── auth-guard.js           ← Guard de sesión + window.saeLogout()
│   └── offline-indicator.js   ← Chip de estado "Sin servidor"
└── vendor/
    ├── alpine.min.js           ← Alpine.js 3.x (sin CDN)
    ├── tailwind.cdn.js         ← Tailwind CSS (sin CDN)
    ├── lucide.min.js           ← Iconos Lucide (sin CDN)
    ├── jspdf.min.js            ← Generación PDF (sin CDN)
    └── fonts.css               ← Inter font (sin CDN)
```

### Stack Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Alpine.js | 3.x | Reactividad declarativa (x-data, x-for, x-show, x-model) |
| Tailwind CSS | 3.x | Estilos utilitarios (colores: navy, crimson, emerald, amber) |
| Lucide Icons | - | Iconos SVG vectoriales |
| jsPDF | - | Exportación de reportes en PDF |
| Inter (fuente) | - | Tipografía corporativa |

### Principios de diseño

- **Sin CDN:** Todas las dependencias están en `frontend/vendor/` — funciona offline
- **Sin bundler:** No hay webpack/vite — los archivos se sirven tal cual
- **Offline-first:** El sistema funciona sin internet, solo en LAN
- **Mobile-first:** Diseño responsivo con Tailwind CSS

---

## Orden de carga de scripts (en cada panel)

```html
<!-- 1. Config dinámica — IP del servidor LAN inyectada como window.SAE_CONFIG -->
<script src="/config.js"></script>

<!-- 2. Auth Guard — valida token antes de Alpine.js, redirige si inválido -->
<script src="/shared/auth-guard.js"></script>

<!-- 3. API Client — expone window.saeApi con todos los módulos -->
<script src="/shared/api.js"></script>

<!-- 4. Indicador offline — chip discreto cuando el servidor no responde -->
<script src="/shared/offline-indicator.js"></script>

<!-- 5. Librerías UI (vendorizadas) -->
<script src="/vendor/tailwind.cdn.js"></script>
<script defer src="/vendor/alpine.min.js"></script>
<link href="/vendor/fonts.css" rel="stylesheet" />
```

> ⚠️ El orden es obligatorio. `config.js` debe cargarse primero para que `api.js`
> lea `window.SAE_CONFIG.API_BASE` correctamente.

---

## auth-guard.js

**Responsabilidad:** Proteger cada panel redirigiendo al login antes de que Alpine.js inicialice.

### Comportamiento

1. Lee `sae_token` de `localStorage`
2. Si no hay token → redirige a `/auth/login.html`
3. Si el token está **expirado** (client-side, sin criptografía) → limpia sesión y redirige
4. Si el token tiene formato inválido → limpia sesión y redirige
5. Expone `window.saeLogout()` para logout manual desde cualquier panel

### Validación client-side

```javascript
// auth-guard.js solo verifica la expiración (campo exp del payload)
// La validación criptográfica (firma) la hace el SERVIDOR en cada request.
var payload = JSON.parse(atob(partes[1]));
var ahora   = Math.floor(Date.now() / 1000);
if (payload.exp && ahora > payload.exp) {
  limpiarSesion();
  window.location.replace('/auth/login.html');
}
```

### Logout

```javascript
// Disponible en todos los paneles después de cargar auth-guard.js
window.saeLogout();  // limpia localStorage y redirige al login
```

El botón de logout en el sidebar de cada panel llama `@click="saeLogout()"`.

---

## api.js

**Responsabilidad:** Proveer acceso centralizado y tipado a todos los endpoints del backend.
Ningún panel hace `fetch()` directamente — todo pasa por `window.saeApi`.

### Base URL dinámica

```javascript
function getBase() {
  if (window.SAE_CONFIG && window.SAE_CONFIG.API_BASE) {
    return window.SAE_CONFIG.API_BASE;  // IP LAN detectada automáticamente
  }
  return window.location.origin + '/api/v1';  // fallback
}
```

### Módulos disponibles

```javascript
window.saeApi.auth.login(creds)
window.saeApi.auth.me()

window.saeApi.alumnos.listar(filtros?)
window.saeApi.alumnos.obtener(id)
window.saeApi.alumnos.crear(datos)
window.saeApi.alumnos.actualizar(id, datos)
window.saeApi.alumnos.eliminar(id)

window.saeApi.pagos.listar(filtros?)
window.saeApi.pagos.registrar(datos)

window.saeApi.becas.listar()
window.saeApi.becas.solicitar(datos)        // Gestor: RF-21
window.saeApi.becas.resolver(id, datos)     // Admin: aprueba/rechaza

window.saeApi.calificaciones.listar(filtros?)
window.saeApi.calificaciones.porAlumno(alumnoId, periodo?)
window.saeApi.calificaciones.guardarLote(lista)

window.saeApi.grupos.listar(nivel?)
window.saeApi.grupos.obtener(id)

window.saeApi.usuarios.listar()
window.saeApi.usuarios.crear(datos)
window.saeApi.usuarios.actualizar(id, datos)
window.saeApi.usuarios.eliminar(id)
window.saeApi.usuarios.resetPassword(id, nuevaPassword)
```

### Mappers API → Frontend

```javascript
window.saeApi.mapAlumno(a)   // Aplana grupo.nombre, primer padre, estadoPago
window.saeApi.mapPago(p)     // Aplana alumno.nombre, fecha ISO→YYYY-MM-DD
window.saeApi.mapGrupo(g)    // Extrae _count.alumnos como número
```

### Constantes de mapeo UI → API

```javascript
window.saeApi.CONCEPTO_MAP    // 'Colegiatura' → 'COLEGIATURA', etc.
window.saeApi.TIPO_BECA_MAP   // 'Beca por hermanos (15%)' → 'HERMANOS', etc.
window.saeApi.ROL_MAP         // 'Administrador' → 'ADMIN', etc.
window.saeApi.PERIODO_MAP     // 'Trimestre 1' → 'TRIMESTRE_1', etc.
```

### Toast UI

```javascript
window.saeApi.toast('exito',       'Mensaje de éxito')
window.saeApi.toast('error',       'Mensaje de error')
window.saeApi.toast('advertencia', 'Mensaje de advertencia')
window.saeApi.toast('info',        'Mensaje informativo')
```

El toast aparece en la esquina inferior derecha y se cierra automáticamente en 4 segundos.
**No usa `alert()`** — la UI nunca se bloquea.

---

## Refresh Flow

El refresh de JWT es completamente silencioso para el usuario. Hay dos caminos:

### Refresh Proactivo

Se ejecuta **antes** de cada request si el token expira en menos de 15 minutos:

```javascript
if (tokenProximoAExpirar(15) && endpoint !== '/auth/refresh') {
  await intentarRefresh();
}
```

### Refresh Reactivo

Se ejecuta **después** de recibir un `401`:

```javascript
if (res.status === 401 && endpoint !== '/auth/refresh') {
  const refreshOk = await intentarRefresh();
  if (refreshOk) {
    // Reintenta la petición original con el nuevo token
    res = await fetch(getBase() + endpoint, { ...opts, headers: { ...headers, 'Authorization': 'Bearer ' + getToken() } });
  }
  // Si el segundo intento también da 401 → logout automático
  if (res.status === 401) {
    clearSession();
    window.location.replace('/auth/login.html');
  }
}
```

### Semáforo Anti-Bucle

```javascript
var _refreshing = false;  // Previene múltiples refresh simultáneos

async function intentarRefresh() {
  if (_refreshing) return false;  // ← Si ya hay uno en curso, descarta
  _refreshing = true;
  try { /* ... refresh ... */ }
  finally { _refreshing = false; }  // ← Siempre libera el semáforo
}
```

> 💡 Si dos requests simultáneas reciben 401, solo una dispara el refresh.
> La segunda ve `_refreshing = true` y retorna `false` — el retry usa el token
> que la primera ya renovó.

---

## Offline Handling

Cuando el backend es inaccesible, `api.js` retorna:

```javascript
{ ok: false, offline: true, message: 'Sin conexión al servidor SAE. Verifica la red.' }
```

Todos los paneles verifican `!res.offline` antes de mostrar toasts de error:

```javascript
if (res.ok) {
  // procesar datos
} else if (!res.offline) {
  window.saeApi.toast('error', res.message || 'Error desconocido.');
}
// Si offline → silencio (el chip del indicador ya avisa)
```

### Indicador Offline (`offline-indicator.js`)

- Sondea `GET /health` cada **30 segundos**
- Si falla → muestra un chip rojo pulsante "Sin servidor" (esquina superior derecha)
- Si recupera → elimina el chip automáticamente
- También reacciona a `navigator.onLine` del navegador
- No bloquea la UI ni usa `alert()`

---

## Paneles

### Admin Panel (`admin_panel.html`)

**Rol requerido:** `ADMIN`

**Módulos disponibles:**

| Módulo | Funcionalidad |
|--------|--------------|
| Dashboard | Métricas en tiempo real: ingresos del día, deudores, alumnos activos, becas activas |
| Pagos | Registro de pagos con autocompletado de alumnos y paginación |
| Deudores | Lista ordenada por meses de adeudo con severidad visual |
| Alumnos | Directorio con ficha por alumno, datos académicos y fiscales |
| Grupos & Materias | Vista jerárquica expandible con tabla de materias por grupo |
| Calificaciones | Búsqueda inteligente, precarga calificaciones existentes, guardado por lote |
| Becas | Asignación directa (solicita + aprueba en el mismo acto) |
| Usuarios | CRUD completo, reset de contraseña, modal de confirmación de eliminación |
| Ciclo Escolar | Configuración de planes de pago y política de recargos |
| Reportes | Exportación PDF de pagos, alumnos y becas |

**Carga lazy por módulo:** Los datos de `pagos` y `usuarios` solo se cargan cuando el usuario
navega a esas vistas — no en la carga inicial.

### Gestor Panel (`gestor_panel.html`)

**Rol requerido:** `GESTOR`

Mismo acceso de lectura que Admin (RF-04), pero con restricciones:

| Módulo | Restricción |
|--------|------------|
| Becas | **Solo solicita** — no puede aprobar (RF-21). Genera solicitud pendiente para el Admin |
| Ciclo Escolar | **Solo lectura** — sin botón de guardar |
| Usuarios | **Sin acceso** — módulo no disponible en la navegación |
| Deudores | Vista estática (sin datos dinámicos aún) |

El gestor muestra una franja informativa ("Becas requieren autorización del Administrador")
para que el usuario siempre sepa sus limitaciones.

### Maestra Panel (`maestra_panel.html`)

**Rol requerido:** `MAESTRA`

Vista reducida solo a módulos académicos:

| Módulo | Funcionalidad |
|--------|--------------|
| Dashboard | Número de grupos y alumnos a cargo |
| Grupos & Materias | Vista expandible de grupos asignados |
| Calificaciones | Búsqueda por alumno, carga de calificaciones, guardado por lote |

No tiene acceso a módulos financieros (pagos, deudores, becas) ni administrativos (usuarios, ciclo).

---

## Modales Alpine.js

Todos los modales siguen el mismo patrón:

```html
<!-- Trigger -->
<button @click="abrirModal()">Abrir</button>

<!-- Modal (click fuera cierra) -->
<div x-show="modalActivo" x-cloak class="modal-mask" @click.self="modalActivo=false">
  <div class="modal-container p-6">
    <!-- Contenido -->
    <div class="flex justify-end gap-2 mt-5">
      <button class="btn-outline" @click="modalActivo=false">Cancelar</button>
      <button class="btn-primary" @click="confirmar()">Confirmar</button>
    </div>
  </div>
</div>
```

### Modales disponibles en Admin

| Modal | Trigger | Estado |
|-------|---------|--------|
| Registrar Pago | `modal = 'pago'` | Autocompletado alumno, concepto, monto, fecha |
| Asignar Beca | `modalBecaActiva` | Select alumno dinámico (x-for listaAlumnos) |
| Nuevo Alumno | `modalNuevoAlumno` | Select grupo dinámico (x-for gruposData) |
| Nuevo Usuario | `modalUsuario` | Nombre + rol |
| Restablecer Password | `modalResetPassword` | Input contraseña (mín. 6 chars) |
| Confirmar Eliminar Usuario | `modalConfirmEliminar` | Confirmación explícita antes de DELETE |

### Modales disponibles en Gestor

| Modal | Trigger | Estado |
|-------|---------|--------|
| Registrar Pago | `modal = 'pago'` | Idéntico al admin |
| Solicitar Beca | `modalSolicitudBeca` | Select alumno dinámico (x-for listaAlumnos), motivo requerido |
| Nuevo Alumno | `modalNuevoAlumno` | Select grupo dinámico (x-for gruposData) |

---

## Dashboard

### Admin Dashboard

Datos cargados en `_cargarDashboard()`:

```javascript
// Métricas desde datos en memoria (sin request adicional)
dashSummary.alumnos  = listaAlumnos.length;
dashSummary.deudores = listaAlumnos.filter(a => a.mesesAdeudo > 0).length;

// Ingresos del día (un request filtrado por fecha)
const hoy  = new Date().toISOString().slice(0, 10);
const resP = await saeApi.pagos.listar({ fechaDesde: hoy, fechaHasta: hoy });

// Becas activas (un request a /becas)
const resB = await saeApi.becas.listar();
```

**Cache de dashboard:** Una vez cargado (`_dashboardCargado = true`), no se vuelve a cargar
automáticamente. Para refrescar, el usuario debe cambiar de vista y volver.

### Badge de Deudores (sidebar)

```html
<!-- Se muestra solo si hay deudores -->
<span x-show="dashSummary.deudores > 0" x-text="dashSummary.deudores"
      class="ml-auto bg-crimson-500 text-white text-[10px] px-1.5 rounded-full">
</span>
```

---

## Vendor Local (Sin CDN)

Todos los archivos de terceros están en `frontend/vendor/`. No se realiza ninguna petición
a CDNs externos en ningún momento.

| Archivo | Librería | Versión |
|---------|----------|---------|
| `alpine.min.js` | Alpine.js | 3.x |
| `tailwind.cdn.js` | Tailwind CSS | 3.x CDN build |
| `lucide.min.js` | Lucide Icons | - |
| `jspdf.min.js` | jsPDF | - |
| `fonts.css` | Inter (Google Fonts bundled) | - |

> ⚠️ **PROHIBIDO** agregar CDNs externos. El sistema opera en LAN sin internet.

---

## Paginación Frontend

La API soporta `?page=&limit=`. El frontend implementa paginación ligera:

```javascript
// Admin Panel — alumnos
paginaAlumnos: 1, limitAlumnos: 20, totalAlumnos: 0, paginasAlumnos: 1

// Admin Panel — pagos
paginaPagos: 1, limitPagos: 25, totalPagos: 0, paginasPagos: 1

// Los botones Anterior/Siguiente solo se muestran si hay más de 1 página:
x-show="paginasAlumnos > 1"
```

---

## Sesión y localStorage

| Clave | Contenido |
|-------|-----------|
| `sae_token` | JWT activo (string) |
| `sae_usuario` | Objeto `{ id, nombre, username, rol }` (JSON) |

Ambas claves se limpian en `clearSession()` / `saeLogout()`.

---

## Paleta de Colores

| Nombre | HEX | Uso |
|--------|-----|-----|
| `navy` | `#003366` | Sidebar, botones primarios, encabezados |
| `navy-700` | `#001F40` | Hover de elementos navy |
| `crimson` | `#CC0000` | Errores, deudores críticos, alertas |
| `emerald-600` | `#059669` | Éxito, becas activas |
| `amber-600` | `#D97706` | Advertencias, deudores medios |
| `gray-50` | `#F9FAFB` | Fondo principal de los paneles |

---

*Última actualización: Sesión 15 · 2026-06-08*
