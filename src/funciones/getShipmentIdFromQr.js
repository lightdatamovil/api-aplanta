import axios from "axios";
import { logRed } from "./logsCustom.js";
import CustomException from "../../classes/custom_exception.js";

export async function getShipmentIdFromQr(companyId, dataQr) {
    try {
        const payload = {
            companyId: Number(companyId),
            userId: 0,
            profile: 0,
            deviceId: "null",
            brand: "null",
            model: "null",
            androidVersion: "null",
            deviceFrom: "Autoasignado de colecta",
            appVersion: "null",
            dataQr: dataQr
        };

        const result = await axios.post('https://apimovil2.lightdata.app/api/qr/get-shipment-id', payload);
        if (result.status == 200) {
            return result.data.body;
        } else {
            logRed("Error al obtener el shipmentId");
            throw new CustomException({
                title: "Error al obtener el shipmentId",
                message: `Código de estado: ${result.status}`,
                stack: result.data.stack || ''
            });
        }
    } catch (error) {
        throw new CustomException({
            title: "Error al obtener el shipmentId",
            message: `Código de estado: ${error.status}`,
            stack: error.stack || ''
        });
    }
}