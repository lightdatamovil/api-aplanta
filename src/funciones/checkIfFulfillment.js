import CustomException from "../../classes/custom_exception.js";
import { executeQuery } from "../../db.js";

export async function checkIfFulfillment(dbConnection, mlShipmentId, esFlex = true) {
    const checkIfFFA = `SELECT elim FROM envios WHERE superado=0 AND elim=52 AND ${esFlex ? 'ml_shipment_id' : 'did'} = ?`;
    const ffaRows = await executeQuery(dbConnection, checkIfFFA, [mlShipmentId]);
    if (ffaRows.length > 0) {
        throw new CustomException({
            title: "Orden pendiente de armado - Fulfillment",
            message: "Orden pendiente de armado, espera a terminar el proceso y vuelva a intentarlo.",
        });
    }
}