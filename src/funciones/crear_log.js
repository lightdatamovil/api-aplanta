import { executeQueryFromPool, getHeaders, logGreen } from "lightdata-tools";
import { poolLocal } from "../../db.js";

export async function crearLog(req, tiempo, resultado, metodo, exito) {
    const headers = getHeaders(req);

    const empresa = headers["X-Company-Id"];
    const usuario = headers["X-User-Id"];
    const perfil = headers["X-Profile"];

    const sqlLog = `INSERT INTO logs_v2 (empresa, usuario, perfil, body, tiempo, resultado, metodo, exito) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [empresa, usuario, perfil, JSON.stringify(req.body), tiempo, JSON.stringify(resultado), metodo, exito];

    await executeQueryFromPool(poolLocal, sqlLog, values, true);
    logGreen(`Log creado: ${JSON.stringify(values)}`);
}
