# TESTING — SAE Colegio San Diego

## Cómo correr pruebas

```bash
# Desde la carpeta backend/
npm test
```

## Coverage

```bash
npm run test:coverage
```

## Qué cubre

### Auth
- `auth.service.test.js` — login válido/inválido, cuenta bloqueada, registrar intentos, redirectTo por rol
- `jwt.utils.test.js` — generación de tokens, verificación, firma manipulada

### RBAC
- `middleware.rbac.test.js` — authorize() con todos los roles (ADMIN / GESTOR / MAESTRA), respuesta 403, soloAdmin, adminOGestor, todosLosRoles

### Middleware
- `middleware.auth.test.js` — authenticate(): sin token, header malformado, token inválido, firma falsificada, token válido → inyecta req.usuario
- `middleware.validate.test.js` — validate(): body válido → next(), errores → 422, estructura de respuesta, loginValidators reales

### Integración HTTP
- `integration/auth.integration.test.js` — POST /login, POST /refresh, GET /me, PATCH /reset-password (RBAC), GET /alumnos (RBAC)

### Servicios críticos
- `alumnos.service.test.js` — obtenerPorId, crear (matrícula única/duplicada), actualizar, eliminar
- `calificaciones.service.test.js` — calcularPromedio: alumno inexistente, sin calificaciones, promedio por materia, múltiples materias, exclusión cuentaParaPromedio, redondeo
- `pagos.recargo.test.js` — regla de recargo automático (día 5, día 6, concepto, diaLimitePago por alumno)
- `becas.rf21.test.js` — flujo RF-21: solicitar, aprobar, rechazar, conflictos 409

### Utilidades
- `hash.utils.test.js` — hashPassword, comparePassword

## Qué NO cubre aún

- Frontend E2E
- Performance / Load testing
- Prisma migrations
- Seeds de producción
