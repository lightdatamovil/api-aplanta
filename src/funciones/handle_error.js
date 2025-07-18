import CustomException from '../../models/custom_exception.js';
import { Status } from '../../models/status.js';
import { logRed } from './logsCustom.js';
import { crearLog } from './crear_log.js';

/**
 * Envía la respuesta de error apropiada y loguea, según el tipo de excepción.
 * @param {Request}  req  – para saber método y URL
 * @param {Response} res  – para enviar la respuesta
 * @param {Error}    err  – la excepción capturada
 */
export function handleError(req, res, err, startTime) {
    const { companyId, userId, profile } = req.body;
    let ex;

    if (err instanceof CustomException) {
        ex = err;
    } else {
        ex = new CustomException({
            title: 'Internal Server Error',
            message: err.message,
            stack: err.stack,
            status: Status.internalServerError
        });
    }

    crearLog(companyId, userId, profile, req.body, performance.now() - startTime, JSON.stringify(err.message), "api", false);
    logRed(`Error ${ex.status} ${req.method} ${req.originalUrl}: ${ex.toJsonString()}`);
    return res.status(ex.status).json(ex.toJSON());
}