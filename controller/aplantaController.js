import { getAccountBySenderId, getProdDbConfig } from "../db.js";
import { handleInternalFlex } from "./controller/handlers/flex/handleInternalFlex.js";
import { handleExternalFlex } from "./controller/handlers/flex/handleExternalFlex.js";
import { handleExternalNoFlex } from "./controller/handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./controller/handlers/noflex/handleInternalNoFlex.js";
import mysql from "mysql";
import { logCyan, logRed } from "../src/funciones/logsCustom.js";
import axios from "axios";
async function getShipmentIdFromQr(companyId, dataQr) {

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

        const result = await axios.post('https://apimovil2test.lightdata.app/api/qr/get-shipment-id', payload);
        if (result.status == 200) {
            return result.body;
        } else {
            logRed("Error al obtener el shipmentId");
            throw new Error("Error al obtener el shipmentId");
        }
    } catch (error) {
        logRed(`Error al obtener el shipmentId: ${error.stack}`);
        throw error;
    }
}

export async function aplanta(company, dataQr, userId) {
    const dbConfig = getProdDbConfig(company);
    const dbConnection = mysql.createConnection(dbConfig);
    dbConnection.connect();

    try {
        let response;

        if (company.did == 211 && !dataQr.hasOwnProperty("local") && !dataQr.hasOwnProperty("sender_id")) {
            const shipmentId = await getShipmentIdFromQr(company.did, dataQr);
            dataQr = {
                local: "1",
                empresa: company.did,
                did: shipmentId,
                cliente: 301
            }
        }
        const isFlex = dataQr.hasOwnProperty("sender_id");

        if (isFlex) {
            logCyan("Es flex");
            const account = await getAccountBySenderId(dbConnection, company.did, dataQr.sender_id);

            if (account) {
                logCyan("Es interno");
                response = await handleInternalFlex(dbConnection, company.did, userId, dataQr, account);
            } else {
                logCyan("Es externo");
                response = await handleExternalFlex(dbConnection, company, dataQr, userId);
            }
        } else {
            logCyan("No es flex");
            if (company.did == dataQr.empresa) {
                logCyan("Es interno");
                response = await handleInternalNoFlex(dbConnection, dataQr, company.did, userId);
            } else {
                logCyan("Es externo");
                response = await handleExternalNoFlex(dbConnection, dataQr, company.did, userId);
            }
        }

        return response;
    } catch (error) {
        logRed(`Error en poner a planta: ${error.stack}`)
        throw error;
    }
    finally {
        dbConnection.end();
    }
}
