# 🚀 DEPLOYMENT.md — SAE Colegio San Diego

Guía de despliegue para entorno de producción LAN (offline-first).

---

## Requisitos

- Docker Desktop (Windows) o Docker Engine (Linux)
- Node.js 20 LTS (solo para desarrollo local sin Docker)
- Puerto `3000` disponible en el servidor

---

## Despliegue con Docker (recomendado)

### 1. Crear el archivo de variables de entorno

```bash
cp backend/.env.example backend/.env
# Editar backend/.env con los valores reales
```

Variables obligatorias en `.env`:
```
JWT_SECRET=<cadena aleatoria larga>
POSTGRES_PASSWORD=<contraseña segura>
```

### 2. Levantar todo el sistema

```bash
docker compose up --build
```

Esto levanta:
- `sae_postgres` — PostgreSQL 16 con datos persistentes
- `sae-backend` — Node.js + Express sirviendo API y frontend

### 3. Solo la base de datos (para desarrollo local del backend)

```bash
docker compose up -d postgres_sae
```

### 4. Verificar que el sistema está activo

```bash
# Health check del backend
curl http://localhost:3000/health

# O desde el navegador
http://localhost:3000/health
```

---

## Desarrollo Local (sin Docker)

```bash
cd backend
npm install
npm run dev
```

Requiere PostgreSQL corriendo (puede usarse el contenedor `postgres_sae`).

---

## Acceso en Red LAN

### Obtener la IP del servidor

**Windows:**
```
ipconfig
```
Buscar `IPv4 Address` en el adaptador de red activo.

**Linux / WSL:**
```bash
ip addr show
```

### Acceder desde otros dispositivos de la red

```
http://192.168.1.10:3000          # Inicio / login
http://192.168.1.10:3000/admin    # Panel ADMIN
http://192.168.1.10:3000/gestor   # Panel GESTOR
http://192.168.1.10:3000/maestra  # Panel MAESTRA
```

Reemplazar `192.168.1.10` con la IP real del servidor.

### Firewall Windows (si los clientes no pueden conectar)

```powershell
netsh advfirewall firewall add rule name="SAE 3000" dir=in action=allow protocol=TCP localport=3000
```

---

## Estructura de Volúmenes Docker

| Volumen        | Ruta contenedor          | Descripción                        |
|----------------|--------------------------|------------------------------------|
| `postgres_data`| `/var/lib/postgresql/data` | Datos PostgreSQL (persistentes)   |
| `sae_backups`  | `/app/backups`           | Backups generados por el sistema   |
| `./frontend`   | `/frontend`              | Archivos HTML/JS del frontend (RO) |

---

## Comandos Útiles

```bash
# Ver logs en tiempo real
docker compose logs -f backend

# Detener todo sin borrar datos
docker compose down

# Detener y borrar volúmenes (PELIGROSO: borra la BD)
docker compose down -v

# Reiniciar solo el backend
docker compose restart backend
```

---

## Checklist de Validación Docker

| Verificación                              | Comando                                         |
|-------------------------------------------|-------------------------------------------------|
| Backend responde                          | `curl http://localhost:3000/health`             |
| Panel admin visible                       | Abrir `http://localhost:3000/admin`             |
| Panel gestor visible                      | Abrir `http://localhost:3000/gestor`            |
| Panel maestra visible                     | Abrir `http://localhost:3000/maestra`           |
| Login funcional                           | `POST /api/v1/auth/login` con credenciales seed |
| Acceso LAN desde otro dispositivo         | `http://<IP_SERVIDOR>:3000/admin`               |

---

_Última actualización: Sesión 12 · 2026-06-08_
