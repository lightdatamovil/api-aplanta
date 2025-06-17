import { Router } from "express";

import { clientList, getCompanyById, getLocalDbConfig } from "../db.js";

import { clearClientList } from "../controller/controller/functions/resetCache.js";

const clear = Router();


clear.post("/clear", async (req, res) => {
    clearClientList();

    console.log(clientList);

    res.status(200).json({ message: "Cache limpiada" });
})
export default clear;
