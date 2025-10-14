import { logRed } from "./logsCustom.js";
import CustomException from "../../classes/custom_exception.js";
import { axiosInstance } from "../../db.js";

export async function getShipmentIdFromQr(companyId, dataQr) {
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
    try {
        const result = await axiosInstance.post('https://apimovil2.lightdata.app/api/qr/get-shipment-id', payload);
        if (result.status == 200) {
            return result.data.body;
        } else {
            logRed("Error al obtener el shipmentId");
            throw new CustomException({
                title: "No se pudo obtener el envio",
                message: `Error al obtener el envio: ${result.data.message}`,
                stack: result.data.stack || ''
            });
        }
    } catch (error) {
        logRed(`Error al obtener el shipmentId: ${error.message}`);
        throw new CustomException({
            title: "No se pudo obtener el envio",
            message: `Error al obtener el envio: ${error.message}`,
            stack: error.stack || ''
        });
    }

}