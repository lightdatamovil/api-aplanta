import { conectionForCompany, getCompanyById } from "../db.js";
import { detectFlex, fetchFlexAccount } from "./es_flex.js";
import { normalizeDataQr } from "./functions/qrService.js";
import { processFlex, processNoFlex } from "./handler_process.js";

export async function aplanta(req) {
    const { companyId, userId, dataQr: rawQr } = req.body;
    const conn = await conectionForCompany(companyId);
    try {
        const company = await getCompanyById(companyId);
        let dataQr = await normalizeDataQr(company.did, rawQr);
        const { isFlex, isCollectShipmentML } = detectFlex(dataQr);

        if (isFlex) {
            const { account, senderId } =
                await fetchFlexAccount(conn, company.did, dataQr, isCollectShipmentML);
            return await processFlex(conn, company, userId, dataQr, account, senderId, isCollectShipmentML);
        } else {
            return await processNoFlex(conn, company.did, userId, dataQr);
        }
    } finally {
        conn.end();
    }
}
