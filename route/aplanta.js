import { Router } from "express";
import { verifyParameters } from "../src/funciones/verifyParameters.js";
import { getCompanyById } from "../db.js";
import { aplanta } from "../controller/aplantaController.js";
import { logPurple } from "../src/funciones/logsCustom.js";
import { crearLog } from "../src/funciones/crear_log.js";

const a_planta = Router();

a_planta.post("/aplanta", async (req, res) => {
  const startTime = performance.now();
  const errorMessage = verifyParameters(req.body, ["dataQr", "deviceFrom"]);

  if (errorMessage) {
    return res.status(400).json({ message: errorMessage });
  }
  const body = req.body;

  const { companyId, userId, profile, dataQr, autoAssign } = req.body;

  const company = await getCompanyById(companyId);
  try {
    const result = await aplanta(company, dataQr, userId, profile, autoAssign);
    const endTime = performance.now();
    const tiempo = endTime - startTime;
    crearLog(company.did, userId, body.profile, body, tiempo, result, "api", true);
    logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
    res.status(200).json(result);
  } catch (error) {
    const endTime = performance.now();
    const tiempo = endTime - startTime;

    crearLog(company.did, userId, body.profile, body, tiempo, error, "api", true);
    logPurple(`Tiempo de ejecución: ${endTime - startTime} ms`);
    res.status(500).json({ message: error.stack });
  }
});

export default a_planta;
