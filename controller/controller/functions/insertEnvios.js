import { axiosInstance, executeQuery } from '../../../db.js';
import { senToDataML } from './sendToDataML.js';

export async function insertEnvios(dbConnection, companyId, clientId, accountId, dataQr, flex, externo, driverId, userId) {
    const lote = "aplanta";
    const fecha_actual = new Date();
    fecha_actual.setHours(fecha_actual.getHours() - 3);
    const fecha_inicio = fecha_actual.toISOString().slice(0, 19).replace('T', ' ');
    const idshipment = dataQr.id || dataQr.id_orden;
    const senderid = dataQr.sender_id || dataQr.id_seller;
    const fechaunix = Math.floor(Date.now() / 1000);

    const queryInsertEnvios = `
            INSERT INTO envios (did, ml_shipment_id, ml_vendedor_id, didCliente, quien, lote, didCuenta, ml_qr_seguridad, fecha_inicio, flex, exterior, fechaunix, choferAsignado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    // !modificacion harcodeo chofer asignado en a planta
    const result = await executeQuery(
        dbConnection,
        queryInsertEnvios,
        [0, idshipment, senderid, clientId, userId, lote, accountId, JSON.stringify(dataQr), fecha_inicio, flex, externo, fechaunix, driverId],
    );

    if (result.insertId) {
        const updateSql = `
                UPDATE envios 
                SET did = ? 
                WHERE superado = 0 AND elim = 0 AND id = ? 
                LIMIT 1
            `;

        await executeQuery(dbConnection, updateSql, [result.insertId, result.insertId]);

        // Array de companyIds que deben enviar el mensaje
        const companiesToSend = [12, 79, 167, 365, 364, 363, 362, 361, 360, 359, 358, 357, 356, 355, 354, 353, 352, 351, 350, 204, 334, 211, 227];


        // Verificamos si el companyId actual está en la lista
        if (companiesToSend.includes(companyId)) {
            await senToDataML(companyId, result.insertId, senderid, idshipment);
        }
        await axiosInstance.post(
            'https://altaenvios.lightdata.com.ar/api/enviosMLredis',
            {
                idEmpresa: companyId,
                estado: 1,
                did: result.insertId,
                ml_shipment_id: idshipment,
                ml_vendedor_id: senderid
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            },
        );

    }

    return result.insertId;
}

