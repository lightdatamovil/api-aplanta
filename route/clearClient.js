import { Router } from "express";
import { clientList } from "../db.js";

const clear = Router();

clear.post("/clear", async (req, res) => {
    for (const key in clientList) {
        delete clientList[key];
    }
    res.status(200).json({ message: "Cache limpiada" });
})
export default clear;
