import { executeQuery } from "lightdata-tools";

/// Checkea si el envio ya fue puesto a planta, entregado, entregado 2da o cancelado
export async function checkearEstadoEnvio(dbConnection, shipmentId) {
    const querySelectEstadoEnvio = 'SELECT estado_envio FROM envios WHERE did = ? and superado = 0 and elim = 0 LIMIT 1 ';
    const estado = await executeQuery(dbConnection, querySelectEstadoEnvio, [shipmentId]);


    if (estado.length > 0) {
        if (estado[0].estado_envio == 5 || estado[0].estado_envio == 9 || estado[0].estado_envio == 8) {
            return { success: false, message: "El paquete ya fue entregado o cancelado" };
        }
        if (estado[0].estado_envio == 1) {
            return { success: false, message: "El paquete ya se encuentra puesto a planta" };
        }
    }
}