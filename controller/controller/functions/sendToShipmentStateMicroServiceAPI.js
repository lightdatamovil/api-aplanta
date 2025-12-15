import dotenv from 'dotenv';
import { logGreen, logRed } from '../../../src/funciones/logsCustom.js';
import { formatFechaUTC3 } from '../../../src/funciones/formatFechaUTC3.js';
import { generarTokenFechaHoy } from '../../../src/funciones/generarTokenFechaHoy.js';
import { axiosInstance, executeQuery, urlMicroserviciosEstado, urlMicroserviciosEstadoCaido } from '../../../db.js';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

export async function sendToShipmentStateMicroServiceAPI(
    companyId,
    userId,
    shipmentId,
    latitud = null,
    longitud = null,
    db
) {
    const message = {
        didempresa: companyId,
        didenvio: shipmentId,
        estado: 1,
        subestado: null,
        estadoML: null,
        fecha: formatFechaUTC3(),
        quien: userId,
        operacion: 'aplanta',
        latitud,
        longitud,
        desde: "aplanta",
        tkn: generarTokenFechaHoy(),
    };

    try {
        if (urlMicroserviciosEstadoCaido) {
            await actualizarEstadoLocal(db, [shipmentId], "aplanta", message.fecha, userId, message.estado);
            return;
        }
        const response = await axiosInstance.post(urlMicroserviciosEstado, message);
        logGreen(`✅ Enviado por HTTP con status ${response.status}`);
    } catch (httpError) {
        logRed(`Error enviando a Shipment State MicroService API: ${httpError.message}`);
    }
}

async function actualizarEstadoLocal(db, shipmentIds, deviceFrom, dateConHora, userId, state) {
    const query1 = `
            UPDATE envios_historial
            SET superado = 1
            WHERE superado = 0 AND didEnvio IN(${shipmentIds.join(',')})
        `;
    await executeQuery(db, query1);

    const query2 = `
            UPDATE envios
            SET estado_envio = ?
            WHERE superado = 0 AND did IN(${shipmentIds.join(',')})
        `;
    await executeQuery(db, query2, [state]);

    const query3 = `
            INSERT INTO envios_historial (didEnvio, estado, quien, fecha, didCadete, desde)
            SELECT did, ?, ?, ?, choferAsignado, ?
            FROM envios WHERE did IN(${shipmentIds.join(',')})
        `;
    await executeQuery(db, query3, [state, userId, dateConHora, deviceFrom]);
}