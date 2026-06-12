-- ============================================================
-- SAE Colegio San Diego — Migración Baseline PostgreSQL v6
-- Fecha: 2026-05-27
--
-- IMPORTANTE: Este archivo es un baseline/marcador de estado.
-- El esquema REAL es creado por los scripts de init-db de Docker:
--   BD-ColegioSandiego/init-db/01_esquema_base.sql
--   BD-ColegioSandiego/init-db/02_configuracion.sql
--
-- Flujo de despliegue inicial:
--   1. docker compose up (ejecuta init-db/*.sql automáticamente)
--   2. npx prisma migrate resolve --applied 20260527000001_init_postgresql
--   3. npm run db:seed
--
-- Para entornos donde Docker no ejecutó init-db (CI/CD sin Docker):
--   1. psql -f BD-ColegioSandiego/init-db/01_esquema_base.sql
--   2. npx prisma migrate resolve --applied 20260527000001_init_postgresql
--   3. npm run db:seed
--
-- Esta migración NO contiene SQL de creación de tablas porque
-- el schema Docker ya las creó. Prisma la usa solo para llevar
-- el historial de versiones a partir de este estado.
-- ============================================================

-- Verificar que las tablas principales existen (fallará si init-db no corrió)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuario' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Error de baseline: la tabla "usuario" no existe. Ejecuta primero los scripts init-db de Docker.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alumno' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Error de baseline: la tabla "alumno" no existe. Ejecuta primero los scripts init-db de Docker.';
  END IF;
  RAISE NOTICE 'Baseline PostgreSQL v6 verificado correctamente.';
END $$;
