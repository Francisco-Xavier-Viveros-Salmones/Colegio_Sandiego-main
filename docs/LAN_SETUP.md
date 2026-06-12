# 🌐 LAN_SETUP — SAE Colegio San Diego

Guía para configurar el sistema SAE en una red local (LAN).
El sistema es **Offline-First**: no requiere internet para operar.

---

## ¿Qué es la arquitectura LAN?

Un equipo actúa como **servidor** (ejecuta backend + PostgreSQL).
Los demás equipos de la red son **clientes** que acceden por el navegador.

```
[Servidor]                        [Clientes LAN]
  Docker                            Navegador
  PostgreSQL  ◄──── LAN / WiFi ────  Chrome / Edge
  Node.js                           Tablet, PC, Celular
  Puerto 3000
```

---

## Paso 1 — Configurar el servidor

### 1.1 Obtener la IP del servidor

**Windows:**
```
ipconfig
```
Buscar `Dirección IPv4` en el adaptador de red activo (Ethernet o WiFi).
Ejemplo: `192.168.1.10`

**Linux / WSL:**
```bash
ip addr show
```

### 1.2 Abrir el puerto 3000 en el firewall de Windows

```powershell
netsh advfirewall firewall add rule name="SAE 3000" dir=in action=allow protocol=TCP localport=3000
```

Verificar que la regla existe:
```powershell
netsh advfirewall firewall show rule name="SAE 3000"
```

### 1.3 Levantar el sistema

```bash
# Desde la raíz del proyecto
docker compose up --build
```

Verificar que está activo:
```
http://localhost:3000/health
```

---

## Paso 2 — Acceder desde clientes LAN

Desde cualquier equipo en la **misma red**:

```
http://192.168.1.10:3000              ← Inicio (redirige a admin_panel)
http://192.168.1.10:3000/admin        ← Panel Administrador
http://192.168.1.10:3000/gestor       ← Panel Gestor
http://192.168.1.10:3000/maestra      ← Panel Maestra
```

> Reemplazar `192.168.1.10` con la IP real del servidor.

---

## Detección automática de IP

El backend detecta su propia IP de red automáticamente.
El endpoint `GET /config.js` inyecta la IP al frontend:

```js
window.SAE_CONFIG = {
  API_BASE:  'http://192.168.1.10:3000/api/v1',
  SERVER_IP: '192.168.1.10',
  PORT:      3000,
  VERSION:   '2.0.0',
};
```

Los clientes cargan este script al iniciar y apuntan automáticamente al servidor correcto.

---

## CORS — Orígenes permitidos

El servidor acepta requests de:

1. **Orígenes explícitos** definidos en `CORS_ORIGIN` del `.env`
2. **Cualquier IP de la subred LAN** detectada automáticamente (`/24`)
3. **Requests sin Origin** (curl, Postman, health checks internos)

Esto permite que cualquier dispositivo de la red `192.168.1.x` acceda sin configuración adicional.

### Formato de CORS_ORIGIN en .env

```env
# Formato correcto — sin espacios después de la coma
CORS_ORIGIN=http://localhost:3000,http://192.168.1.5:3000

# También válido — los espacios se eliminan automáticamente (trim)
CORS_ORIGIN=http://localhost:3000, http://192.168.1.5:3000
```

La coma separa múltiples orígenes. Los espacios extra se eliminan automáticamente.

### Detección automática de subred `/24`

El servidor detecta su propia IP LAN y acepta requests de toda la subred `/24`:

- Servidor en `192.168.1.10` → acepta cualquier `192.168.1.x`
- Servidor en `10.0.0.5` → acepta cualquier `10.0.0.x`
- Servidor con múltiples NICs → acepta la subred de cada interfaz activa

> **Nota IPv6:** La detección automática solo aplica a IPv4. Si el cliente conecta por IPv6,
> debe estar en la lista `CORS_ORIGIN` explícita del `.env`.

---

## Requisitos de red

| Requisito | Descripción |
|-----------|-------------|
| Red compartida | Servidor y clientes en la misma subred |
| Puerto 3000 | Abierto en el firewall del servidor |
| Puerto 5432 | Solo accesible internamente (Docker network) |

---

## Verificación de conectividad

Desde el cliente, en el navegador:
```
http://IP_SERVIDOR:3000/health
```

Respuesta esperada:
```json
{
  "ok": true,
  "sistema": "SAE Colegio San Diego",
  "version": "2.0.0",
  "entorno": "production"
}
```

Si no conecta → revisar firewall y que ambos equipos estén en la misma red.

---

## Solución rápida de problemas

| Síntoma | Solución |
|---------|----------|
| Cliente no conecta | Verificar regla firewall en servidor |
| IP cambia al reiniciar | Asignar IP estática al servidor en el router |
| Error CORS en navegador | IP del cliente no está en subred del servidor — agregar a `CORS_ORIGIN` |
| `config.js` muestra IP incorrecta | El servidor tiene múltiples interfaces — ver sección "IP múltiple" |
| API llama a IP incorrecta | Limpiar caché del navegador — `config.js` tiene `Cache-Control: no-cache` |
| Acceso funciona en servidor pero no en clientes | Verificar que el servidor escucha en `0.0.0.0` no en `127.0.0.1` |

### Si el servidor tiene múltiples interfaces (VPN, Hyper-V, etc.)

El `config.js` detecta automáticamente la **primera** IPv4 no-loopback. Si hay adaptadores
virtuales (Hyper-V, VMware, VirtualBox, VPN), puede detectar una IP incorrecta.

```bash
# Ver qué IP está exponiendo el servidor
curl http://localhost:3000/config.js
```

**Solución:** Desactivar adaptadores de red virtuales que no correspondan a la LAN real,
o definir `CORS_ORIGIN` explícito con la IP correcta del servidor.

---

*Última actualización: Sesión 14 · 2026-06-08*
