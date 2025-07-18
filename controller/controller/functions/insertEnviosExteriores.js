import { executeQuery } from "../../../db.js";

export async function insertEnviosExteriores(dbConnection, internoShipmentId, externalShipmentId, flex, externalName, externalCompanyId) {
    const q = `UPDATE envios_exteriores SET superado = 1 WHERE didExterno = ?`;
    await executeQuery(dbConnection, q, [externalShipmentId]);

    const queryInsertEnviosExteriores = `
            INSERT INTO envios_exteriores (didLocal, didExterno, flex, cliente, didEmpresa)
            VALUES (?, ?, ?, ?, ?)
        `;

    const result = await executeQuery(
        dbConnection,
        queryInsertEnviosExteriores,
        [
            internoShipmentId,
            externalShipmentId,
            flex,
            externalName,
            externalCompanyId,
        ],
    );

    return result.insertId;
}