import { Router } from "express";
import { aplanta } from "../controller/aplantaController.js";
import { crearLog } from "../src/funciones/crear_log.js";
import { errorHandler, getProductionDbConfig, logPurple, Status, verifyAll, verifyToken, verifyHeaders } from "lightdata-tools";
import mysql2 from "mysql2";
import { Constants } from "../src/constants.js";
import { companiesService } from "../db.js";

const a_planta = Router();

a_planta.post("/aplanta", verifyToken, async (req, res) => {
  const startTime = performance.now();

  let dbConnection;

  try {
    verifyAll(req, res, [], ["dataQr", "ilat", "ilong"]);
    verifyHeaders(req, Constants.headers);

    const companyId = req.headers['x-company-id'];

    const company = await companiesService.getById(companyId);

    const dbConfig = getProductionDbConfig(company);
    dbConnection = mysql2.createConnection(dbConfig);
    dbConnection.connect();

    const result = await aplanta(dbConnection, req, company);

    crearLog(req, performance.now() - startTime, result, "api", true);

    res.status(Status.ok).json(result);
  } catch (error) {
    errorHandler(req, res, error);
  } finally {
    logPurple(`Tiempo de ejecución: ${performance.now() - startTime} ms`);
    if (dbConnection) dbConnection.end();
  }
});

export default a_planta;
