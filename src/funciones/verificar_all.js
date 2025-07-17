// src/funciones/verificarAll.js
import CustomException from "../../models/custom_exception.js";
import { Status } from "../../models/status.js";
import { logRed } from "./logsCustom.js";

export function verificarTodo(req, res, requiredParams = [], requiredBodyFields = []) {
    const faltantes = [];

    // 1) Validar siempre los params de ruta
    for (const p of requiredParams) {
        if (!req.params || req.params[p] === undefined) {
            faltantes.push(`Parámetro de ruta "${p}" es obligatorio`);
        }
    }

    // 2) Si es GET, sólo comparamos params y ya devolvemos
    if (req.method === 'GET' || req.method === 'DELETE') {
        if (faltantes.length) {
            const ex = new CustomException({
                title: 'Faltan parámetros',
                message: `Faltan parámetros: ${faltantes.join(', ')}`,
                status: Status.badRequest
            });
            logRed(`Error Status.badRequest ${req.method} ${req.originalUrl}: ${ex.toJsonString()}`);
            res.status(Status.badRequest).json(ex.toJSON());
            return false;
        }
        return true;
    }

    // 3) Para POST/PUT/PATCH/etc., validar campos obligatorios de body
    const body = req.body || {};
    if (req.method === 'POST') {
        for (const f of requiredBodyFields) {
            if (body[f] === undefined) {
                faltantes.push(`Campo de body "${f}" es obligatorio`);
            }
        }
        if (faltantes.length) {
            const ex = new CustomException({
                title: 'Faltan campos',
                message: `Faltan campos: ${faltantes.join(', ')}`,
                status: Status.badRequest
            });
            logRed(`Error Status.badRequest ${req.method} ${req.originalUrl}: ${ex.toJsonString()}`);
            res.status(Status.badRequest).json(ex.toJSON());
            return false;
        }
    }

    // 4) Validar que no lleguen campos extra (sólo en métodos con body)
    const desconocidos = Object.keys(body).filter(k => !requiredBodyFields.includes(k));
    if (desconocidos.length) {
        const ex = new CustomException({
            title: 'Campos inválidos',
            message: `No se permiten estos campos: ${desconocidos.join(', ')}`,
            status: Status.badRequest
        });
        logRed(`Error Status.badRequest ${req.method} ${req.originalUrl}: ${ex.toJsonString()}`);
        res.status(Status.badRequest).json(ex.toJSON());
        return false;
    }

    return true;
}
