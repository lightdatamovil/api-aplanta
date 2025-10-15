import { executeQuery, getClientsByCompany, getDriversByCompany } from "../../../db.js";
import { logCyan } from "../../../src/funciones/logsCustom.js";

const contadoresIngresados = {};

// 🔄 Limpieza automática cada 14 días
setInterval(() => {
    Object.keys(contadoresIngresados).forEach(k => delete contadoresIngresados[k]);
}, 14 * 24 * 60 * 60 * 1000); // 14 días

export async function informe(dbConnection, company, clientId = 0, userId, shipmentId = 0) {
    const companyId = company.did;
    const hoy = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 🔹 Registrar nuevo ingreso
    incrementarIngresados(hoy, companyId, userId);

    // 🔹 Consultas SQL en paralelo (más eficiente)
    const queryIngresadosHoy = `
    SELECT eh.estado 
    FROM envios_historial AS eh
    JOIN envios AS e 
      ON e.elim=0 AND e.superado=0 
     AND e.didCliente = ? 
     AND e.did = eh.didEnvio
    WHERE eh.elim=0 
      AND eh.superado=0 
      AND eh.autofecha BETWEEN ? AND ?
      AND eh.estado IN (7, 0, 1);
  `;

    const promIngresadosHoy = executeQuery(dbConnection, queryIngresadosHoy, [
        clientId,
        `${hoy} 00:00:00`,
        `${hoy} 23:59:59`,
    ]);

    // Si hay shipmentId, preparamos query específica
    const promEnvioDetalle =
        shipmentId > 0
            ? executeQuery(
                dbConnection,
                `
        SELECT 
          e.choferAsignado, 
          ez.nombre AS zona, 
          sd.nombre AS sucursal
        FROM envios AS e 
        LEFT JOIN envios_zonas AS ez 
          ON ez.elim=0 AND ez.superado=0 AND ez.did = e.didEnvioZona
        LEFT JOIN sucursales_distribucion AS sd 
          ON sd.elim=0 AND sd.superado=0 AND sd.did = e.didSucursalDistribucion
        WHERE e.superado=0 AND e.elim=0 AND e.did = ?;
      `,
                [shipmentId]
            )
            : Promise.resolve([]);

    // Obtener clientes y choferes en paralelo
    const [resultIngresadosHoy, resultEnvioDetalle, companyClients, companyDrivers] =
        await Promise.all([
            promIngresadosHoy,
            promEnvioDetalle,
            getClientsByCompany(dbConnection, companyId),
            getDriversByCompany(dbConnection, companyId),
        ]);

    // 🔹 Procesar resultados de envíos ingresados hoy
    let amountAPlanta = 0;
    let amountRetirados = 0;

    for (const { estado } of resultIngresadosHoy) {
        if (estado === 1) amountRetirados++;
        else amountAPlanta++;
    }

    const ingresadosHoyChofer = obtenerIngresados(hoy, companyId, userId);

    // 🔹 Datos del envío si aplica
    const envioDetalle = resultEnvioDetalle[0] || {};
    const choferAsignado = envioDetalle.choferAsignado || 0;
    const zonaEntrega = envioDetalle.zona || "Sin información";
    const sucursal = envioDetalle.sucursal || "Sin información";

    // 🔹 Datos del cliente y chofer
    const cliente = companyClients[clientId]?.nombre ?? "Sin información";
    const chofer = companyDrivers[choferAsignado]?.nombre ?? "Sin información";

    if (!companyClients[clientId]) logCyan(`[informe] Cliente no encontrado (ID: ${clientId})`);
    if (!companyDrivers[choferAsignado])
        logCyan(`[informe] Chofer no encontrado (ID: ${choferAsignado})`);

    logCyan(`[informe] Informe generado para empresa ${companyId}`);

    // 🔹 Resultado final
    return {
        cliente,
        aingresarhoy: amountAPlanta,
        ingresadoshot: amountRetirados,
        ingresadosahora: ingresadosHoyChofer,
        chofer,
        zonaentrega: zonaEntrega,
        sucursal,
    };
}

/* ==============================
   Funciones auxiliares locales
   ============================== */

function incrementarIngresados(fecha, empresa, chofer) {
    const clave = `${fecha}:${empresa}:${chofer}`;
    contadoresIngresados[clave] = (contadoresIngresados[clave] || 0) + 1;
}

function obtenerIngresados(fecha, empresa, chofer) {
    return contadoresIngresados[`${fecha}:${empresa}:${chofer}`] || 0;
}
