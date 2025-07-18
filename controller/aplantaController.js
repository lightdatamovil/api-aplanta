import { executeQuery, getAccountBySenderId, getCompanyById, getProdDbConfig } from "../db.js";
import { handleInternalFlex } from "./handlers/flex/handleInternalFlex.js";
import { handleExternalFlex } from "./handlers/flex/handleExternalFlex.js";
import { handleExternalNoFlex } from "./handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./handlers/noflex/handleInternalNoFlex.js";
import mysql2 from "mysql2";
import { logCyan } from "../src/funciones/logsCustom.js";
import { getShipmentIdFromQr } from "../src/funciones/getShipmentIdFromQr.js";
import { parseIfJson } from "../src/funciones/isValidJson.js";

const empresasCOn = [211, 20]

function getDidClienteByEmpresa(empresa) {
    switch (empresa) {
        case 20:
            return 215;
        case 144:
            return 301;
        default:
            return null;
    }
}

export async function aplanta(req) {
    let { companyId, userId, dataQr } = req.body;

    let dbConnection;
    try {
        const company = await getCompanyById(companyId);
        const dbConfig = getProdDbConfig(company);
        const dbConnection = mysql2.createConnection(dbConfig);
        dbConnection.connect();

        let response;

        dataQr = parseIfJson(dataQr);
        if (empresasCOn.includes(company.did) && !Object.prototype.hasOwnProperty.call(dataQr, "local") && !Object.prototype.hasOwnProperty.call(dataQr, "sender_id")) {
            const shipmentId = await getShipmentIdFromQr(company.did, dataQr);
            dataQr = {
                local: "1",
                empresa: company.did,
                did: shipmentId,
                cliente: getDidClienteByEmpresa(company.did),
            };
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
            else if (!account && company.did == 144) {
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
                response = await handleExternalNoFlex(dbConnection, dataQr, company.did, userId);
            }
        }


        return response;
    } catch (error) {
        throw error;
    } finally {
        if (dbConnection) dbConnection.end();
    };
}