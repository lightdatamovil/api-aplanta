import { getFechaConHoraLocalDePais } from "lightdata-tools";
import { executeQueryFromPool } from "../../db.js";
import { logGreen } from "./logsCustom.js";

export async function crearLog(company, usuario, perfil, body, tiempo, resultado, metodo, exito) {
    const sqlLog = `INSERT INTO logs_v2 (empresa, usuario, perfil, body, tiempo, resultado, metodo, exito) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [company.did, usuario, perfil, JSON.stringify(body), tiempo, JSON.stringify(resultado), metodo, exito];

    await executeQueryFromPool(sqlLog, values);
    logGreen(`Log creado ${getFechaConHoraLocalDePais(company.pais)}`);
}
