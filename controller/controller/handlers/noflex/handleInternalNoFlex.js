import { EstadosEnvio, sendShipmentStateToStateMicroserviceAPI } from "lightdata-tools";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { informe } from "../../functions/informe.js";
import { urlEstadosMicroservice, axiosInstance } from "../../../../db.js";
/// Esta funcion checkea si el envio ya fue colectado, entregado o cancelado
/// Si el envio no esta asignado y se quiere autoasignar, lo asigna
/// Actualiza el estado del envio en el micro servicio
/// Actualiza el estado del envio en la base de datos
export async function handleInternalNoFlex({ db, req, company }) {
    const { dataQr, latitude, longitude } = req.body;
    const { userId } = req.user;

    const shipmentId = dataQr.did;
    const clientId = dataQr.cliente;

    const check = await checkearEstadoEnvio({ db, shipmentId });
    if (check) return check;

    await sendShipmentStateToStateMicroserviceAPI({
        urlEstadosMicroservice,
        axiosInstance,
        company,
        userId,
        shipmentId,
        estado: EstadosEnvio.value(EstadosEnvio.atProcessingPlant, company.did),
        latitude,
        longitude,
        desde: "A planta API",
    });

    const body = await informe({
        db,
        company,
        clientId,
        userId,
        shipmentId
    });

    return {
        success: true,
        message: "Paquete puesto a planta  correctamente",
        body
    };
}