# 📌 00_MASTER_RULES — SAE Colegio San Diego

Reglas generales e inmutables para cualquier sesión de trabajo en este proyecto.

---

## Identidad del proyecto

| Campo | Valor |
|-------|-------|
| Nombre | SAE — Sistema Administrativo Escolar |
| Cliente | Colegio San Diego |
| Tipo | Offline-First / LAN |
| Stack | Node.js + Express + Prisma + PostgreSQL + Alpine.js + Tailwind |
| Versión | 2.0.0 |

---

## Reglas generales

### PROHIBIDO
- Mover `backend/` o `frontend/` sin validar impacto funcional
- Modificar `docker-compose.yml` sin documentar en `docs/DEPLOYMENT.md`
- Cambiar imports o rutas de la aplicación
- Crear archivos fuera del árbol de `docs/PROJECT_STRUCTURE.md`
- Inventar endpoints, campos o comportamientos no existentes en el código
- Refactorizar arquitectura sin instrucción explícita

### OBLIGATORIO
- Consultar `.cerebro/memory_loop/error_ledger.md` antes de implementar
- Documentar errores de entorno en el ledger (solo bloqueos de infraestructura)
- Basar documentación únicamente en código real y estructura real
- Mantener consistencia de nombres entre todos los documentos
- Actualizar `docs/PROJECT_STRUCTURE.md` si se crea o mueve algún archivo
- Registrar cambios significativos en `docs/CHANGELOG.md`

---

## Arquitectura de capas (NO modificar)

```
Request → Routes → Middleware → Controllers → Services → Repositories → Prisma → PostgreSQL
```

Cada capa tiene una responsabilidad única e irremplazable.

---

## Roles del sistema (RBAC)

| Rol | Panel | Permisos clave |
|-----|-------|----------------|
| `ADMIN` | `/admin` | Acceso total |
| `GESTOR` | `/gestor` | Pagos, alumnos, solicitar becas |
| `MAESTRA` | `/maestra` | Calificaciones, consultar grupos |

---

## Rutas de archivos críticos

| Función | Archivo |
|---------|---------|
| Servidor Express | `backend/src/app.js` |
| Entry point | `backend/src/server.js` |
| Schema DB | `backend/prisma/schema.prisma` |
| Orquestación Docker | `docker-compose.yml` |
| Variables entorno | `backend/.env` (NO commitear) |
| Plantilla variables | `backend/.env.example` |
| Ledger de errores | `.cerebro/memory_loop/error_ledger.md` |

---

## Principio de documentación

> PRECISIÓN > CANTIDAD

No asumir. No inventar. No documentar lo que no existe en el código real.
