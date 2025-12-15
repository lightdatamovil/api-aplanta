import { executeQuery, getAccountBySenderId, getProdDbConfig } from "../db.js";
import { handleInternalFlex } from "./controller/handlers/flex/handleInternalFlex.js";
import { handleExternalFlex } from "./controller/handlers/flex/handleExternalFlex.js";
import { handleExternalNoFlex } from "./controller/handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./controller/handlers/noflex/handleInternalNoFlex.js";
import mysql2 from "mysql2";
import { logPurple } from "../src/funciones/logsCustom.js";
import { getShipmentIdFromQr } from "../src/funciones/getShipmentIdFromQr.js";
import { parseIfJson } from "../src/funciones/isValidJson.js";
import LogisticaConf from "../classes/logistica_conf.js";
import { decrActiveLocal, incrActiveLocal } from "../src/funciones/dbList.js";
import { logRed } from "lightdata-tools";


export async function aplanta(company, dataQr, userId) {
    const dbConfig = getProdDbConfig(company);
    const dbConnection = mysql2.createConnection(dbConfig);
    dbConnection.connect();
    incrActiveLocal(company.did);

    try {
        let response;
        if (typeof dataQr === "string") {
            dataQr = dataQr.replace(/\s+/g, '');
        }

        //  console.log("DATA QR:", dataQr);

        dataQr = parseIfJson(dataQr);


        //es barcode
        if (
            LogisticaConf.hasBarcodeEnabled(company.did) &&
            // mejor usar Object.hasOwn para chequear sólo properties propias
            !Object.hasOwn(dataQr, 'local') &&
            !Object.hasOwn(dataQr, 'sender_id')
        ) {
            let cliente, shipmentId;
            try {
                if (LogisticaConf.getExisteSioSi(company.did)) {
                    const q = `
                    SELECT didCliente,did
                    FROM envios
                    WHERE ml_shipment_id = ? AND superado = 0 AND elim = 0
                    LIMIT 1
                  `;
                    const result = await executeQuery(dbConnection, q, [dataQr], true);
                    if (result.length > 0) {
                        cliente = result[0]?.didCliente ?? null;
                        shipmentId = result[0]?.did ?? null;
                    } else {
                        throw new Error("No se encontró el envío en la base de datos.");
                    }
                } else {
                    cliente = LogisticaConf.getSenderId(company.did, dataQr);
                    shipmentId = await getShipmentIdFromQr(company.did, dataQr);
                }

                dataQr = {
                    local: '1',
                    did: shipmentId,
                    cliente,
                    empresa: company.did
                };

            } catch (error) {
                logRed(`Error al procesar código de barras: ${error.message}`);
                const cliente = LogisticaConf.getSenderId(company.did);
                const empresaVinculada = LogisticaConf.getEmpresaVinculada(company.did);
                // que pasa si es 211 o  55 que no tienen empresa vinculada
                if (empresaVinculada === null) {
                    // preguntar a cris 
                    throw new Error("El envio no esta igresado en su sistema");
                };
                let shipmentIdExterno;
                try {

                    shipmentIdExterno = await getShipmentIdFromQr(empresaVinculada, dataQr);
                } catch (error) {
                    throw new Error("Error envio no insertado ");
                }

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
            /// Busco la cuenta del cliente
            let account = null;
            let senderId = null;
            if (isCollectShipmentML) {
                //! Esto quiere decir que es un envio de colecta de ML
                const querySeller = `SELECT ml_vendedor_id FROM envios WHERE ml_shipment_id = ? AND flex = 1 AND superado=0 AND elim=0`;
                const result = await executeQuery(dbConnection, querySeller, [dataQr.id]);

                senderId = result[0].ml_vendedor_id;
                account = await getAccountBySenderId(dbConnection, company.did, senderId);
            } else {
                senderId = dataQr.sender_id;
                account = await getAccountBySenderId(dbConnection, company.did, dataQr.sender_id);
                // if (company.did == 167 && account == undefined) {
                //     return await handleInternalFlex(dbConnection, company, userId, dataQr, 0, senderId);
                // }

            }

            if (account) {
                response = await handleInternalFlex(dbConnection, company, userId, dataQr, account, senderId);
            } else if (company.did == 144 || company.did == 167 || company.did == 114) {
                // el envio debe estar insertado en la tabla envios, sino no lo inserta al saltar esta verficacion en este if
                const queryCheck = `
                  SELECT did
                  FROM envios
                  WHERE ml_vendedor_id = ?
                  AND ml_shipment_id = ?
                  AND superado = 0
                  AND elim = 0
                  LIMIT 1
                `;
                const resultCheck = await executeQuery(dbConnection, queryCheck, [dataQr.sender_id, dataQr.id]);

                if (resultCheck.length > 0) {
                    senderId = dataQr.sender_id;
                    response = await handleInternalFlex(dbConnection, company, userId, dataQr, account, senderId);
                } else {
                    response = await handleExternalFlex(dbConnection, company, dataQr, userId);
                }
            } else {
                response = await handleExternalFlex(dbConnection, company, dataQr, userId);
            }
        } else {
            if (company.did == dataQr.empresa) {
                response = await handleInternalNoFlex(dbConnection, dataQr, company, userId);
            } else {
                logPurple(JSON.stringify(dataQr));
                response = await handleExternalNoFlex(dbConnection, dataQr, company, userId);
            }
        }


        return response;
    }
    catch (error) {
        console.log(dbConfig);
        throw error;

    } finally {
        decrActiveLocal(company.did);
        dbConnection.end();
    };
}