import { Router } from "express";
import { clientsService } from "../db.js";
import { Status } from "lightdata-tools";

const clear = Router();

clear.post("/clear", async (req, res) => {
    clientsService.clearCache();
    res.status(Status.ok).json({ message: "Cache limpiada" });
})
export default clear;
