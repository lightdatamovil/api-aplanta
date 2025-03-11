import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { informe } from "../../functions/informe.js";
import { sendToShipmentStateMicroService } from "../../functions/sendToShipmentStateMicroService.js";
import { updateLastShipmentState } from "../../functions/updateLastShipmentState.js";

/// Esta funcion checkea si el envio ya fue colectado, entregado o cancelado
/// Busca el chofer asignado al envio
/// Si el envio no esta asignado y se quiere autoasignar, lo asigna
/// Actualiza el estado del envio en el micro servicio
/// Actualiza el estado del envio en la base de datos
export async function handleInternalNoFlex(dbConnection, dataQr, companyId, userId) {
    try {
        const shipmentId = dataQr.did;

        /// Chequeo si el envio ya fue colectado, entregado o cancelado
        await checkearEstadoEnvio(dbConnection, shipmentId);


       

      
        /// Actualizamos el estado del envio en el micro servicio
        await sendToShipmentStateMicroService(companyId, userId, shipmentId, 0, null, null);

        /// Actualizamos el estado del envio en la base de datos
        await updateLastShipmentState(dbConnection, shipmentId);

        const body = await informe(dbConnection, userId);
        return { estadoRespuesta: true, mensaje: "Paquete puesto a planta  correctamente", body: body };
    } catch (error) {
        console.error("Error en handleInternoNoFlex:", error);
        throw error;
    }
}