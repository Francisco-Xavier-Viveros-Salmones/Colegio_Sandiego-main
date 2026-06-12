# LAN_CORS_FINALIZATION_IMPLEMENTATION.md

# CONTEXTO

Proyecto:
SAE Colegio San Diego

Estado actual LAN/CORS:
95%

Arquitectura actual:
LAN offline-first + Express + frontend estático + auto-detección IP.

Objetivo:
Completar estabilización final de red LAN y CORS SIN modificar arquitectura existente.

---

# IMPORTANTE

El sistema YA funciona en LAN.

NO reescribir:

* arquitectura red
* config.js
* CORS dinámico
* frontend API integration
* Docker networking
* backend principal

SOLO:

* validar
* estabilizar
* corregir edge cases
* completar documentación
* endurecer comportamiento LAN

---

# REGLAS CRÍTICAS

## PROHIBIDO

* cambiar arquitectura offline-first
* hardcodear localhost
* hardcodear IPs
* introducir proxy reverso complejo
* introducir nginx innecesario
* introducir Kubernetes
* introducir service discovery complejo
* modificar frontend innecesariamente
* romper compatibilidad LAN
* cambiar Docker networking innecesariamente

---

## OBLIGATORIO

* cambios mínimos
* mantener compatibilidad total
* mantener frontend funcionando
* mantener Docker funcionando
* mantener PostgreSQL funcionando
* mantener auto-detección LAN
* mantener config.js dinámico

---

# MODO DE TRABAJO

Antes de modificar:

1. inspeccionar implementación REAL
2. reproducir problema real
3. identificar causa raíz
4. aplicar fix mínimo
5. validar compatibilidad

Si una solución requiere:

* refactor masivo
* nueva arquitectura red
* proxy complejo
* infraestructura enterprise

DETENERSE y reportarlo.

---

# ESTADO ACTUAL CONFIRMADO

## YA IMPLEMENTADO

* HOST=0.0.0.0
* config.js dinámico
* auto-detección IP LAN
* CORS dinámico /24
* CORS_ORIGIN env
* soporte requests sin origin
* frontend carga config.js antes api.js
* api.js usa window.SAE_CONFIG.API_BASE
* NO localhost hardcodeado

---

# OBJETIVO REAL

NO recrear networking.

SOLO completar:

* estabilidad LAN
* edge cases CORS
* validaciones finales
* documentación HTTPS/LAN
* robustez red local

---

# MÓDULO 1 — HOST VALIDATION

## Objetivo

Validar:
HOST=0.0.0.0

---

## Verificar

Servidor:

* escucha interfaces LAN
* accesible desde clientes
* NO limitado localhost

---

## Validar

* acceso desde otra PC
* acceso navegador móvil LAN
* acceso Docker

---

## PROHIBIDO

Cambiar binding innecesariamente.

---

# MÓDULO 2 — CONFIG.JS VALIDATION

## Objetivo

Validar:
GET /config.js

---

## Verificar

Debe:

* detectar IP LAN automáticamente
* generar API_BASE correcto
* incluir VERSION correcta

---

## Validar

* múltiples interfaces red
* WiFi/Ethernet
* fallback seguro
* IP dinámica

---

## Confirmar

Frontend:
SIEMPRE usa:
window.SAE_CONFIG.API_BASE

---

## PROHIBIDO

Hardcodear localhost.

---

# MÓDULO 3 — CORS DYNAMIC VALIDATION

## Objetivo

Validar:
CORS dinámico subnet /24

---

## Verificar

Debe aceptar:

* PCs misma subred
* dispositivos móviles LAN
* frontend local

---

## Validar

* detección interfaces
* subred correcta
* múltiples NICs
* origins dinámicos

---

## Validar específicamente

Origins:
192.168.x.x
10.x.x.x
172.16.x.x

si implementación actual lo soporta.

---

## PROHIBIDO

Abrir CORS global "*"
innecesariamente.

---

# MÓDULO 4 — ENV ORIGIN VALIDATION

## Objetivo

Validar:
CORS_ORIGIN

---

## Verificar

Debe aceptar:
orígenes explícitos .env

---

## Validar

* múltiples origins
* parsing correcto
* espacios
* env vacíos

---

# MÓDULO 5 — NO-ORIGIN REQUESTS

## Objetivo

Validar:
requests sin origin

---

## Verificar

Compatibilidad:

* curl
* Postman
* SSR
* health checks

---

## Validar

NO bloquear:
requests internas legítimas.

---

# MÓDULO 6 — FRONTEND CONFIG ORDER

## Objetivo

Validar:
config.js carga ANTES api.js

---

## Verificar

En:

* admin
* gestor
* maestra

---

## Validar

NO exista:
race condition carga configuración.

---

## Confirmar

api.js:
NO usa localhost hardcodeado.

---

# MÓDULO 7 — API_BASE VALIDATION

## Objetivo

Validar:
window.SAE_CONFIG.API_BASE

---

## Verificar

Todas las requests:
usan API_BASE dinámico.

---

## Buscar y corregir

Solo si existen:

* localhost hardcodeado
* IP hardcodeada
* URLs absolutas incorrectas

---

## PROHIBIDO

Refactor frontend completo.

---

# MÓDULO 8 — LAN EDGE CASES

## Objetivo

Corregir únicamente:

* IP dinámica
* múltiples interfaces
* cambio WiFi/Ethernet
* fallback IP
* CORS inconsistentes

---

## Implementación esperada

Solo:

* guards mínimos
* fallbacks simples
* validaciones pequeñas

---

## PROHIBIDO

Implementar networking complejo.

---

# MÓDULO 9 — DOCKER LAN VALIDATION

## Objetivo

Validar:
Docker + LAN

---

## Verificar

* frontend visible LAN
* backend accesible LAN
* puertos correctos
* compose estable

---

## Validar

docker compose up

debe:

* exponer backend
* exponer frontend
* mantener acceso clientes LAN

---

# MÓDULO 10 — HTTPS DOCUMENTATION

## IMPORTANTE

NO implementar HTTPS/TLS ahora.

Arquitectura actual:
LAN privada offline-first.

HTTP plano:
DECISIÓN ARQUITECTÓNICA DOCUMENTADA.

---

# Objetivo

Documentar claramente:

* por qué no HTTPS
* entorno LAN privado
* despliegue institucional local
* no exposición internet pública

---

## Explicar

HTTPS:
puede agregarse después
si sistema migra a internet pública.

---

## PROHIBIDO

Implementar:

* nginx SSL
* certbot
* reverse proxy complejo
* cloud networking

---

# MÓDULO 11 — LAN TESTING

## Objetivo

Crear SOLO pruebas críticas LAN/CORS.

---

## Prioridad

### config.js

### CORS

### API_BASE

### requests LAN

---

## Validar

* acceso otra PC
* access móvil
* origins válidos
* requests sin origin
* Docker LAN

---

# DOCUMENTACIÓN OBLIGATORIA

Actualizar:

* LAN_SETUP.md
* DEPLOYMENT.md
* TROUBLESHOOTING.md
* SECURITY.md
* CHANGELOG.md

---

# LAN_SETUP.md

Debe incluir:

## Arquitectura LAN

## Config.js dinámico

## Acceso clientes

## Obtener IP servidor

### Windows

ipconfig

### Linux

ip addr

---

## Acceso navegador clientes

http://IP-SERVIDOR:3000

---

## Firewall Windows

---

## Problemas comunes

* IP cambió
* firewall bloquea
* backend apagado
* Docker apagado

---

# SECURITY.md

Agregar:

## HTTP sin HTTPS

Explicación:

* LAN privada
* offline-first
* entorno institucional
* decisión arquitectónica

---

# TROUBLESHOOTING.md

Agregar:

* CORS bloqueado
* config.js no carga
* frontend usa localhost
* clientes LAN no conectan
* IP cambió
* Docker no expone puertos

---

# VALIDACIÓN FINAL OBLIGATORIA

Confirmar:

* backend accesible LAN
* frontend accesible LAN
* config.js correcto
* API_BASE correcto
* CORS correcto
* requests sin origin funcionan
* Docker estable
* PostgreSQL estable
* frontend sigue operativo

---

# CHECKLIST FINAL

## LAN

* acceso desde otras PCs
* acceso móvil LAN
* IP dinámica correcta

---

## CORS

* subnet válida
* env origins válidos
* no-origin permitido

---

## Frontend

* config.js primero
* api.js dinámico
* no localhost hardcodeado

---

## Docs

* LAN_SETUP actualizado
* SECURITY actualizado
* troubleshooting actualizado

---

# FORMATO DE RESPUESTA

Para cada cambio mostrar:

## Archivo

## Problema

## Cambio aplicado

## Riesgo mitigado

## Compatibilidad afectada

## Validación realizada

---

# IMPORTANTE

Prioridad máxima:
ESTABILIDAD > COMPLEJIDAD

NO asumir.
NO inventar.
NO sobreingeniería.
NO reescribir networking funcional.

Implementar únicamente:

* fixes mínimos
* validaciones reales
* estabilización LAN/CORS basada en arquitectura existente.
