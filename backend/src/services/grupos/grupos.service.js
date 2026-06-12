/**
 * SAE — Grupos Service
 */

'use strict';

const gruposRepository = require('../../repositories/grupos/grupos.repository');

async function listar(filtros) {
  return gruposRepository.findAll(filtros);
}

async function obtenerPorId(id) {
  const grupo = await gruposRepository.findById(id);
  if (!grupo) {
    throw Object.assign(new Error('Grupo no encontrado.'), { statusCode: 404 });
  }
  return grupo;
}

async function crear(datos) {
  return gruposRepository.create(datos);
}

async function actualizar(id, datos) {
  await obtenerPorId(id);
  return gruposRepository.update(id, datos);
}

module.exports = { listar, obtenerPorId, crear, actualizar };
