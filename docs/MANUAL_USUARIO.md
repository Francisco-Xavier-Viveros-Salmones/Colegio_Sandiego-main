# 📚 MANUAL DE USUARIO — SAE Colegio San Diego

Sistema Administrativo Escolar — versión 2.0.0

---

## Acceso al sistema

Desde cualquier equipo de la red del colegio, abrir el navegador y escribir:

```
http://IP_SERVIDOR:3000
```

Se mostrará la pantalla de inicio de sesión.

### Credenciales de inicio de sesión

| Campo | Descripción |
|-------|-------------|
| Usuario | Nombre de usuario asignado por el administrador |
| Contraseña | Contraseña provisional (se debe cambiar en el primer acceso) |

> Si la cuenta fue bloqueada por múltiples intentos fallidos, contactar al Administrador.

---

## Roles del sistema

| Rol | Descripción | Panel |
|-----|-------------|-------|
| **ADMIN** | Administrador — acceso total | `/admin` |
| **GESTOR** | Gestor administrativo — pagos y alumnos | `/gestor` |
| **MAESTRA** | Docente — calificaciones y grupos | `/maestra` |

Cada rol redirige automáticamente a su panel al iniciar sesión.

---

## Panel ADMINISTRADOR

**Acceso:** `/admin_panel.html`

### Módulos disponibles

#### Usuarios
- Crear nuevos usuarios del sistema (ADMIN, GESTOR, MAESTRA)
- Activar / desactivar usuarios
- Restablecer contraseña de un usuario

#### Alumnos
- Registrar nuevos alumnos
- Editar datos (nombre, matrícula, grupo, nivel)
- Dar de baja (soft delete — no elimina datos históricos)
- Buscar por nombre, matrícula, grupo o estado de pago

#### Grupos
- Crear grupos (ej. `3° A Primaria`)
- Asignar docentes titulares
- Asignar materias al grupo

#### Pagos
- Registrar colegiaturas, inscripciones, material didáctico
- Ver historial de pagos por alumno
- El sistema aplica automáticamente el **recargo de $400** si la colegiatura se paga después del día 5 del mes

#### Becas
- Ver solicitudes de beca pendientes
- **Aprobar** o **rechazar** solicitudes enviadas por el Gestor
- Al aprobar: el descuento aplica a partir del siguiente pago

#### Configuración
- Ciclo escolar activo
- Día límite de pago (global y por alumno)
- Monto de recargo por atraso

---

## Panel GESTOR

**Acceso:** `/gestor_panel.html`

### Módulos disponibles

#### Alumnos
- Buscar alumnos por nombre, matrícula, nivel, grupo
- Consultar datos y estado de pago
- Registrar y editar datos de alumnos

#### Pagos
- Registrar pagos de alumnos (colegiatura, inscripción, uniforme, material)
- Consultar historial de pagos
- Ver lista de alumnos con adeudos

#### Becas
- **Solicitar** beca para un alumno (el ADMIN la aprueba)
- Ver estado de solicitudes (PENDIENTE / APROBADA / RECHAZADA)

#### Reportes
- Lista de deudores
- Alumnos con restricción de examen (2+ meses de adeudo)
- Alumnos con baja temporal (3+ meses)

---

## Panel MAESTRA

**Acceso:** `/maestra_panel.html`

### Módulos disponibles

#### Calificaciones
- Registrar calificaciones por alumno, materia y trimestre
- Editar calificaciones registradas
- Ver promedio general del alumno

#### Grupos
- Ver lista de alumnos del grupo asignado
- Consultar datos básicos de cada alumno

#### Consultas
- Buscar alumno por nombre o matrícula
- Ver calificaciones históricas

---

## Funciones comunes a todos los roles

### Cambiar contraseña
Al ingresar con una contraseña provisional, el sistema obliga a cambiarla.

### Cerrar sesión
Usar el botón "Cerrar sesión" en el panel. El token expira automáticamente a las 8 horas.

### Renovación automática de sesión
El sistema renueva el token automáticamente si el usuario está activo. Si el token expiró hace menos de 2 horas, se renueva sin necesidad de volver a iniciar sesión.

---

## Estados de pago del alumno

| Estado | Descripción | Consecuencia |
|--------|-------------|--------------|
| `AL_CORRIENTE` | Pagos al día | Sin restricciones |
| `AVISO_PREVENTIVO` | 1 mes de adeudo | Notificación a familia |
| `EXAMEN_RESTRINGIDO` | 2 meses de adeudo | No puede presentar exámenes |
| `BAJA_TEMPORAL` | 3+ meses de adeudo | No asiste + pierde beca |

---

## Tipos de beca

| Tipo | Descuento | Descripción |
|------|-----------|-------------|
| `HERMANOS` | 15% | Segundo o más hijos en el colegio |
| `EXCELENCIA` | 20% | Promedio académico sobresaliente |
| `INSCRIPCION_TEMPRANA` | 10% | Pago anticipado de inscripción |
| `OTRO` | 0% | Caso especial (monto definido manualmente) |

---

## Regla de recargo automático

Si el pago de **COLEGIATURA** se registra después del día 5 del mes:

- Se aplica automáticamente un recargo de **$400**
- Visible en el comprobante de pago
- Configurable por el Administrador

Si el alumno tiene un día límite de pago personalizado, ese día prevalece sobre el día 5 global.

---

## Soporte

Para problemas técnicos, contactar al Administrador del sistema.
Para consultar errores conocidos: `docs/TROUBLESHOOTING.md`
