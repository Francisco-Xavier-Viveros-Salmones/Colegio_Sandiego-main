const calificacionesTallerService = require('../../services/calificaciones/calificaciones-taller.service');

const registrarCalificacion = async (req, res, next) => {
  try {
    const { alumnoId, numeroTrimestre, cicloId, valorCualitativo } = req.body;
    const usuarioId = req.usuario?.id;

    const nuevaCalif = await calificacionesTallerService.registrarCalificacion({
      alumnoId,
      numeroTrimestre,
      cicloId,
      valorCualitativo,
      usuarioId
    });

    res.status(201).json({
      success: true,
      data: nuevaCalif,
      message: 'Calificación de Taller registrada correctamente.'
    });
  } catch (error) {
    next(error);
  }
};

const obtenerPorAlumno = async (req, res, next) => {
  try {
    const { alumnoId } = req.params;
    const calificaciones = await calificacionesTallerService.obtenerPorAlumno(parseInt(alumnoId, 10));

    res.status(200).json({
      success: true,
      data: calificaciones
    });
  } catch (error) {
    next(error);
  }
};

const modificarCalificacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { valorCualitativo, motivo } = req.body;
    const usuarioId = req.usuario?.id;

    const califModificada = await calificacionesTallerService.modificarCalificacion(parseInt(id, 10), {
      valorCualitativo,
      motivo,
      usuarioId
    });

    res.status(200).json({
      success: true,
      data: califModificada,
      message: 'Calificación de Taller modificada.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registrarCalificacion,
  obtenerPorAlumno,
  modificarCalificacion
};
