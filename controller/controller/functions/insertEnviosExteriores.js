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

// const { didLocal, didExterno, cliente, flex, didEmpresa } = data;
export async function insertEnviosExterioresMicroservicio(internoShipmentId, externalShipmentId, externalName, flex, externalCompanyId) {
    const data = {
        polaroid: {
            didLocal: internoShipmentId,
            didExterno: externalShipmentId,
            cliente: externalName,
            flex: flex,
            didEmpresa: externalCompanyId
        }
    }

    try {

        const res = await data.sendToQueue(
            "altaEnviosExteriores",
            Buffer.from(JSON.stringify(data)),
            { persistent: true }
        );

        return res.insertId;
    } catch (error) {
        console.error("Error inserting envios exteriores:", error);
        throw error; // re-throw the error to be handled by the caller
    }



}