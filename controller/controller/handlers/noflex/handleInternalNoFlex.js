import { executeQuery, logCyan, sendShipmentStateToStateMicroservice } from "lightdata-tools";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { informe } from "../../functions/informe.js";
import { qeueEstados, rabbitUrl } from "../../../../db.js";
/// Esta funcion checkea si el envio ya fue colectado, entregado o cancelado
/// Si el envio no esta asignado y se quiere autoasignar, lo asigna
/// Actualiza el estado del envio en el micro servicio
/// Actualiza el estado del envio en la base de datos
export async function handleInternalNoFlex(dbConnection, dataQr, company, userId, latitude, longitude) {
    const shipmentId = dataQr.did;

    const clientId = dataQr.cliente;

    /// Chequeo si el envio ya fue colectado, entregado o cancelado
    const check = await checkearEstadoEnvio(dbConnection, shipmentId);
    if (check) return check;


    const q = `SELECT estado_envio FROM envios WHERE did = ? LIMIT 1`;
    const estadoEnvio = await executeQuery(dbConnection, q, [shipmentId]);
    if (estadoEnvio.length === 0) {
        return { success: false, message: "El paquete no esta cargado" };
    }

    logCyan("El envio no fue colectado, entregado o cancelado");

    logCyan(`${latitude}, ${longitude}`);
    logCyan(`${userId}, ${longitude}`);
    /// Actualizamos el estado del envio en el micro servicio
    await sendShipmentStateToStateMicroservice(
        qeueEstados,
        rabbitUrl,
        'aplanta',
        company,
        userId,
        0,
        shipmentId,
        latitude,
        longitude
    );
    logCyan("Se actualizo el estado del envio en el micro servicio");

    const body = await informe(dbConnection, company, clientId, userId, shipmentId);

    return { success: true, message: "Paquete puesto a planta  correctamente", body: body };
}