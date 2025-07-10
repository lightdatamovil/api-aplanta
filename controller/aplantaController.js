import { executeQuery, getAccountBySenderId, getProdDbConfig } from "../db.js";
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
        const isCollectShipmentML = Object.prototype.hasOwnProperty.call(dataQr, "t");
        /// Me fijo si es flex o no
        const isFlex = Object.prototype.hasOwnProperty.call(dataQr, "sender_id") || isCollectShipmentML;

        if (isFlex) {
            logCyan("Es flex");
            /// Busco la cuenta del cliente
            let account = null;
            let senderId = null;
            if (isCollectShipmentML) {
                //! Esto quiere decir que es un envio de colecta de ML
                const querySeller = `SELECT ml_vendedor_id FROM envios WHERE ml_shipment_id = ? AND flex = 1 AND superado=0 AND elim=0`;
                const result = await executeQuery(dbConnection, querySeller, [dataQr.id]);

                senderId = result[0].ml_vendedor_id;
                account = await getAccountBySenderId(dbConnection, company.did, senderId);
                logCyan(JSON.stringify(account));
            } else {
                account = await getAccountBySenderId(dbConnection, company.did, dataQr.sender_id);
                senderId = dataQr.sender_id;
            }

            if (account) {
                logCyan("Es interno");
                response = await handleInternalFlex(dbConnection, company.did, userId, dataQr, account, senderId);
            }



            else {
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
        logRed(`Error en aplanta: ${error.message}`);
        throw error;


    } finally {
        dbConnection.end();
    };
}