import { Router } from "express";
import { aplanta } from "../controller/aplantaController.js";
import { logPurple } from "../src/funciones/logsCustom.js";
import { Status } from "../models/status.js";
import { handleError } from "../src/funciones/handle_error.js";
import { verificarTodo } from "../src/funciones/verificar_all.js";

const a_planta = Router();
const requeridosSiempre = ["companyId", "userId", "profile", "deviceId", "appVersion", "brand", "model", "androidVersion", "deviceFrom"]
const requiredBodyFields = ["autoAssign", "ilat", "ilong", "dataQr"];

a_planta.post("/aplanta", async (req, res) => {
  const startTime = performance.now();
  if (!verificarTodo(req, res, [], [...requeridosSiempre, ...requiredBodyFields])) return;
  try {
    const result = await aplanta(req);
    res.status(Status.ok).json(result);
  } catch (err) {
    return handleError(req, res, err, startTime);
  } finally {
    logPurple(`${req.method} ${req.originalUrl} ejecutado en ${performance.now() - startTime} ms`);
  }
});


export default a_planta;
