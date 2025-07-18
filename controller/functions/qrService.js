// qrService.js

import { getShipmentIdFromQr } from "../../src/funciones/getShipmentIdFromQr.js";
import { parseIfJson } from "../../src/funciones/isValidJson.js";

const empresasCon = [211, 20];
function getDidClienteByEmpresa(did) {
    switch (did) {
        case 20: return 215;
        case 144: return 301;
        default: return null;
    }
}

export async function normalizeDataQr(companyDid, raw) {
    let data = parseIfJson(raw);
    const missingFields = !("local" in data) && !("sender_id" in data);
    if (empresasCon.includes(companyDid) && missingFields) {
        const shipmentId = await getShipmentIdFromQr(companyDid, data);
        data = {
            local: "1",
            empresa: companyDid,
            did: shipmentId,
            cliente: getDidClienteByEmpresa(companyDid),
        };
    }
    return data;
}
