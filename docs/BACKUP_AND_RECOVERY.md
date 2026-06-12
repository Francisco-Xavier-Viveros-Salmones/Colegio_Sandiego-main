# 💾 BACKUP AND RECOVERY — SAE Colegio San Diego

Procedimientos de respaldo y restauración de la base de datos PostgreSQL.

---

## Estrategia de backup

| Tipo | Herramienta | Formato | Destino |
|------|-------------|---------|---------|
| Manual | `node scripts/db-backup.js` | `.sql` (pg_dump plain) | `backups/` |
| Docker | `docker exec sae_postgres pg_dump` | `.sql` | `backups/` |

Los backups son **timestamped** automáticamente:
```
backups/sae_backup_2026-06-07_14-30-00_auto.sql
backups/sae_backup_2026-06-07_14-30-00_antes-migracion.sql
```

---

## Crear un backup

### Método 1 — Script Node.js (recomendado)

```bash
cd backend

# Backup simple
node scripts/db-backup.js

# Backup con etiqueta descriptiva
node scripts/db-backup.js --label="antes-migracion"
node scripts/db-backup.js --label="fin-ciclo-2026"
```

> Requiere `pg_dump` instalado o PostgreSQL corriendo en Docker.

### Método 2 — Directamente con Docker

```bash
# pg_dump dentro del contenedor
docker exec sae_postgres pg_dump \
  -U sae_admin \
  -d sae_colegio_san_diego \
  --format=plain \
  > backups/backup_manual_$(date +%Y%m%d).sql
```

### Método 3 — npm script

```bash
cd backend
npm run db:backup
```

---

## Restaurar un backup

### Desde el script Node.js

```bash
cd backend
node scripts/db-restore.js --file=sae_backup_2026-06-07_14-30-00_auto.sql

# Listar backups disponibles antes de restaurar
node scripts/db-restore.js --list
```

### Restauración manual con Docker

```bash
# Asegurarse de que la BD está vacía o recreada
docker exec -i sae_postgres psql \
  -U sae_admin \
  -d sae_colegio_san_diego \
  < backups/backup_manual_20260607.sql
```

---

## Validar la integridad de la BD

```bash
cd backend
node scripts/db-validate.js
```

Verifica:
- Tablas principales existen
- Usuarios del sistema presentes
- Conteos básicos de registros

---

## Volúmenes Docker

Los datos de PostgreSQL se almacenan en el volumen Docker `postgres_data`:

```yaml
# docker-compose.yml
volumes:
  postgres_data:
    driver: local    # Persiste en /var/lib/docker/volumes/
  sae_backups:
    driver: local    # Backups del sistema
```

### Ver dónde están los volúmenes

```bash
docker volume inspect colegio-sandiego_postgres_data
```

### ⚠️ Nunca hacer `docker compose down -v` en producción

El flag `-v` elimina los volúmenes y **borra todos los datos**.

Secuencia segura antes de actualizar:
```bash
# 1. Backup
node scripts/db-backup.js --label="pre-update"

# 2. Solo bajar el backend (sin tocar el volumen de PostgreSQL)
docker compose stop backend

# 3. Reconstruir solo el backend
docker compose up --build -d backend
```

---

## Programar backups automáticos (Windows Task Scheduler)

```
Programa: node
Argumentos: C:\ruta\al\proyecto\backend\scripts\db-backup.js
Frecuencia: Diario a las 23:00
```

O en Linux (cron):
```cron
0 23 * * * cd /ruta/backend && node scripts/db-backup.js --label="cron"
```

---

## Retención de backups

Se recomienda mantener:
- Últimos **7 días** de backups diarios
- **1 backup por mes** de manera indefinida
- Backup **antes de cada actualización** del sistema

Limpieza manual:
```bash
# Eliminar backups con más de 30 días (formato .sql plain)
find backups/ -name "*.sql" -mtime +30 -delete
```
