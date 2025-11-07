import { LightdataORM } from "lightdata-tools";

/// Checkea si el envio ya fue colectado, entregado o cancelado
export async function checkearEstadoEnvio({ db, shipmentId }) {
    const [row] = await LightdataORM.select({
        db,
        table: 'envios',
        where: { did: shipmentId },
        select: ['estado_envio'],
        throwIfNotExists: true
    });

    if (row.estado_envio == 5 || row.estado_envio == 9 || row.estado_envio == 8) {
        return { success: false, message: "El paquete ya fue entregado o cancelado" };
    }

    if (row.estado_envio == 1) {
        return { success: false, message: "El paquete ya se encuentra en a planta" };
    }
}