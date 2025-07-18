import { executeQuery, getAccountBySenderId } from "../db.js";

// flowTypeService.js
export function detectFlex(dataQr) {
    const isCollectShipmentML = "t" in dataQr;
    const isFlex = "sender_id" in dataQr || isCollectShipmentML;
    return { isFlex, isCollectShipmentML };
}

// accountService.js


export async function fetchFlexAccount(conn, companyDid, dataQr, isCollect) {
    let account, senderId;

    if (isCollect) {
        const sql = `SELECT ml_vendedor_id FROM envios WHERE ml_shipment_id = ? AND flex=1 AND superado=0 AND elim=0`;
        const [row] = await executeQuery(conn, sql, [dataQr.id]);
        senderId = row?.ml_vendedor_id;
        account = senderId
            ? await getAccountBySenderId(conn, companyDid, senderId)
            : null;
    } else {
        senderId = dataQr.sender_id;
        account = await getAccountBySenderId(conn, companyDid, senderId);
    }

    return { account, senderId };
}

