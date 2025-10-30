import { Router } from "express";
import { aplanta } from "../controller/aplantaController.js";
import { buildHandlerWrapper } from "../src/funciones/build_handler_wrapper.js";

const a_planta = Router();

a_planta.post(
  '/aplanta',
  buildHandlerWrapper({
    required: ['dataQr'],
    optional: ['latitude', 'longitude'],
    controller: async ({ db, req, company }) => await aplanta({ db, req, company }),
  })
);

export default a_planta;
