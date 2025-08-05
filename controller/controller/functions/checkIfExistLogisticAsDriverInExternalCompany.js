

import { executeQuery } from "../../../db.js";


export async function checkIfExistLogisticAsDriverInExternalCompany(dbConnection, syncCode) {
    const querySelectSistemUsuariosAccesos = 'SELECT usuario FROM sistema_usuarios_accesos WHERE codvinculacion = ?';
    const chofer = await executeQuery(dbConnection, querySelectSistemUsuariosAccesos, [syncCode], true);

    if (chofer.length == 0) {
        return;
    }

    return chofer[0].usuario;
}