# 📖 03_DOCUMENTATION — SAE Colegio San Diego

Estándar de documentación técnica del proyecto.

---

## Documentos oficiales del proyecto

Todos los documentos viven en `docs/`:

| Archivo | Propósito | Última actualización |
|---------|-----------|---------------------|
| `ARCHITECTURE.md` | Arquitectura, capas, RBAC, JWT, stack | Vivo |
| `DATABASE.md` | Esquema DB, modelos, relaciones, índices | Vivo |
| `API_DOCUMENTATION.md` | Endpoints, parámetros, respuestas, ejemplos | Vivo |
| `SECURITY.md` | Flujo JWT, bcrypt, Helmet, rate limiting | Vivo |
| `DEPLOYMENT.md` | Despliegue Docker, LAN, firewall | Vivo |
| `LAN_SETUP.md` | Configuración red local offline-first | Vivo |
| `TROUBLESHOOTING.md` | Errores frecuentes y soluciones paso a paso | Vivo |
| `BACKUP_AND_RECOVERY.md` | Backups y restauración de la BD | Vivo |
| `TESTING.md` | Cómo correr pruebas, cobertura, convenciones | Vivo |
| `EVALUATION_GUIDE.md` | Guía de defensa académica, preguntas frecuentes | Vivo |
| `MANUAL_USUARIO.md` | Manual de uso por rol | Vivo |
| `PROJECT_STRUCTURE.md` | Árbol del proyecto, módulos, convenciones | Vivo |
| `CHANGELOG.md` | Historial de cambios por sesión | Vivo |

---

## Estándar de formato

### Usar siempre
- Markdown limpio y legible
- Tablas para comparaciones y listas estructuradas
- Bloques de código con lenguaje especificado (` ```bash `, ` ```js `, etc.)
- Checklists (`- [ ]`) para pasos y validaciones
- Diagramas ASCII para flujos y arquitecturas

### Evitar
- Texto excesivo sin estructura
- Redundancia entre documentos
- Explicaciones vagas sin código de referencia
- Inventar comandos, rutas o comportamientos no verificados

---

## Reglas de consistencia

Todos los documentos DEBEN usar los mismos:

### Nombres de módulos
`auth`, `alumnos`, `pagos`, `becas`, `calificaciones`, `grupos`, `usuarios`

### Rutas de endpoints
`/api/v1/auth`, `/api/v1/alumnos`, `/api/v1/pagos`, `/api/v1/becas`,  
`/api/v1/calificaciones`, `/api/v1/grupos`, `/api/v1/usuarios`

### Nombres de roles RBAC
`ADMIN`, `GESTOR`, `MAESTRA` (siempre en mayúsculas)

### Rutas del proyecto
```
backend/src/controllers/[módulo]/[módulo].controller.js
backend/src/services/[módulo]/[módulo].service.js
backend/src/repositories/[módulo]/[módulo].repository.js
backend/src/routes/[módulo].routes.js
```

---

## Proceso para actualizar documentación

Cuando se haga un cambio funcional en el sistema:

1. **Verificar** qué documentos se ven afectados
2. **Actualizar** solo los documentos relevantes
3. **Mantener** consistencia de nombres y rutas
4. **Registrar** el cambio en `docs/CHANGELOG.md`
5. **Actualizar** `docs/PROJECT_STRUCTURE.md` si cambia la estructura de archivos

---

## Mapa: "Si cambia X → actualizar Y"

| Cambio | Documentos a actualizar |
|--------|------------------------|
| Nuevo endpoint | `API_DOCUMENTATION.md` |
| Nuevo módulo/ruta | `PROJECT_STRUCTURE.md` + `API_DOCUMENTATION.md` |
| Cambio en RBAC | `ARCHITECTURE.md` + `SECURITY.md` |
| Cambio en Docker | `DEPLOYMENT.md` + `TROUBLESHOOTING.md` |
| Cambio en schema BD | `DATABASE.md` |
| Nuevo error de entorno | `.cerebro/memory_loop/error_ledger.md` |
| Nuevo test | `TESTING.md` |
| Cualquier cambio notable | `CHANGELOG.md` |

---

## Auditorías

Las auditorías técnicas históricas se guardan en `audits/`:

```
audits/
├── AUDITORIA.md       ← Primera auditoría técnica
├── AUDITORIA_2.md     ← Segunda auditoría
├── AUDITORIA3.md      ← Tercera auditoría
├── AUDITORIA4.md      ← Cuarta auditoría
└── AUDITORIA5.md      ← Quinta auditoría (más reciente)
```

Las auditorías son **documentos históricos inmutables** — no se modifican después de cerradas.
