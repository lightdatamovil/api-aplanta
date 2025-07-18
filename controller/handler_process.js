import { executeQuery } from "../db.js";
import { handleExternalFlex } from "./handlers/flex/handleExternalFlex.js";
import { handleInternalFlex } from "./handlers/flex/handleInternalFlex.js";
import { handleExternalNoFlex } from "./handlers/noflex/handleExternalNoFlex.js";
import { handleInternalNoFlex } from "./handlers/noflex/handleInternalNoFlex.js";


export async function processFlex(conn, company, userId, dataQr, account, senderId) {
    if (account) {
        return handleInternalFlex(conn, company.did, userId, dataQr, account, senderId);
    }

    // caso extra para empresa 144
    if (!account && company.did === 144) {
        const sql = `
      SELECT did FROM envios
      WHERE ml_vendedor_id = ?
        AND superado = 0 AND elim = 0
      LIMIT 1
    `;
        const rows = await executeQuery(conn, sql, [dataQr.sender_id]);
        if (rows.length) {
            return handleInternalFlex(conn, company.did, userId, dataQr, account, senderId);
        }
    }

    return handleExternalFlex(conn, company, dataQr, userId);
}

export async function processNoFlex(conn, companyDid, userId, dataQr) {
    if (companyDid === dataQr.empresa) {
        return handleInternalNoFlex(conn, dataQr, companyDid, userId);
    }
    return handleExternalNoFlex(conn, dataQr, companyDid, userId);
}
