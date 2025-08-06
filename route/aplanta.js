import { Router } from "express";
import { aplanta } from "../controller/aplantaController.js";
import { crearLog } from "../src/funciones/crear_log.js";
import { errorHandler, getProductionDbConfig, logPurple, Status, verifyAll, verifyToken, verifyHeaders, getCompanyById } from "lightdata-tools";
import mysql2 from "mysql2";
import { Constants } from "../src/constants.js";
import { companiesList } from "../db.js";

const a_planta = Router();

a_planta.post("/aplanta", verifyToken, async (req, res) => {
  const startTime = performance.now();

  verifyAll(req, res, [], ["dataQr"]);
  verifyHeaders(req, Constants.headers);

  let dbConnection;

  try {
    const { companyId } = req.body;
    const company = await getCompanyById(companiesList, companyId);

    const dbConfig = getProductionDbConfig(company);
    const dbConnection = mysql2.createConnection(dbConfig);
    dbConnection.connect();

    const result = await aplanta(dbConnection, req, company);

    crearLog(req, performance.now() - startTime, result, "api", true);

    res.status(Status.ok).json(result);
  } catch (error) {
    errorHandler(req, res, error);
  } finally {
    logPurple(`Tiempo de ejecución: ${performance.now() - startTime} ms`);
    dbConnection.end();
  }
});

export default a_planta;
