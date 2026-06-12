'use strict';

const { Router }             = require('express');
const becasController        = require('../controllers/becas/becas.controller');
const { authenticate }       = require('../middleware/auth.middleware');
const { authorize }          = require('../middleware/rbac.middleware');
const { validate }           = require('../middleware/validate.middleware');
const {
  crearSolicitudBecaValidators,
  resolverSolicitudValidators,
} = require('../utils/validators/becas.validator');

const router = Router();

router.use(authenticate);

// GET /api/v1/becas — becas activas (todos los roles)
router.get('/', authorize('ADMIN', 'GESTOR', 'MAESTRA'), becasController.listarBecas);

// GET /api/v1/becas/solicitudes — ADMIN ve todas; GESTOR ve las suyas
router.get('/solicitudes', authorize('ADMIN', 'GESTOR'), becasController.listarSolicitudes);

// POST /api/v1/becas/solicitudes — GESTOR y ADMIN pueden solicitar (RF-21)
router.post('/solicitudes',
  crearSolicitudBecaValidators, validate,
  authorize('ADMIN', 'GESTOR'),
  becasController.solicitarBeca
);

// PATCH /api/v1/becas/solicitudes/:id/resolver — solo ADMIN puede aprobar/rechazar
router.patch('/solicitudes/:id/resolver',
  resolverSolicitudValidators, validate,
  authorize('ADMIN'),
  becasController.resolverSolicitud
);

// DELETE /api/v1/becas/:id — solo ADMIN puede desactivar beca
router.delete('/:id', authorize('ADMIN'), becasController.desactivarBeca);

module.exports = router;
