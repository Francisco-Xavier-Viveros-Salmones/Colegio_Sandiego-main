'use strict';

const { Router }        = require('express');
const usuariosController= require('../controllers/usuarios/usuarios.controller');
const { authenticate }  = require('../middleware/auth.middleware');
const { authorize }     = require('../middleware/rbac.middleware');

const router = Router();

router.use(authenticate);

// Todos los endpoints de usuarios son solo para ADMIN
router.get('/',         authorize('ADMIN'), usuariosController.listar);
router.get('/:id',      authorize('ADMIN'), usuariosController.obtener);
router.post('/',        authorize('ADMIN'), usuariosController.crear);
router.put('/:id',      authorize('ADMIN'), usuariosController.actualizar);
router.put('/:id/reactivar', authorize('ADMIN'), usuariosController.reactivar);
router.delete('/:id',   authorize('ADMIN'), usuariosController.eliminar);

module.exports = router;
