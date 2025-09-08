import { Router } from "express";
import { aplanta } from "../controller/aplantaController.js";
import { buildHandler } from "./_handler.js";

const a_planta = Router();

a_planta.get(
  '/aplanta',
  buildHandler({
    controller: async ({ db, req, company }) => {
      const result = await aplanta(db, req, company);
      return result;
    },
  })
);

export default a_planta;
