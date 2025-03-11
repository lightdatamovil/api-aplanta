import { getAccountBySenderId, getProdDbConfig } from "../db.js";
import { handleInternalFlex } from "./controller/handlers/flex/handleInternalFlex.js";
import { handleExternalFlex } from "./controller/handlers/flex/handleExternalFlex.js";
import { handleExternalNoFlex } from "./controller/handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./controller/handlers/noflex/handleInternalNoFlex.js";
import mysql from "mysql";

export async function aplanta(company, dataQr,userId) {
    const dbConfig = getProdDbConfig(company);
    const dbConnection = mysql.createConnection(dbConfig);
    dbConnection.connect();

    try {
        let response;

        const isFlex = dataQr.hasOwnProperty("sender_id");

        if (isFlex) {
            const account = await getAccountBySenderId(dbConnection, company.did, dataQr.sender_id);

            if (account) {
                response = await handleInternalFlex(dbConnection, company.did,userId,   dataQr, account);
            } else {

                response = await handleExternalFlex(dbConnection, company.did,  dataQr,userId);
            }
        } else {
            if (company.did == dataQr.empresa) {
                response = await handleInternalNoFlex(dbConnection, dataQr, company.did, userId);
            } else {
                response = await handleExternalNoFlex(dbConnection, dataQr, company.did, userId);
            }
        }

        return response;
    } catch (error) {
        console.error("Error en poner a planta :", error);
        throw error;
    }
}
