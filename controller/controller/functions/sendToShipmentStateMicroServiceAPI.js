import dotenv from 'dotenv';
import { logRed } from '../../../src/funciones/logsCustom.js';
import { formatFechaUTC3 } from '../../../src/funciones/formatFechaUTC3.js';
import { generarTokenFechaHoy } from '../../../src/funciones/generarTokenFechaHoy.js';
import { axiosInstance, executeQuery, queueEstados, rabbitService, urlMicroserviciosEstado } from '../../../db.js';
import { microservicioEstados } from '../../../classes/microservicio_estados.js';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

export async function sendToShipmentStateMicroServiceAPI(
    companyId,
    userId,
    shipmentId,
    latitud = null,
    longitud = null,
    db
) {
    if (microservicioEstados.estaCaido()) {
        await actualizarEstadoLocal(db, [shipmentId], "aplanta", formatFechaUTC3(), userId, 1);
    } else {
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
            await axiosInstance.post(urlMicroserviciosEstado, message);
        } catch (httpError) {
            logRed(`Error enviando a Shipment State MicroService API: ${httpError.message}`);
            microservicioEstados.setEstadoCaido();
            await rabbitService.send(queueEstados, message)
            await actualizarEstadoLocal(db, [shipmentId], "aplanta", formatFechaUTC3(), userId, 1);
        }
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