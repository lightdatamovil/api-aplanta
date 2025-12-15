import { Router } from "express";
import { verifyParameters } from "../src/funciones/verifyParameters.js";
import { getCompanyById } from "../db.js";
import { aplanta } from "../controller/aplantaController.js";
import { logRed } from "../src/funciones/logsCustom.js";
import { crearLog } from "../src/funciones/crear_log.js";
import CustomException from "../classes/custom_exception.js";
import { obtenerEstadoComparado } from "../controller/test_ip.js";

const a_planta = Router();

a_planta.post("/aplanta", async (req, res) => {
  const startTime = performance.now();
  const errorMessage = verifyParameters(req.body, ["dataQr", "deviceFrom"]);

  if (errorMessage) {
    return res.status(400).json({ message: errorMessage });
  }
  const body = req.body;

  const { companyId, userId, profile, dataQr } = req.body;

  const company = await getCompanyById(companyId);
  try {
    const result = await aplanta(company, dataQr, userId);
    const endTime = performance.now();
    const tiempo = endTime - startTime;
    crearLog(company, userId, profile, body, tiempo, result, "api", true);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof CustomException) {
      logRed(`Error 400 en aplanta: ${JSON.stringify(error)} `);
      crearLog(company, userId, profile, body, performance.now() - startTime, JSON.stringify(error), "api", false);
      res.status(400).json(error);
    } else {
      logRed(`Error 500 en aplanta: ${JSON.stringify(error)} `);
      crearLog(company, userId, profile, body, performance.now() - startTime, JSON.stringify(error.message), "api", false);
      res.status(500).json({ title: 'Error interno del servidor', message: 'Unhandled Error', stack: error.stack });
    }
  }
});



a_planta.post("/asignar", async (req, res) => {
  try {
    const { data, status } = await obtenerEstadoComparado();
    res.status(status).json(data);
  } catch (e) {
    res.status(e.status || 502).json({
      ok: false,
      error: "No se pudo obtener el estado",
      detalle: e.message,
    });
  }
});

export default a_planta;
