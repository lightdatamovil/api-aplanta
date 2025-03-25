import { Router } from 'express';
import { verifyParameters } from '../src/funciones/verifyParameters.js';
import { getCompanyById, getLocalDbConfig } from '../db.js';
import { aplanta } from '../controller/aplantaController.js';
import { logPurple } from '../src/funciones/logsCustom.js';


const a_planta = Router();
const dbConfigLocal = getLocalDbConfig();
const dbConnectionLocal = mysql.createConnection(dbConfigLocal);
dbConnectionLocal.connect();

a_planta.post('/aplanta', async (req, res) => {
    const startTime = performance.now();
    const errorMessage = verifyParameters(req.body, ['dataQr', 'deviceFrom']);

    if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
    }

    const { companyId, userId, profile, dataQr, autoAssign } = req.body;

    try {
        const company = await getCompanyById(companyId);

        const result = await aplanta(company, dataQr, userId, profile, autoAssign);
        crearLog(companyId,userId,qr.did || 0, "1", req.body,userId,dbConnectionLocal,JSON.stringify(result));
        const endTime = performance.now();
        logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
        res.status(200).json(result);
    } catch (error) {

        crearLog(companyId,userId,dataQr.did || 0, "-1", req.body,userId,dbConnectionLocal,error.message);
        const endTime = performance.now();
        logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
        res.status(500).json({ message: error.stack });
    }
});

export default a_planta;    