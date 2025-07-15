import { Router } from "express";
import { verifyParameters } from "../src/funciones/verifyParameters.js";
import { getCompanyById } from "../db.js";
import { aplanta } from "../controller/aplantaController.js";
import { logPurple, logRed } from "../src/funciones/logsCustom.js";
import { crearLog } from "../src/funciones/crear_log.js";
import CustomException from "../classes/custom_exception.js";

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
    crearLog(companyId, userId, profile, body, tiempo, result, "api", true);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof CustomException) {
      logRed(`Error 400 en aplanta: ${JSON.stringify(error)} `);
      crearLog(companyId, userId, profile, body, performance.now() - startTime, JSON.stringify(error), "api", false);
      res.status(400).json(error);
    } else {
      logRed(`Error 500 en aplanta: ${JSON.stringify(error)} `);
      crearLog(companyId, userId, profile, body, performance.now() - startTime, JSON.stringify(error.message), "api", false);
      res.status(500).json({ title: 'Error interno del servidor', message: 'Unhandled Error', stack: error.stack });
    }
  } finally {
    logPurple(`Tiempo de ejecución: ${performance.now() - startTime} ms`);
  }
});

export default a_planta;
