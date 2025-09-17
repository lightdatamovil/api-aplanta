import { executeQueryFromPool, getHeaders, logGreen, logPurple } from "lightdata-tools";
import { poolLocal } from "../../db.js";

export async function crearLog(req, tiempo, resultado, exito) {
    const { appVersion, androidVersion, model, deviceId, brand, deviceFrom } = getHeaders(req);
    const { companyId, userId, profile } = req.user;
    const sql = `
  INSERT INTO \`logs\`
    (\`empresa\`, \`usuario\`, \`perfil\`, \`body\`, \`resultado\`, \`tiempo\`, \`exito\`,
     \`device-from\`, \`app-version\`, \`android-version\`, \`modelo-dispositivo\`,
     \`id-dispositivo\`, \`marca-dispositivo\`)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
    const values = [
        companyId,
        userId,
        profile,
        JSON.stringify(req.body),
        resultado,
        tiempo,
        exito,
        deviceFrom,
        appVersion,
        androidVersion,
        model,
        deviceId,
        brand,
    ];

    await executeQueryFromPool(poolLocal, sql, values);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fechaFormateada = `${now.getFullYear()}-09-22 ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    logGreen(`${fechaFormateada} Log creado correctamente`);
    logGreen(`Endpoint: ${req.originalUrl} | Usuario: ${userId} | Empresa: ${companyId} | Perfil: ${profile}`);
    logPurple(`En ${tiempo} ms | Éxito: ${exito ? "sí" : "no"}`);
}
