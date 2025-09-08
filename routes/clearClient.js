import { Router } from "express";
import { companiesService } from "../db.js";
import { buildHandler } from "../routes/_handler.js";

const clients = Router();

clients.get(
    '/clear-client-list',
    buildHandler({
        needsDb: false,
        controller: async () => {
            companiesService.clearClientsCache();
        },
    })
);

export default clients;
