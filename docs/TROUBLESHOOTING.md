# 🔧 TROUBLESHOOTING — SAE Colegio San Diego

Soluciones a problemas frecuentes del sistema SAE.

---

## Docker

### El sistema no levanta con `docker compose up`

**Síntoma:** Error al iniciar contenedores.

```bash
# Verificar que Docker Desktop esté corriendo
docker ps

# Ver logs detallados
docker compose up --build 2>&1 | head -60

# Resetear todo y reconstruir
docker compose down -v
docker compose up --build
```

### `sae-backend` no puede conectar a PostgreSQL

**Síntoma:** `Error: Can't reach database server`

```bash
# Verificar que postgres_sae esté healthy
docker compose ps

# Ver logs de PostgreSQL
docker compose logs postgres_sae

# Esperar a que pase de starting a healthy antes de reiniciar backend
docker compose restart backend
```

La causa más frecuente: `sae-backend` arrancó antes de que PostgreSQL terminara el init.

### Puerto 3000 ya en uso

**Síntoma:** `Error: listen EADDRINUSE :::3000`

```bash
# Windows: encontrar qué ocupa el puerto
netstat -ano | findstr :3000

# Matar el proceso (reemplazar PID)
taskkill /PID <PID> /F

# Linux / WSL
lsof -ti:3000 | xargs kill -9
```

### Frontend 404 en rutas `/admin`, `/gestor`, `/maestra`

**Causa raíz:** Ver `[ERR-006]` en `error_ledger.md`.

El frontend se monta como volumen Docker:
```yaml
- ./frontend:/frontend:ro
```
Verificar que este volumen esté presente en `docker-compose.yml` y que la carpeta `frontend/` exista en la raíz del proyecto.

---

## PostgreSQL

### `relation "X" does not exist`

**Causa:** Las migraciones no se aplicaron.

```bash
# Dentro del contenedor backend o en local con BD activa
cd backend
npx prisma migrate deploy
```

### Error de autenticación PostgreSQL

**Síntoma:** `password authentication failed for user "sae_admin"`

Verificar que `POSTGRES_PASSWORD` en `docker-compose.yml` y en `backend/.env` coincidan.

```bash
# Ver variables en uso
docker compose config
```

### Perder datos al hacer `docker compose down -v`

⚠️ El flag `-v` **elimina los volúmenes** incluyendo `postgres_data`.
**Nunca usar** `-v` en producción sin hacer backup primero.

```bash
# Backup antes de cualquier operación destructiva
cd backend && node scripts/db-backup.js
```

---

## JWT / Autenticación

### Token inválido después de reiniciar el servidor

**Causa:** `JWT_SECRET` cambió entre reinicios.

El `.env` debe tener un `JWT_SECRET` **fijo y permanente** (mínimo 32 caracteres).
Nunca usar valores generados dinámicamente.

```bash
# Verificar que JWT_SECRET esté definido en .env
grep JWT_SECRET backend/.env
```

### `401 Token inválido` en peticiones normales

**Causas posibles:**

1. Token generado con un `JWT_SECRET` diferente al actual → regenerar haciendo login de nuevo
2. Token corrompido en `localStorage` → limpiar `localStorage` y reiniciar sesión
3. Clock skew > 5 minutos entre el servidor y el cliente → sincronizar relojes

```javascript
// Verificar desde la consola del navegador
const token = localStorage.getItem('sae_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expira:', new Date(payload.exp * 1000));
console.log('Ahora:', new Date());
```

### `401 Sesión expirada` — el refresh no funcionó

**Síntoma:** La sesión se cierra inesperadamente y redirige al login.

**Causas:**
- El token expiró hace **más de 2 horas** → el refresh es rechazado (fuera de ventana de gracia)
- El interceptor no pudo alcanzar `POST /auth/refresh` (sin conexión)

**Solución:** Iniciar sesión de nuevo. El sistema está funcionando correctamente.

### `POST /auth/refresh` responde 401 "Token inválido o firma corrupta"

**Causa:** El token enviado tiene la firma manipulada o fue generado con otro `JWT_SECRET`.

`POST /auth/refresh` usa `jwt.verify({ ignoreExpiration: true })` — verifica la firma siempre.
Un token con firma inválida **siempre** retorna 401, no importa el contenido del payload.

**No es un bug.** El sistema rechaza tokens falsificados aunque estén dentro de la ventana de gracia.

### `POST /auth/refresh` responde 500

**Causa:** Ver `[ERR-007]` en `error_ledger.md`.
Versión corregida desde sesión 07. Actualizar el código si es una versión anterior.

### `401 Usuario inactivo o eliminado` en `GET /auth/me`

**Síntoma:** Token válido, pero `/auth/me` responde 401.

**Causa:** El usuario fue desactivado o eliminado en la BD **después** de que se emitió el JWT.
El sistema verifica en cada `/auth/me` que el usuario siga con `activo=true` y `eliminadoEn=null`.

**Acción:** El ADMIN debe reactivar al usuario si fue desactivado por error:

```sql
-- Reactivar usuario desactivado
UPDATE usuario
SET activo = true, eliminado_en = NULL
WHERE nombre_usuario = 'USUARIO_AQUI';
```

### Login bloqueado (HTTP 423)

**Síntoma:** `Cuenta bloqueada. Intenta en X minuto(s).`

```bash
# Desbloquear directamente en PostgreSQL
docker exec -it sae_postgres psql -U sae_admin -d sae_colegio_san_diego -c \
  "UPDATE usuario SET bloqueado_hasta = NULL, intentos_fallidos = 0 WHERE nombre_usuario = 'USUARIO_AQUI';"
```

### HTTP 429 Too Many Requests — Rate Limit

**Síntoma:** Las peticiones de login responden `429` con mensaje de espera.

**Causa:** Se superaron **10 requests a `/api/v1/auth` en 15 minutos** (por IP).

**Solución:** Esperar 15 minutos. No es un bug — protege contra ataques de fuerza bruta.

Si el bloqueo afecta a toda la subred (NAT detrás de un router):
```bash
# Reiniciar el rate limiter reiniciando el proceso Node.js
docker compose restart backend
```

> ⚠️ En producción no reiniciar el backend para desbloquear IPs — usar una ventana de
> mantenimiento o aumentar el límite en `configuracion_sistema` si es necesario.

---

## Prisma

### `Schema engine is not running`

```bash
cd backend
npx prisma generate
```

### `Error: P2002 Unique constraint failed`

**Causa:** Se intenta crear un registro con un valor único ya existente (ej. matrícula duplicada).
La API responde `409`. Verificar el valor conflictivo en el request body.

### `Error: P2025 Record not found`

**Causa:** El registro que se intenta actualizar/eliminar no existe.
La API responde `404`.

---

## Red LAN y CORS

### Error CORS en el navegador (`Cross-Origin Request Blocked`)

**Síntoma:** La consola del navegador muestra un error CORS al hacer peticiones a la API.

**Causas y soluciones:**

1. **La IP del cliente no es reconocida** — el servidor detecta la subred `/24` de su propia IP.
   Si el cliente está en `192.168.2.x` y el servidor en `192.168.1.x`, CORS rechaza.
   **Solución:** Agregar la IP del cliente a `CORS_ORIGIN` en el `.env`:
   ```
   CORS_ORIGIN=http://localhost:3000,http://192.168.2.50:3000
   ```

2. **Espacios en `CORS_ORIGIN`** — versiones antiguas del código no hacían `.trim()`.
   Si la variable tiene `"http://url1, http://url2"` (espacio después de coma), el segundo
   origen no era reconocido. **Solución:** Actualizar el backend (fix incluido desde Sesión 14).

3. **`config.js` detectó una IP incorrecta** — el frontend apunta a una IP distinta del servidor.
   **Verificar:**
   ```bash
   curl http://localhost:3000/config.js
   ```
   Si `SERVER_IP` es incorrecto, desactivar adaptadores de red virtuales (VPN, Hyper-V).

### `config.js` devuelve `SERVER_IP: '127.0.0.1'` en lugar de la IP LAN

**Causa:** El servidor no tiene interfaces de red IPv4 activas no-loopback, o todas están
desactivadas (Docker sin adaptador de red, servidor offline).

**Verificar:**
```bash
# En el servidor
ip addr show     # Linux
ipconfig         # Windows
```

Si hay interfaces activas pero el sistema detecta `127.0.0.1`, puede haber adaptadores
virtuales con mayor prioridad. Desactivar los que no sean la LAN principal.

### Los clientes LAN apuntan a la URL incorrecta

**Síntoma:** La API llama a `http://127.0.0.1:3000` en lugar de la IP real del servidor.

**Causa:** El navegador del cliente tiene `config.js` cacheado con la IP incorrecta.

**Solución:** Forzar recarga sin caché:
```
Ctrl + Shift + R  (Windows/Linux)
Cmd  + Shift + R  (macOS)
```

`/config.js` tiene `Cache-Control: no-cache` — una recarga forzada descarga la versión
actualizada con la IP correcta.

### Clientes no pueden conectar al servidor

**Checklist:**
- [ ] Servidor y cliente en la misma subred (ej. `192.168.1.x`)
- [ ] Puerto 3000 abierto en firewall de Windows del servidor
- [ ] `docker compose ps` muestra `sae-backend` como `healthy`
- [ ] Verificar IP con `ipconfig` en el servidor

```powershell
# Abrir puerto si falta
netsh advfirewall firewall add rule name="SAE 3000" dir=in action=allow protocol=TCP localport=3000
```

### El sistema carga en el servidor pero no en clientes

**Causa probable:** IP en `config.js` es `127.0.0.1` (loopback).

El backend detecta automáticamente la primera IPv4 no-loopback.
Si el servidor tiene múltiples interfaces de red activas (VPN, adaptadores virtuales), puede detectar una IP incorrecta.

```bash
# Verificar qué IP está exponiendo
curl http://localhost:3000/config.js
```

Desactivar adaptadores de red virtuales que no correspondan a la LAN real.

---

## Frontend

### El frontend no conecta al backend (pantalla en blanco / spinner infinito)

**Diagnóstico rápido:**
```bash
# Verificar que config.js responda con la IP correcta
curl http://localhost:3000/config.js

# Verificar que el backend esté activo
curl http://localhost:3000/health
```

**Causas y soluciones:**

1. **`config.js` no cargó antes de `api.js`** — revisar el orden de `<script>` en el HTML:
   ```
   config.js → auth-guard.js → api.js → offline-indicator.js → tailwind → alpine
   ```

2. **`SAE_CONFIG` no está definido** — si `config.js` da error 404, el `API_BASE` se determina
   de `window.location.origin`, que en clientes LAN puede no coincidir con el servidor.

3. **CORS bloqueado** — ver sección "Red LAN y CORS" de este archivo.

---

### Loop de refresh / sesión expira inmediatamente

**Síntoma:** Al acceder al panel, redirige a login de inmediato aunque acabas de iniciar sesión.

**Causas:**

1. **Reloj desincronizado** — el campo `exp` del JWT se compara con `Date.now()` del cliente.
   Si el reloj del cliente está adelantado > 8h, el token parece expirado al recibirlo.
   **Solución:** Sincronizar el reloj del equipo cliente (Windows: `w32tm /resync`).

2. **Token no llegó al localStorage** — verificar que el login responda `{ ok: true, data: { token } }`:
   ```javascript
   // En consola del navegador (en login.html)
   await fetch('/api/v1/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username: 'usuario', password: 'contraseña' })
   }).then(r => r.json()).then(console.log);
   ```

3. **Dos tabs hacen refresh simultáneamente** — el semáforo `_refreshing` previene esto dentro
   de una pestaña, pero dos pestañas distintas no comparten el semáforo.
   Esto es raro — si ocurre, cierra todas las pestañas y vuelve a iniciar sesión.

---

### Sesión inválida — panel carga pero las peticiones fallan

**Síntoma:** El panel carga, pero todas las tablas están vacías y hay errores en consola.

**Verificar desde consola del navegador:**
```javascript
const token   = localStorage.getItem('sae_token');
const usuario = JSON.parse(localStorage.getItem('sae_usuario'));
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Usuario:', usuario);
console.log('Expira:', new Date(payload.exp * 1000));
console.log('Ahora:', new Date());
```

Si el token es válido pero las peticiones dan 401, el secreto JWT del servidor cambió.
**Solución:** Cerrar sesión y volver a iniciar sesión. El ADMIN debe verificar que
`JWT_SECRET` en `backend/.env` sea fijo y no se regenere en cada reinicio.

---

### `config.js` falla — `window.SAE_CONFIG` no definido

**Síntoma:** Consola muestra `window.SAE_CONFIG is undefined` o peticiones van a `undefined/api/v1`.

**Verificar:**
```bash
# El backend sirve /config.js como JavaScript con window.SAE_CONFIG
curl http://localhost:3000/config.js
```

**Causas:**

1. **Backend no está corriendo** — `docker compose ps` → verificar que `sae-backend` sea `healthy`
2. **Error en `app.js`** — el endpoint `GET /config.js` tiene un try/catch; ver logs:
   ```bash
   docker compose logs backend | grep config
   ```

---

### Backend offline — el indicador "Sin servidor" no desaparece

**Síntoma:** El chip rojo "Sin servidor" persiste aunque el backend ya esté activo.

**Diagnóstico:**
```bash
# Verificar que /health responda correctamente
curl http://SERVIDOR_IP:3000/health
```

El indicador sondea `/health` cada 30 segundos. Si acaba de reiniciar el backend,
espera hasta 30 segundos para que el chip desaparezca.

Si el chip persiste más de 1 minuto tras reiniciar el backend:
1. Verificar que el frontend cargó `offline-indicator.js` (ver Network en DevTools)
2. Verificar que `window.SAE_CONFIG.SERVER_IP` apunte a la IP correcta del servidor

---

### Toast no aparece al realizar operaciones

**Síntoma:** Las operaciones (guardar, eliminar, etc.) parecen funcionar pero no hay
confirmación visual.

**Causas:**

1. **Error de z-index** — otro elemento cubre `z-index: 9999`. Verificar superposición de modales.
2. **Toast se genera antes del DOM** — asegurarse de que `document.body` existe (siempre es
   así después de que Alpine.js inicializa).
3. **Respuesta `ok: false` con `offline: true`** — el panel está offline y silencia el toast.

---

### Dashboard vacío / métricas en cero

**Síntoma:** El panel Admin muestra 0 en todas las métricas del dashboard.

**Causas:**

1. **Backend offline** — las peticiones retornan `{ offline: true }` silenciosamente
2. **`_dashboardCargado` ya fue marcado como true** con datos vacíos — navegar a otro módulo y volver recarga los datos.
3. **Sin alumnos en BD** — las métricas son reales: si la BD está vacía, el dashboard muestra 0.

**Verificar:**
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/alumnos
```

---

## Prisma — Errores conocidos (ver error_ledger.md)

| Código | Descripción |
|--------|-------------|
| ERR-001 | Enums no soportados en SQLite |
| ERR-003 | `createMany skipDuplicates` no soportado en SQLite |
| ERR-004 | `upsert` con `@@unique` compuesto nullable en PostgreSQL |
| ERR-005 | Campos obligatorios faltantes en modelo Grupo |
| ERR-006 | Frontend 404 en Docker por ruta relativa |
| ERR-007 | `POST /auth/refresh` 500 por `iss` duplicado en payload JWT |

Para detalles completos: `.cerebro/memory_loop/error_ledger.md`
