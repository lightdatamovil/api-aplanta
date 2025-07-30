import { executeQuery, getAccountBySenderId, getProdDbConfig } from "../db.js";
import { handleInternalFlex } from "./controller/handlers/flex/handleInternalFlex.js";
import { handleExternalFlex } from "./controller/handlers/flex/handleExternalFlex.js";
import { handleExternalNoFlex } from "./controller/handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./controller/handlers/noflex/handleInternalNoFlex.js";
import mysql2 from "mysql2";
import { logCyan, logPurple } from "../src/funciones/logsCustom.js";
import { getShipmentIdFromQr } from "../src/funciones/getShipmentIdFromQr.js";
import { parseIfJson } from "../src/funciones/isValidJson.js";
import LogisticaConf from "../classes/logistica_conf.js";


export async function aplanta(company, dataQr, userId) {
    const dbConfig = getProdDbConfig(company);
    const dbConnection = mysql2.createConnection(dbConfig);
    dbConnection.connect();

    try {
        let response;
        dataQr = parseIfJson(dataQr);

        if (
            LogisticaConf.hasBarcodeEnabled(company.did) &&
            // mejor usar Object.hasOwn para chequear sólo properties propias
            !Object.hasOwn(dataQr, 'local') &&
            !Object.hasOwn(dataQr, 'sender_id')
        ) {
            try {
                // obtenemos el envío
                const shipmentId = await getShipmentIdFromQr(company.did, dataQr);
                const cliente = LogisticaConf.getSenderId(company.did);

                dataQr = {
                    local: '1',
                    did: shipmentId,
                    cliente,
                    empresa: company.did
                };

            } catch (error) {

                const cliente = LogisticaConf.getSenderId(company.did);
                const empresaVinculada = LogisticaConf.getEmpresaVinculada(company.did);
                // que pasa si es 211 o  55 que no tienen empresa vinculada
                if (empresaVinculada === null) {
                    // preguntar a cris 
                    throw new Error("El envio no esta igresado en su sistema");
                };

                const shipmentIdExterno = await getShipmentIdFromQr(empresaVinculada, dataQr);

                //no encontre shipmentiD : cambiar en el qr la empresa x la externa --- si no esta lo inserta 
                dataQr = {
                    local: '1',
                    did: shipmentIdExterno,
                    cliente,
                    empresa: empresaVinculada
                };
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
            } else if (!account && company.did == 144) {
                logCyan("Es interno (por verificación extra de empresa 144)");
                const queryCheck = `
                  SELECT did
                  FROM envios
                  WHERE ml_vendedor_id = ?
                  AND superado = 0
                  AND elim = 0
                  LIMIT 1
                `;
                const resultCheck = await executeQuery(dbConnection, queryCheck, [dataQr.sender_id]);

                if (resultCheck.length > 0) {
                    senderId = dataQr.sender_id;
                    response = await handleInternalFlex(dbConnection, company.did, userId, dataQr, account, senderId);
                } else {
                    logCyan("Es externo (empresa 144 pero sin coincidencias)");
                    response = await handleExternalFlex(dbConnection, company, dataQr, userId);
                }
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
                logPurple(JSON.stringify(dataQr));
                response = await handleExternalNoFlex(dbConnection, dataQr, company.did, userId);
            }
        }


        return response;
    }
    catch (error) {
        throw error;

    } finally {
        dbConnection.end();
    };
}