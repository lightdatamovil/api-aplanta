import { Router } from "express";
import { aplanta } from "../controller/aplantaController.js";
import { buildHandlerWrapper } from "../src/funciones/build_handler_wrapper.js";

const a_planta = Router();

a_planta.post(
  '/aplanta',
  buildHandlerWrapper({
    controller: async ({ db, req, company }) => {
      const result = await aplanta(db, req, company);
      return result;
    },
  })
);

export default a_planta;
