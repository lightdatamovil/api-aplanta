import dotenv from 'dotenv';
import { logGreen, logRed } from '../../../src/funciones/logsCustom.js';
import { formatFechaUTC3 } from '../../../src/funciones/formatFechaUTC3.js';
import { generarTokenFechaHoy } from '../../../src/funciones/generarTokenFechaHoy.js';
import { sendToShipmentStateMicroService } from './sendToShipmentStateMicroService.js';
import { axiosInstance } from '../../../db.js';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

const BACKUP_ENDPOINT = "http://10.70.0.69:13000/estados";

export async function sendToShipmentStateMicroServiceAPI(
    companyId,
    userId,
    shipmentId,
    latitud = null,
    longitud = null
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
        const response = await axiosInstance.post(BACKUP_ENDPOINT, message);
        logGreen(`✅ Enviado por HTTP con status ${response.status}`);
    } catch (httpError) {
        try {
            await sendToShipmentStateMicroService(
                companyId, userId, shipmentId, latitud, longitud
            );
            logGreen("↩️ Enviado por RabbitMQ (fallback)");
        } catch (mqError) {
            logRed(`❌ Falló HTTP y también MQ: ${httpError.message} | ${mqError.message}`);
            throw mqError;
        }
    }
}
