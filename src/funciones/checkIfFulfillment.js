import CustomException from "../../classes/custom_exception.js";
import { executeQuery } from "../../db.js";

export async function checkIfFulfillment(dbConnection, mlShipmentId) {
    const checkIfFFA = `SELECT elim FROM envios WHERE superado=0 AND elim=52 AND ml_shipment_id = ?`;
    const ffaRows = await executeQuery(dbConnection, checkIfFFA, [mlShipmentId]);
    if (ffaRows.length > 0) {
        throw new CustomException({
            title: "Fulfillment Error",
            message: "El paquete todavia no esta armado, espera a terminar el proceso y vuelva a intentarlo.",
        });
    }
}