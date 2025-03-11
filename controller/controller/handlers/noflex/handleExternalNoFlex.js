import { executeQuery, getClientsByCompany, getCompanyById, getProdDbConfig } from "../../../../db.js";
import { sendToShipmentStateMicroService } from "../../functions/sendToShipmentStateMicroService.js";
import { updateLastShipmentState } from "../../functions/updateLastShipmentState.js";
import mysql from "mysql";
import { insertEnvios } from "../../functions/insertEnvios.js";
import { insertEnviosExteriores } from "../../functions/insertEnviosExteriores.js";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { checkIfExistLogisticAsDriverInExternalCompany } from "../../functions/checkIfExistLogisticAsDriverInExternalCompany.js";
import { informe } from "../../functions/informe.js";

/// Esta funcion se conecta a la base de datos de la empresa externa
/// Checkea si el envio ya fue colectado, entregado o cancelado
/// Busca el chofer que se crea en la vinculacion de logisticas
/// Con ese chofer inserto en envios y envios exteriores de la empresa interna
/// Asigno a la empresa externa
/// Si es autoasignacion, asigno a la empresa interna
/// Actualizo el estado del envio a colectado y envio el estado del envio en los microservicios
export async function handleExternalNoFlex(dbConnection, dataQr, companyId, userId) {
    try {
        const shipmentIdFromDataQr = dataQr.did;

        /// Busco la empresa externa
        const externalCompany = await getCompanyById(dataQr.empresa);

        /// Conecto a la base de datos de la empresa externa
        const dbConfigExt = getProdDbConfig(externalCompany);
        const externalDbConnection = mysql.createConnection(dbConfigExt);
        externalDbConnection.connect();

        /// Chequeo si el envio ya fue colectado, entregado o cancelado
        const check = await checkearEstadoEnvio(externalDbConnection, shipmentIdFromDataQr);
        if (check) {
            externalDbConnection.end();

            return check;
        }

        const companyClientList = await getClientsByCompany(externalDbConnection, externalCompany);
        const client = companyClientList[dataQr.cliente];

        const internalCompany = await getCompanyById(companyId);
        

        /// Busco el chofer que se crea en la vinculacion de logisticas
        const driver = await checkIfExistLogisticAsDriverInExternalCompany(externalDbConnection, internalCompany.codigo);
        const consulta = 'SELECT didLocal FROM envios_exteriores WHERE didExterno = ?';
        let didinterno = await executeQuery(dbConnection, consulta, [dataQr.did]);

        // Verificamos si hay resultados y si la propiedad 'didLocal' existe
        if (didinterno.length > 0 && didinterno[0]?.didLocal) {
            didinterno = didinterno[0].didLocal;
            console.log(didinterno, "didinterno");
        } else {
            didinterno = null
        }
        if(didinterno == null){
        /// Inserto en envios en la empresa interna
         didinterno = await insertEnvios(
            dbConnection,
            companyId,
            client.did,
            0,
            { id: "", sender_id: "" },
            0,
            1,
            driver
        );
    }
        /// Inserto en envios exteriores en la empresa interna
        await insertEnviosExteriores(
            dbConnection,
            didinterno,
            shipmentIdFromDataQr,
            0,
            client.nombre || "",
            externalCompany.did,
        );

        // Asigno a la empresa externa
       

        await updateLastShipmentState(dbConnection, didinterno);
        await sendToShipmentStateMicroService(companyId, userId, didinterno);

        await updateLastShipmentState(externalDbConnection, shipmentIdFromDataQr);
        await sendToShipmentStateMicroService(dataQr.empresa, driver, shipmentIdFromDataQr);


        externalDbConnection.end();

        const body = await informe(dbConnection, userId);
        return { estadoRespuesta: true, mensaje: "Paquete puesto a planta  con exito", body: body };
    } catch (error) {
        console.error("Error en handleExternalNoFlex:", error);
        throw error;
    }
}