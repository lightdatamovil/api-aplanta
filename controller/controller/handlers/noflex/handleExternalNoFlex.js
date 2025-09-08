import mysql2 from "mysql2";
import { insertEnvios } from "../../functions/insertEnvios.js";
import { insertEnviosExteriores } from "../../functions/insertEnviosExteriores.js";
import { checkIfExistLogisticAsDriverInExternalCompany } from "../../functions/checkIfExistLogisticAsDriverInExternalCompany.js";
import { informe } from "../../functions/informe.js";
import { insertEnviosLogisticaInversa } from "../../functions/insertLogisticaInversa.js";
import { assign, executeQuery, getProductionDbConfig, logCyan, sendShipmentStateToStateMicroserviceAPI } from "lightdata-tools";
import { companiesService, urlEstadosMicroservice } from "../../../../db.js";

/// Esta funcion se conecta a la base de datos de la empresa externa
/// Checkea si el envio ya fue colectado, entregado o cancelado
/// Busca el chofer que se crea en la vinculacion de logisticas
/// Con ese chofer inserto en envios y envios exteriores de la empresa interna
/// Asigno a la empresa externa
/// Si es autoasignacion, asigno a la empresa interna
/// Actualizo el estado del envio a colectado y envio el estado del envio en los microservicios
export async function handleExternalNoFlex(
    dbConnection,
    dataQr,
    company,
    userId
) {
    const companyId = company.did;
    const shipmentIdFromDataQr = dataQr.did;

    const clientIdFromDataQr = dataQr.cliente;

    /// Busco la empresa externa
    const externalCompany = await companiesService.getCompanyById(dataQr.empresa);

    /// Conecto a la base de datos de la empresa externa
    const dbConfigExt = getProductionDbConfig(externalCompany);
    const externalDbConnection = mysql2.createConnection(dbConfigExt);
    externalDbConnection.connect();

    /// Chequeo si el envio ya fue colectado, entregado o cancelado
    //! Se comento porque si el paquete estaba en aplanta en la empresa que da el paquete, no se podia ingresar en la que se lo recibe
    // const check = await checkearEstadoEnvio(externalDbConnection, shipmentIdFromDataQr);
    // if (check) {
    //     externalDbConnection.end();

    //     return check;
    // }
    logCyan("El envio no es colectado, entregado o cancelado");

    const companyClientList = await companiesService.getClientsByCompany(externalDbConnection, externalCompany.did);
    const client = companyClientList[clientIdFromDataQr];

    const internalCompany = await companiesService.getCompanyById(companyId);

    /// Busco el chofer que se crea en la vinculacion de logisticas
    const driver = await checkIfExistLogisticAsDriverInExternalCompany(externalDbConnection, internalCompany.codigo);

    if (!driver) {
        externalDbConnection.end();

        return { success: false, message: "No se encontró chofer asignado" };
    }
    logCyan("Se encontró la logistica como chofer en la logistica externa");

    let internalShipmentId;

    const consulta = 'SELECT didLocal FROM envios_exteriores WHERE didExterno = ? and superado = 0 and elim = 0 LIMIT 1';

    internalShipmentId = await executeQuery(dbConnection, consulta, [shipmentIdFromDataQr]);

    const queryClient = `
            SELECT did 
            FROM clientes WHERE codigoVinculacionLogE = ?
        `;
    const externalClient = await executeQuery(dbConnection, queryClient, [externalCompany.codigo]);
    if (internalShipmentId.length > 0 && internalShipmentId[0]?.didLocal) {
        internalShipmentId = internalShipmentId[0].didLocal;
        logCyan("Se encontró el didLocal en envios_exteriores");
    } else {
        internalShipmentId = await insertEnvios(
            dbConnection,
            companyId,
            externalClient[0].did,
            0,
            { id: "", sender_id: "" },
            0,
            1,
            0,
            userId
        );
        logCyan("Inserté en envios");
    }

    /// Inserto en envios exteriores en la empresa interna
    await insertEnviosExteriores(
        dbConnection,
        internalShipmentId,
        shipmentIdFromDataQr,
        0,
        client.nombre || "",
        externalCompany.did,
    );
    logCyan("Inserté en envios exteriores");


    const check2 = "SELECT valor FROM envios_logisticainversa WHERE didEnvio = ?";

    const rows = await executeQuery(
        externalDbConnection,
        check2,
        [shipmentIdFromDataQr],
        true
    );
    if (rows.length > 0) {
        await insertEnviosLogisticaInversa(
            dbConnection,
            internalShipmentId,
            rows[0].valor,
            userId,
        );
    }

    await sendShipmentStateToStateMicroserviceAPI(
        urlEstadosMicroservice,
        company,
        userId,
        internalShipmentId,
        1
    );
    logCyan("Actualicé el estado del envio a colectado y envié el estado del envio en los microservicios internos");
    const companyFromQr = await companiesService.getCompanyById(dataQr.empresa);
    await sendShipmentStateToStateMicroserviceAPI(
        urlEstadosMicroservice,
        companyFromQr,
        driver,
        shipmentIdFromDataQr,
        1
    );
    logCyan("Actualicé el estado del envio a colectado y envié el estado del envio en los microservicios externos");

    logCyan(`Voy a asignar el envio en la logistica interna 2 con driver: ${driver}  jj`);
    await assign(externalCompany.did, userId, 3, dataQr, driver);
    const body = await informe(dbConnection, company, externalClient[0].did, userId, internalShipmentId);

    externalDbConnection.end();

    return { success: true, message: "Paquete puesto a planta  con exito", body: body };
}