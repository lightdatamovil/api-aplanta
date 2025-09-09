import { Router } from "express";
import { companiesService } from "../db.js";
import { buildHandlerWrapper } from "../src/funciones/build_handler_wrapper.js";

const clients = Router();

clients.post(
    '/clear-client-list',
    buildHandlerWrapper({
        needsDb: false,
        controller: async () => {
            companiesService.clearClientsCache();
        },
    })
);

export default clients;
