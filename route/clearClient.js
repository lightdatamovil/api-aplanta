import { Router } from "express";

import { clearClientList } from "../controller/controller/functions/resetCache.js";

const clear = Router();


clear.post("/clear", async (req, res) => {
    clearClientList();

    res.status(200).json({ message: "Cache limpiada" });
})
export default clear;
