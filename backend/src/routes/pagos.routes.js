'use strict';

const { Router }            = require('express');
const pagosController       = require('../controllers/pagos/pagos.controller');
const { authenticate }      = require('../middleware/auth.middleware');
const { authorize }         = require('../middleware/rbac.middleware');
const { validate }          = require('../middleware/validate.middleware');
const { crearPagoValidators } = require('../utils/validators/pagos.validator');

const router = Router();

router.use(authenticate);

// GET /api/v1/pagos
router.get('/', authorize('ADMIN', 'GESTOR'), pagosController.listar);

// GET /api/v1/pagos/calendario — calendar entries (must come BEFORE /:id)
router.get('/calendario', authorize('ADMIN', 'GESTOR'), pagosController.calendario);

// GET /api/v1/pagos/total/:alumnoId — suma total de pagos de un alumno
router.get('/total/:alumnoId', authorize('ADMIN', 'GESTOR'), pagosController.totalPorAlumno);

// GET /api/v1/pagos/:id
router.get('/:id', authorize('ADMIN', 'GESTOR'), pagosController.obtener);

// POST /api/v1/pagos — ADMIN y GESTOR pueden registrar pagos
router.post('/', crearPagoValidators, validate,
  authorize('ADMIN', 'GESTOR'),
  pagosController.registrar
);

module.exports = router;
