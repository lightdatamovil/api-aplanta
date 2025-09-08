import { handleInternalFlex } from "./controller/handlers/flex/handleInternalFlex.js";
import { handleExternalFlex } from "./controller/handlers/flex/handleExternalFlex.js";
import { handleExternalNoFlex } from "./controller/handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./controller/handlers/noflex/handleInternalNoFlex.js";
import { executeQuery, getShipmentIdFromQr, logCyan, LogisticaConfig, logPurple, parseIfJson } from "lightdata-tools";
import { companiesService } from "../db.js";


export async function aplanta(dbConnection, req, company) {
    const { userId } = req.user;

    let { dataQr } = req.body;
    dataQr = parseIfJson(dataQr);

    let response;
    if (
        LogisticaConfig.hasBarcodeEnabled(company.did) &&
        (
            (typeof dataQr === "string" && dataQr.includes("MLAR")) ||
            (typeof dataQr === "object" && dataQr !== null && Object.values(dataQr).some(val => typeof val === "string" && val.includes("MLAR")))
        )
    ) {
        try {
            // obtenemos el envío
            const shipmentId = await getShipmentIdFromQr(company.did, dataQr);
            const cliente = LogisticaConfig.getSenderId(company.did);

            dataQr = {
                local: '1',
                did: shipmentId,
                cliente,
                empresa: company.did
            };

        } catch (error) {

            const cliente = LogisticaConfig.getSenderId(company.did);
            const empresaVinculada = LogisticaConfig.getEmpresaVinculada(company.did);
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
            account = await companiesService.getAccountBySenderId(dbConnection, company.did, senderId);
        } else {
            senderId = dataQr.sender_id;
            account = await companiesService.getAccountBySenderId(dbConnection, company.did, dataQr.sender_id);
            // if (company.did == 167 && account == undefined) {
            //     logCyan("Es JSL");
            //     return await handleInternalFlex(dbConnection, company, userId, dataQr, 0, senderId);
            // }

        }

        if (account) {
            logCyan("Es interno");
            response = await handleInternalFlex(dbConnection, company, userId, dataQr, account, senderId);
        } else if (company.did == 144 || company.did == 167) {
            logCyan("Es interno (por verificación extra de empresa 144 o 167)");
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
                logCyan("Es externo (empresa 144 pero sin coincidencias)");
                response = await handleExternalFlex(dbConnection, company, dataQr, userId);
            }
        } else {
            logCyan("Es externo");
            response = await handleExternalFlex(dbConnection, company, dataQr, userId);
        }
    } else {
        logCyan("No es flex");
        if (company.did == dataQr.empresa) {
            logCyan("Es interno");
            response = await handleInternalNoFlex(dbConnection, dataQr, company, userId);
        } else {
            logCyan("Es externo");
            response = await handleExternalNoFlex(dbConnection, dataQr, company, userId, latit);
        }
    }


    return response;
}
