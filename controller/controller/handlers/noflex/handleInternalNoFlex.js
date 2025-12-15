import { executeQuery, getClientsByCompany } from "../../../../db.js";
import { checkIfFulfillment } from "../../../../src/funciones/checkIfFulfillment.js";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { informe } from "../../functions/informe.js";
import { sendToShipmentStateMicroServiceAPI } from "../../functions/sendToShipmentStateMicroServiceAPI.js";
/// Esta funcion checkea si el envio ya fue colectado, entregado o cancelado
/// Si el envio no esta asignado y se quiere autoasignar, lo asigna
/// Actualiza el estado del envio en el micro servicio
/// Actualiza el estado del envio en la base de datos
export async function handleInternalNoFlex(dbConnection, dataQr, company, userId) {
    const companyId = company.did;
    const shipmentId = dataQr.did;

    const clientId = dataQr.cliente;
    await checkIfFulfillment(dbConnection, dataQr.did, false);
    /// Chequeo si el envio ya fue colectado, entregado o cancelado
    const check = await checkearEstadoEnvio(dbConnection, shipmentId, companyId);
    if (check) return check;


    const q = `SELECT estado_envio FROM envios WHERE did = ? LIMIT 1`;
    const estadoEnvio = await executeQuery(dbConnection, q, [shipmentId]);
    if (estadoEnvio.length === 0) {
        return { success: false, message: "El paquete no esta cargado" };
    }

    /// Actualizamos el estado del envio en el micro servicio
    await sendToShipmentStateMicroServiceAPI(companyId, userId, shipmentId,
        null,
        null, dbConnection);

    const clients = await getClientsByCompany(dbConnection, companyId);
    const cliente = clients[clientId];

    const body = await informe(dbConnection, company, clientId, userId, shipmentId, cliente?.nombre ?? "Sin información");

    return { success: true, message: "Paquete puesto a planta  correctamente", body: body };
}