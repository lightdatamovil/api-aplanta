

import { executeQuery } from "../../../db.js";


export async function checkIfExistLogisticAsDriverInExternalCompany(dbConnection, syncCode) {
    const querySelectSistemUsuariosAccesos = 'SELECT usuario FROM sistema_usuarios_accesos WHERE codvinculacion = ? AND superado = 0 AND elim = 0';
    const chofer = await executeQuery(dbConnection, querySelectSistemUsuariosAccesos, [syncCode]);

    if (chofer.length == 0) {
        return;
    }

    return chofer[0].usuario;
}