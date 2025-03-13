import { Router } from 'express';

import { getCompanyById } from '../db.js';
import { aplanta } from '../controller/aplantaController.js';

const a_planta = Router();

a_planta.post('/aplanta', async (req, res) => {
    const errorMessage = verifyParamaters(req.body, ['dataQr', 'deviceFrom']);

    if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
    }

    const { companyId, userId, profile, dataQr, autoAssign } = req.body;

    try {
        const company = await getCompanyById(companyId);

        const result = await aplanta(company, JSON.parse(dataQr), userId, profile, autoAssign);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default a_planta;