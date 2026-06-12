# Guia de ejecucion para el equipo

Esta guia sirve para ejecutar el proyecto SAE Colegio San Diego en Windows sin depender de Codex.

## Requisitos recomendados

- Node.js 18 o superior.
- Docker Desktop con Docker Compose v2.
- PowerShell o terminal de Windows.

Verificar versiones:

```powershell
node --version
docker --version
docker compose version
```

Si PowerShell bloquea `npm` con un error sobre `npm.ps1`, usar siempre `npm.cmd`.

## Opcion A - Recomendada: PostgreSQL con Docker y backend local

Esta opcion evita configurar PostgreSQL manualmente.

### 1. Clonar o copiar el proyecto

Abrir PowerShell en la carpeta del proyecto:

```powershell
cd C:\ruta\Colegio_Sandiego-main
```

### 2. Crear variables del backend

```powershell
Copy-Item backend\.env.example backend\.env
```

El archivo `backend\.env` ya queda configurado para conectarse a:

```text
postgresql://sae_admin:SaeColegio2026@localhost:5432/sae_colegio_san_diego
```

### 3. Levantar solo PostgreSQL

```powershell
docker compose up -d postgres_sae
docker compose ps
```

Esperar a que `postgres_sae` aparezca como healthy.

### 4. Instalar dependencias del backend

```powershell
cd backend
npm.cmd install
```

### 5. Generar Prisma Client

```powershell
npm.cmd run db:generate
```

### 6. Cargar datos de prueba

```powershell
npm.cmd run db:seed
```

Debe terminar mostrando credenciales como:

```text
elizabeth.admin / sandiego2026
gestor.admin / sandiego2026
laura.rios / sandiego2026
```

### 7. Arrancar el servidor

```powershell
npm.cmd start
```

Abrir:

```text
http://localhost:3000/auth/login.html
```

## Opcion B - PostgreSQL local sin Docker

Usar esta opcion solo si Docker no esta instalado, pero PostgreSQL si.

### 1. Crear usuario y base de datos

Entrar como administrador de PostgreSQL:

```powershell
psql -h localhost -p 5432 -U postgres -d postgres
```

Ejecutar:

```sql
CREATE USER sae_admin WITH PASSWORD 'SaeColegio2026';
CREATE DATABASE sae_colegio_san_diego OWNER sae_admin;
GRANT ALL PRIVILEGES ON DATABASE sae_colegio_san_diego TO sae_admin;
\q
```

### 2. Crear variables del backend

```powershell
Copy-Item backend\.env.example backend\.env
```

### 3. Cargar el esquema SQL

Desde la raiz del proyecto:

```powershell
$env:PGPASSWORD='SaeColegio2026'
psql -h localhost -p 5432 -U sae_admin -d sae_colegio_san_diego -f .\BD-ColegioSandiego\init-db\01_esquema_base.sql
psql -h localhost -p 5432 -U sae_admin -d sae_colegio_san_diego -f .\BD-ColegioSandiego\init-db\02_configuracion.sql
psql -h localhost -p 5432 -U sae_admin -d sae_colegio_san_diego -f .\BD-ColegioSandiego\init-db\03_integridad_referencial.sql
psql -h localhost -p 5432 -U sae_admin -d sae_colegio_san_diego -f .\BD-ColegioSandiego\init-db\04_triggers_auditoria.sql
psql -h localhost -p 5432 -U sae_admin -d sae_colegio_san_diego -f .\BD-ColegioSandiego\init-db\05_datos_prueba.sql
```

### 4. Instalar y ejecutar backend

```powershell
cd backend
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:seed
npm.cmd start
```

Abrir:

```text
http://localhost:3000/auth/login.html
```

## Credenciales de prueba

| Rol | Usuario | Contrasena |
| --- | --- | --- |
| ADMIN | elizabeth.admin | sandiego2026 |
| ADMIN | maria.directora | sandiego2026 |
| GESTOR | gestor.admin | sandiego2026 |
| MAESTRA | laura.rios | sandiego2026 |
| MAESTRA | mario.sanchez | sandiego2026 |

## Errores comunes

### `npm.ps1 no se puede cargar`

Usar `npm.cmd` en lugar de `npm`:

```powershell
npm.cmd install
npm.cmd start
```

### `Credenciales incorrectas`

Ejecutar nuevamente:

```powershell
cd backend
npm.cmd run db:seed
```

El seed actualiza las contrasenas de prueba a `sandiego2026`.

### `Variable de entorno requerida no definida`

Falta crear `backend\.env`:

```powershell
Copy-Item backend\.env.example backend\.env
```

### `password authentication failed for user sae_admin`

La contrasena del usuario PostgreSQL no coincide con `backend\.env`.

Soluciones:

- Si usan Docker, eliminar el volumen y recrear la base solo si no hay datos importantes:

```powershell
docker compose down -v
docker compose up -d postgres_sae
cd backend
npm.cmd run db:seed
```

- Si usan PostgreSQL local, cambiar la contrasena del usuario:

```sql
ALTER USER sae_admin WITH PASSWORD 'SaeColegio2026';
```

### `docker no se reconoce`

Docker Desktop no esta instalado o no esta en el PATH. Instalar Docker Desktop y reiniciar la terminal.

### `ESLint couldn't find eslint.config`

El lint no esta listo para ESLint 9. Esto no impide ejecutar la aplicacion.

## Comprobacion rapida

Con el servidor activo, abrir:

```text
http://localhost:3000/health
```

Debe responder algo similar a:

```json
{
  "ok": true,
  "sistema": "SAE Colegio San Diego",
  "version": "2.0.0"
}
```
