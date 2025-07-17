import { Router } from "express";
import { aplanta } from "../controller/aplantaController.js";
import { logPurple } from "../src/funciones/logsCustom.js";
import { Status } from "../models/status.js";
import { handleError } from "../src/funciones/handle_error.js";
import { verificarTodo } from "../src/funciones/verificar_all.js";

const a_planta = Router();

const requiredBodyFields = ["companyId", "userId", "profile", "deviceId", "appVersion", "brand", "model", "androidVersion", "autoAssign", "ilat", "ilong", "dataQr", "deviceFrom"];

a_planta.post("/aplanta", async (req, res) => {
  const start = performance.now();
  if (!verificarTodo(req, res, [], requiredBodyFields)) return;
  try {
    const result = await aplanta(req);
    res.status(Status.ok).json({ body: result, message: "paquete a planta correctamente" });
  } catch (err) {
    return handleError(req, res, err);
  } finally {
    logPurple(`POST /api/aplanta ejecutado en ${performance.now() - start} ms`);
  }
});


export default a_planta;
