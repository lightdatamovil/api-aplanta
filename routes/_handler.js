// routes/_handler.js
import { performance } from 'node:perf_hooks';
import {
    connectMySQL,
    errorHandler,
    getProductionDbConfig,
    logRed,
    Status,
    verifyAll,
    verifyHeaders,
} from 'lightdata-tools';
import { hostProductionDb, portProductionDb, companiesService } from '../db.js';
import { crearLog } from '../src/funciones/crear_log.js';

/**
 * @param {Object} opts
 * @param {string[]} [opts.required=[]]
 * @param {string[]} [opts.optional=[]]
 * @param {string[]} [opts.headers=[]]
 * @param {boolean}  [opts.needsDb=true]
 * @param {number}   [opts.status=Status.ok]
 * @param {Function} [opts.companyResolver] async ({req}) => company | null
 *   Si no se define:
 *     - Si req.user?.companyId existe -> companiesService.getById(companyId)
 *     - Si no, company = null
 * @param {Function} opts.controller async ({ req, res, company, db }) => result | { body, status }
 */
export function buildHandler({
    required = [],
    optional = [],
    headers = [],
    needsDb = true,
    status = Status.ok,
    companyResolver,
    controller,
}) {
    if (typeof controller !== 'function') {
        throw new Error('buildHandler: controller debe ser una función async');
    }

    return async (req, res) => {
        const startTime = performance.now();
        let dbConnection;

        try {
            verifyHeaders(req, headers);
            verifyAll(req, [], { required, optional });

            // Resolver company
            let company = null;
            if (companyResolver) {
                company = await companyResolver({ req });
            } else if (req.user?.companyId) {
                company = await companiesService.getById(req.user.companyId);
            }

            // Conexión DB (si se necesita)
            if (needsDb) {
                const dbConfig = getProductionDbConfig(company, hostProductionDb, portProductionDb);
                dbConnection = await connectMySQL(dbConfig);
            }

            // Ejecutar controlador
            const out = await controller({ req, res, company, db: dbConnection });
            const hasEnvelope = out && typeof out === 'object' && 'body' in out && 'status' in out;

            const body = hasEnvelope ? out.body : out;
            const httpStatus = hasEnvelope ? out.status : status;

            try { crearLog(req, startTime, JSON.stringify(body), true); } catch (e) { logRed(e); }
            return res.status(httpStatus).json(body);
        } catch (error) {
            try { crearLog(req, startTime, JSON.stringify(error), false); } catch (e) { logRed(e); }
            return errorHandler(req, res, error);
        } finally {
            if (dbConnection) {
                try { dbConnection.end(); } catch (e) { logRed(e); }
            }
        }
    };
}