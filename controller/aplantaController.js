import { getAccountBySenderId, getProdDbConfig } from "../db.js";
import { handleInternalFlex } from "./controller/handlers/flex/handleInternalFlex.js";
import { handleExternalFlex } from "./controller/handlers/flex/handleExternalFlex.js";
import { handleExternalNoFlex } from "./controller/handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./controller/handlers/noflex/handleInternalNoFlex.js";
import mysql from "mysql";
import { logCyan, logRed } from "../src/funciones/logsCustom.js";

export async function aplanta(company, dataQr, userId) {
    const dbConfig = getProdDbConfig(company);
    const dbConnection = mysql.createConnection(dbConfig);
    dbConnection.connect();

    try {
        let response;

        const isFlex = dataQr.hasOwnProperty("sender_id");

        if (isFlex) {
            logCyan("Es flex");
            const account = await getAccountBySenderId(dbConnection, company.did, dataQr.sender_id);

            if (account) {
                logCyan("Es interno");
                response = await handleInternalFlex(dbConnection, company.did, userId, dataQr, account);
            } else {
                logCyan("Es externo");
                response = await handleExternalFlex(dbConnection, company.did, dataQr, userId);
            }
        } else {
            logCyan("No es flex");
            if (company.did == dataQr.empresa) {
                logCyan("Es externo");
                response = await handleInternalNoFlex(dbConnection, dataQr, company.did, userId);
            } else {
                logCyan("Es interno");
                response = await handleExternalNoFlex(dbConnection, dataQr, company.did, userId);
            }
        }

        return response;
    } catch (error) {
        logRed(`Error en poner a planta: ${error.message}`)
        throw error;
    }
}
