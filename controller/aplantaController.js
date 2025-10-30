import { handleInternalFlex } from "./controller/handlers/flex/handleInternalFlex.js";
import { handleExternalFlex } from "./controller/handlers/flex/handleExternalFlex.js";
import { handleExternalNoFlex } from "./controller/handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./controller/handlers/noflex/handleInternalNoFlex.js";
import { CustomException, getShipmentIdFromQr, LightdataORM, LogisticaConfig, parseIfJson } from "lightdata-tools";
import { companiesService, urlApimovilGetShipmentId, axiosInstance } from "../db.js";


export async function aplanta({ db, req, company }) {
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
            const shipmentId = await getShipmentIdFromQr({
                url: urlApimovilGetShipmentId,
                axiosInstance,
                req,
                dataQr,
                desde: 'aplanta'
            });
            const cliente = LogisticaConfig.getSenderId(company.did);

            dataQr = {
                local: '1',
                did: shipmentId,
                cliente,
                empresa: company.did
            };

        } catch {

            const cliente = LogisticaConfig.getSenderId(company.did);
            const empresaVinculada = LogisticaConfig.getEmpresaVinculada(company.did);
            // que pasa si es 211 o  55 que no tienen empresa vinculada
            if (empresaVinculada === null) {
                // preguntar a cris 
                throw new CustomException({
                    title: "El envio no esta igresado en su sistema",
                    message: "El envio no esta igresado en su sistema y su empresa no tiene una empresa vinculada para buscar el envio en otra empresa. Por favor contacte a soporte."
                });
            }

            const shipmentIdExterno = await getShipmentIdFromQr({
                url: urlApimovilGetShipmentId,
                axiosInstance,
                req,
                dataQr,
                desde: 'aplanta',
                companyId: empresaVinculada
            });
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

    const isFlex = Object.prototype.hasOwnProperty.call(dataQr, "sender_id") || isCollectShipmentML;

    if (isFlex) {
        let account = null;
        let senderId = null;
        if (isCollectShipmentML) {
            //! Esto quiere decir que es un envio de colecta de ML
            const [result] = await LightdataORM.select({
                dbConnection: db,
                where: {
                    ml_shipment_id: dataQr.id,
                    flex: 1,
                },
                table: 'envios',
            });
            senderId = result.ml_vendedor_id;
            account = await companiesService.getAccountBySenderId(db, company.did, senderId);
        } else {
            senderId = dataQr.sender_id;
            account = await companiesService.getAccountBySenderId(db, company.did, dataQr.sender_id);
        }

        if (account) {
            response = await handleInternalFlex(db, req, company, account, senderId);
        } else if (company.did == 144 || company.did == 167) {
            const row = await LightdataORM.select({
                dbConnection: db,
                table: 'envios',
                where: {
                    ml_vendedor_id: dataQr.sender_id,
                    ml_shipment_id: dataQr.id
                },
            });

            if (row.length > 0) {
                senderId = dataQr.sender_id;
                response = await handleInternalFlex({ db, req, company, account, senderId });
            } else {
                response = await handleExternalFlex({ db, req, company });
            }
        } else {
            response = await handleExternalFlex({ db, req, company });
        }
    } else {
        if (company.did == dataQr.empresa) {
            response = await handleInternalNoFlex({ db, req, company });
        } else {
            response = await handleExternalNoFlex({ db, req, company });
        }
    }

    return response;
}
