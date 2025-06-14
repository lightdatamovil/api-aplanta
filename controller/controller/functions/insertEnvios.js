import { executeQuery } from '../../../db.js';
import axios from "axios";
import { logRed } from '../../../src/funciones/logsCustom.js';

export async function insertEnvios(dbConnection, companyId, clientId, accountId, dataQr, flex, externo, driverId) {
    const lote = Math.random().toString(36).substring(2, 15);
    const fecha_actual = new Date();
    fecha_actual.setHours(fecha_actual.getHours() - 3);
    const fecha_inicio = fecha_actual.toISOString().slice(0, 19).replace('T', ' ');
    const idshipment = dataQr.id;
    const senderid = dataQr.sender_id;
    const fechaunix = Math.floor(Date.now() / 1000);

    try {
        const queryInsertEnvios = `
            INSERT INTO envios (did, ml_shipment_id, ml_vendedor_id, didCliente, quien, lote, didCuenta, ml_qr_seguridad, fecha_inicio, flex, exterior, fechaunix, choferAsignado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await executeQuery(
            dbConnection,
            queryInsertEnvios,
            [0, idshipment, senderid, clientId, 1, lote, accountId, JSON.stringify(dataQr), fecha_inicio, flex, externo, fechaunix, driverId],
        );

        const sqlInsertHistorial = `
            INSERT INTO envios_historial (didEnvio, estado, quien, fecha, didCadete) 
            VALUES (?, ?, ?, ?, ?)
        `;

        const ver = await executeQuery(dbConnection, sqlInsertHistorial, [result.insertId, 1, 1, fecha_inicio, driverId]);

        if (result.insertId) {
            await axios.post(
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

            const updateSql = `
                UPDATE envios 
                SET did = ? 
                WHERE superado = 0 AND elim = 0 AND id = ? 
                LIMIT 1
            `;


            await executeQuery(dbConnection, updateSql, [result.insertId, result.insertId]);
        }

        return result.insertId;
    } catch (error) {
        logRed('Error en insertarPaquete:', error.stack);
        throw error;
    }
}

