import { executeQuery, getClientsByCompany, getDriversByCompany } from "../../../db.js";
import { logCyan, logPurple, logRed, logYellow } from "../../../src/funciones/logsCustom.js";
const contadoresIngresados = {}; 

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

        const startTime1 = performance.now();
        const resultIngresadosHoy = await executeQuery(dbConnection, queryIngresadosHoy, [clientId, `${hoy} 00:00:00`, `${hoy} 23:59:59`]);
        let endTime1 = performance.now();

        logPurple(`Tiempo de ejecución1: ${endTime1 - startTime1} ms`);
        let amountOfAPlanta = 0;
        let amountOfARetirarAndRetirados = 0;

        resultIngresadosHoy.forEach(row => {
            if (row.estado === 1) {
                amountOfARetirarAndRetirados++;
            } else {
                amountOfAPlanta++;
            }
        });


// Función para incrementar el contador

// En algún lugar donde se registre un nuevo ingreso:
incrementarIngresados(hoy, companyId, userId);

// Reemplazo de la consulta SQL con la variable local
const ingresadosHoyChofer = obtenerIngresados(hoy, companyId, userId);
logPurple(`Ingresados hoy por chofer: ${ingresadosHoyChofer}`);

    
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

            const startTime3 = performance.now();
            const resultEnvios = await executeQuery(dbConnection, queryEnvios, [shipmentId]);
            let endTime3 = performance.now();
            logPurple(`Tiempo de ejecución3: ${endTime3 - startTime3} ms`);

            if (resultEnvios.length > 0) {
                choferasignado = resultEnvios[0].choferAsignado || 'Sin asignar';
                zonaentrega = resultEnvios[0].zona || "Sin información";
                sucursal = resultEnvios[0].sucursal || "Sin información";
            }
        }

        const startTime4 = performance.now();
        const companyClients = await getClientsByCompany(dbConnection, companyId);
        let endTime4 = performance.now();
        logPurple(`Tiempo de ejecución4: ${endTime4 - startTime4} ms`);

        const startTime5 = performance.now();
        const companyDrivers = await getDriversByCompany(dbConnection, companyId);
        let endTime5 = performance.now();
        logPurple(`Tiempo de ejecución5: ${endTime5 - startTime5} ms`);

        if (companyClients[clientId] === undefined) {
            throw new Error("Cliente no encontrado");
        }
        logCyan("El cliente fue encontrado");

        const chofer = companyDrivers[choferasignado]?.nombre || "Sin información";
        if (!companyDrivers[choferasignado]) {
            logCyan("El chofer no fue encontrado");
        } else {
            logCyan("El chofer fue encontrado");
        }

        logCyan("Se generó el informe");

        return {
            cliente: `${companyClients[clientId]?.nombre || 'Sin información'}`,
            aingresarhoy: amountOfAPlanta,
            ingresadoshot: amountOfARetirarAndRetirados,
            ingresadosahora: ingresadosHoyChofer,
            chofer,
            zonaentrega,
            sucursal
        };

    } catch (error) {
        logRed(`Error en informe: ${error.stack}`);
        throw error;
    }
}



function incrementarIngresados(fecha, empresa, chofer) {
    const clave = `${fecha}:${empresa}:${chofer}`;
    if (!contadoresIngresados[clave]) {
        contadoresIngresados[clave] = 0;
    }
    contadoresIngresados[clave]++;
}

// Función para obtener el total ingresado
function obtenerIngresados(fecha, empresa, chofer) {
    return contadoresIngresados[`${fecha}:${empresa}:${chofer}`] || 0;
}

function limpiarContadores() {
    console.log("🔄 Reiniciando contadores de envíos ingresados...");
    Object.keys(contadoresIngresados).forEach(clave => delete contadoresIngresados[clave]);
}
setInterval(limpiarContadores, 14 * 24 * 60 * 60 * 1000);