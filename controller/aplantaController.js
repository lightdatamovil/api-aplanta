import { getAccountBySenderId, getProdDbConfig } from "../db.js";
import { handleInternalFlex } from "./controller/handlers/flex/handleInternalFlex.js";
import { handleExternalFlex } from "./controller/handlers/flex/handleExternalFlex.js";
import { handleExternalNoFlex } from "./controller/handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./controller/handlers/noflex/handleInternalNoFlex.js";
import mysql2 from "mysql2";
import { logCyan, logRed } from "../src/funciones/logsCustom.js";
import { getShipmentIdFromQr } from "../src/funciones/getShipmentIdFromQr.js";

export async function aplanta(company, dataQr, userId) {
    const dbConfig = getProdDbConfig(company);
    const dbConnection = mysql2.createConnection(dbConfig);
    dbConnection.connect();

    try {

        let response;

        if (company.did == 211 && !Object.prototype.hasOwnProperty.call(dataQr, "local") && !Object.prototype.hasOwnProperty.call(dataQr, "sender_id")) {
            const shipmentId = await getShipmentIdFromQr(company.did, dataQr);
            dataQr = {
                local: "1",
                empresa: company.did,
                did: shipmentId,
                cliente: 301
            }
        }
        const isFlex = Object.prototype.hasOwnProperty.call(dataQr, "sender_id");

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
    }
    catch (error) {
        logRed("Error en colectar: ", error.message);
        throw error;


    } finally {
        dbConnection.end();
    };
}