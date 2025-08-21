import dotenv from 'dotenv';
import { logCyan, logGreen, logRed } from '../../../src/funciones/logsCustom.js';
import { formatFechaUTC3 } from '../../../src/funciones/formatFechaUTC3.js';
import axios from 'axios';
import { generarTokenFechaHoy } from '../../../src/funciones/generarTokenFechaHoy.js';
dotenv.config({ path: process.env.ENV_FILE || '.env' });

const BACKUP_ENDPOINT = "https://serverestado.lightdata.app/estados"

export async function sendToShipmentStateMicroServiceAPI(
    companyId,
    userId,
    shipmentId,
    latitud,
    longitud
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
        tkn: generarTokenFechaHoy(),
    };
    logCyan(`Enviando mensaje a RabbitMQ: ${JSON.stringify(message)}`);
    try {
        const response = await axios.post(BACKUP_ENDPOINT, message);
        logGreen(`✅ Enviado por HTTP con status ${response.status}`);
    } catch (httpError) {
        logRed(`❌ Falló el envío por HTTP también: ${httpError.message}`);
        throw httpError;
    }
}
