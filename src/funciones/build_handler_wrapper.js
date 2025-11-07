import { companiesService, hostProductionDb, portProductionDb } from "../../db.js";
import { crearLog } from "./crear_log.js";
import { buildHandler, getProductionDbConfig } from "lightdata-tools";

export function buildHandlerWrapper({
    required,
    optional,
    headers,
    status,
    companyResolver2,
    getDbConfig2,
    controller,
    log2,
    pool,
}) {
    return buildHandler({
        required,
        optional,
        headers,
        status,
        controller,
        companyResolver: companyResolver2 || (({ req }) => companiesService.getById(req.user.companyId)),
        getDbConfig: getDbConfig2 || (({ company }) => getProductionDbConfig({ company, host: hostProductionDb, port: portProductionDb })),
        log: log2 || (async ({ req, durationMs, data, exito }) => await crearLog({ req, tiempo: durationMs, resultado: JSON.stringify(data), exito })),
        pool,
    });
}