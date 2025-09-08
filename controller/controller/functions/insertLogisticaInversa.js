import { executeQuery } from "lightdata-tools";

export async function insertEnviosLogisticaInversa(dbConnection, shipmentId, valor, userId) {
    const sqlInsertEnviosLogisticaInversa = `
        INSERT INTO envios_logisticainversa (didEnvio,didCampoLogistica,valor,quien) VALUES (?,?,?,?)
    `
    await executeQuery(dbConnection, sqlInsertEnviosLogisticaInversa, [shipmentId, 1, valor, userId]);

}