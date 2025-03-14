import { executeQuery, getClientsByCompany, getDriversByCompany } from "../../../db.js";
import { logCyan, logRed, logYellow } from "../../../src/funciones/logsCustom.js";

export async function informe(dbConnection, companyId, clientId, userId, shipmentId) {
    const hoy = new Date().toISOString().split('T')[0];

    try {
        const queryIngresadosHoy = `
            SELECT eh.estado 
            FROM envios_historial AS eh
            JOIN envios AS e 
                ON e.elim=0 AND e.superado=0 AND e.didCliente = ? AND e.did = eh.didEnvio
            WHERE eh.elim=0 AND eh.superado=0 
            AND (eh.autofecha BETWEEN ? AND ?) 
            AND eh.estado IN (7, 0, 1);
        `;

        const resultIngresadosHoy = await executeQuery(dbConnection, queryIngresadosHoy, [clientId, `${hoy} 00:00:00`, `${hoy} 23:59:59`]);

        let amountOfAPlanta = 0;
        let amountOfARetirarAndRetirados = 0;

        resultIngresadosHoy.forEach(row => {
            if (row.estado === 1) {
                amountOfARetirarAndRetirados++;
            } else {
                amountOfAPlanta++;
            }
        });

        const queryIngresadosHoyChofer = `
            SELECT COUNT(id) AS total 
            FROM envios_historial 
            WHERE elim=0
            AND quien = ?
            and ( autofecha > ?
            and autofecha < ?)
            AND estado = 1;
        `;
        // "SELECT count(id) as total
        // FROM `envios_historial`
        // where  elim=0
        // and quien in ($quien)
        // and ( autofecha > '$hoy 00:00:00'
        // and autofecha < '$hoy 23:59:59' )
        // and estado = 1"
        logYellow(`userId: ${userId}`);
        const resultIngresadosHoyChofer = await executeQuery(dbConnection, queryIngresadosHoyChofer, [userId, `${hoy} 00:00:00`, `${hoy} 23:59:59`]);
        logYellow(`resultIngresadosHoyChofer: ${JSON.stringify(resultIngresadosHoyChofer)}`);
        const ingresadosHoyChofer = resultIngresadosHoyChofer[0]?.total || 0;

        let choferasignado;
        let zonaentrega;
        let sucursal;

        if (shipmentId > 0) {
            const queryEnvios = `
                SELECT ez.nombre AS zona, e.choferAsignado, sd.nombre AS sucursal
                FROM envios AS e 
                LEFT JOIN envios_zonas AS ez 
                    ON ez.elim=0 AND ez.superado=0 AND ez.did = e.didEnvioZona
                LEFT JOIN sucursales_distribucion AS sd 
                    ON sd.elim=0 AND sd.superado=0 AND sd.did = e.didSucursalDistribucion
                WHERE e.superado=0 AND e.elim=0 AND e.did = ?;
            `;
            const resultEnvios = await executeQuery(dbConnection, queryEnvios, [shipmentId]);

            if (resultEnvios.length > 0) {
                choferasignado = resultEnvios[0].choferAsignado || 'Sin asignar';
                zonaentrega = resultEnvios[0].zona || "Sin informacion";
                sucursal = resultEnvios[0].sucursal || "Sin informacion";
            }
        }

        const companyClients = await getClientsByCompany(dbConnection, companyId);

        const companyDrivers = await getDriversByCompany(dbConnection, companyId);
        logYellow(`companyDrivers: ${JSON.stringify(companyDrivers)}`);
        logYellow(`choferasignado: ${choferasignado}`);
        if (companyClients[clientId] === undefined) {
            throw new Error("Cliente no encontrado");
        }
        logCyan("El cliente fue encontrado");

        let chofer;

        if (companyDrivers[choferasignado] === undefined) {
            chofer = "Sin informacion";
            logCyan("El chofer no fue encontrado");
        } else {
            chofer = companyDrivers[choferasignado].nombre;
            logCyan("El chofer fue encontrado");
        }

        logCyan("Se generó el informe");

        return {
            cliente: `${companyClients[clientId]?.nombre || 'Sin informacion'}`,
            aingresarhoy: amountOfAPlanta,
            ingresadoshot: amountOfARetirarAndRetirados,
            ingresadosahora: ingresadosHoyChofer,
            chofer: chofer,
            zonaentrega: zonaentrega,
            sucursal: sucursal
        };

    } catch (error) {
        logRed(`Error en informe: ${error.message}`);
        throw error;
    }
}
