import { executeQuery } from "../../../db.js";

export async function informe(dbConnection, userId) {
    try {
        const sql = `
        SELECT COUNT(eh.id) as total, CONCAT(su.nombre, ' ', su.apellido) as cadete
        FROM envios_historial as eh
        JOIN sistema_usuarios as su ON (su.elim = 0 AND su.superado = 0 AND su.did = eh.quien)
        WHERE eh.superado = 0 AND eh.estado = 0 AND eh.quien = ?
        GROUP BY eh.quien
    `;

        const result = await executeQuery(dbConnection, sql, [userId]);
console.log(result,"resulta");


if (result && result.length > 0) {
    return {
        namecliente: result[0].cadete || "NO",
        aretirar: result[0].total || 0
    };
} else {
    return {
        namecliente: "NO",
        aretirar: 0
    };
}
    } catch (error) {
        console.error('❌ Error en informe:', error);
        throw error;
    }
}