import { Router } from 'express';
import { verifyParameters } from '../src/funciones/verifyParameters.js';
import { getCompanyById } from '../db.js';
import { aplanta } from '../controller/aplantaController.js';
import { logPurple } from '../src/funciones/logsCustom.js';

const a_planta = Router();

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

        const endTime = performance.now();
        logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
        res.status(200).json(result);
    } catch (error) {
        const endTime = performance.now();
        logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
        res.status(500).json({ message: error.message });
    }
});

export default a_planta;