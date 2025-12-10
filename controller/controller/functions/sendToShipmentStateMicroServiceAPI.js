import dotenv from 'dotenv';
import { logGreen } from '../../../src/funciones/logsCustom.js';
import { formatFechaUTC3 } from '../../../src/funciones/formatFechaUTC3.js';
import { generarTokenFechaHoy } from '../../../src/funciones/generarTokenFechaHoy.js';
import { axiosInstance, urlMicroserviciosEstado } from '../../../db.js';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

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
        const response = await axiosInstance.post(urlMicroserviciosEstado, message);
        logGreen(`✅ Enviado por HTTP con status ${response.status}`);
    } catch (httpError) {
        console.error('Error enviando a Shipment State MicroService API:', httpError.message);
    }
}
