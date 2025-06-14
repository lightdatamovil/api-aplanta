import {
  executeQuery,
  getProdDbConfig,
  getCompanyByCode,
} from "../../../../db.js";

import mysql from "mysql";
import { insertEnvios } from "../../functions/insertEnvios.js";
import { insertEnviosExteriores } from "../../functions/insertEnviosExteriores.js";
import { sendToShipmentStateMicroService } from "../../functions/sendToShipmentStateMicroService.js";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { checkIfExistLogisticAsDriverInExternalCompany } from "../../functions/checkIfExistLogisticAsDriverInExternalCompany.js";
import { informe } from "../../functions/informe.js";
import { logCyan, logYellow } from "../../../../src/funciones/logsCustom.js";
import { assign } from "../../functions/assing.js";
import { insertEnviosLogisticaInversa } from "../../functions/insertLogisticaInversa.js";

/// Esta funcion busca las logisticas vinculadas
/// Reviso si el envío ya fue colectado cancelado o entregado en la logística externa
/// Si el envio existe, tomo el did
/// Si no existe, lo inserto y tomo el did
/// Tomo los datos de los clientes de la logística externa para luego insertar los envios
/// Inserto el envio en la tabla envios y envios exteriores de la logística interna
/// Actualizo el estado del envío y lo envío al microservicio de estados en la logística interna
/// Actualizo el estado del envío y lo envío al microservicio de estados en la logística externa
export async function handleExternalFlex(
  dbConnection,
  company,
  dataQr,
  userId
) {
  const senderid = dataQr.sender_id;
  logYellow(`El sender_id es: ${senderid}`);
  const shipmentId = dataQr.id;
  const codLocal = company.codigo;
  // Se llama logisticas y se toman de la tabla de clientes porque al vincularlas se crea un
  // cliente con el código de vinculación
  const queryLogisticasExternas = `
            SELECT did, nombre_fantasia, codigoVinculacionLogE 
            FROM clientes 
            WHERE superado = 0 AND elim = 0 AND codigoVinculacionLogE != ''
        `;
  const logisticasExternas = await executeQuery(
    dbConnection,
    queryLogisticasExternas
  );
  logCyan("Me traigo las logisticas externas");

  /// Por cada logística externa
  for (const logistica of logisticasExternas) {
    logCyan(`logistica externa actual: ${logistica.nombre_fantasia}`);
    const externalLogisticId = logistica.did;
    const nombreFantasia = logistica.nombre_fantasia;
    const syncCode = logistica.codigoVinculacionLogE;
    console.log(syncCode, "syncCode");

    const externalCompany = await getCompanyByCode(syncCode);
    console.log(externalCompany, "llegammos");
    const externalCompanyId = externalCompany.did;

    /// Me conecto a la base de datos de la logística externa
    const dbConfigExt = getProdDbConfig(externalCompany);
    const externalDbConnection = mysql.createConnection(dbConfigExt);
    externalDbConnection.connect();

    /// Busco el envío
    const sqlEnvios = `
                        SELECT did
                        FROM envios 
                        WHERE ml_shipment_id = ? AND ml_vendedor_id = ? 
                        LIMIT 1
                    `;
    let rowsEnvios = await executeQuery(
      externalDbConnection,
      sqlEnvios,
      [shipmentId, senderid],
      true
    );

    const driver = await checkIfExistLogisticAsDriverInExternalCompany(
      externalDbConnection,
      codLocal
    );
    let externalShipmentId;

    /// Si existe el envío, tomo el did
    if (rowsEnvios.length > 0) {
      externalShipmentId = rowsEnvios[0].did;
      logCyan("Encontre el envio en la logistica externa");
      /// Si no existe, lo inserto y tomo el did
    } else {
      logCyan("No encontre el envio en la logistica externa");
      /// Tomo los datos del cliente de la logística externa
      const sqlCuentas = `
                SELECT did, didCliente 
                FROM clientes_cuentas 
                WHERE superado = 0 AND elim = 0 AND tipoCuenta = 1 AND ML_id_vendedor = ?
            `;
      const rowsCuentas = await executeQuery(externalDbConnection, sqlCuentas, [
        senderid,
      ]);

      if (rowsCuentas.length == 0) {
        externalDbConnection.end();

        return { success: false, message: "No se encontró cuenta asociada" };
      }

      const didcliente_ext = rowsCuentas[0].didCliente;
      const didcuenta_ext = rowsCuentas[0].did;

      const result = await insertEnvios(
        externalDbConnection,
        externalCompanyId,
        didcliente_ext,
        didcuenta_ext,
        dataQr,
        1,
        driver
      );

      rowsEnvios = await executeQuery(externalDbConnection, sqlEnvios, [
        result,
        senderid,
      ]);
      logCyan("Inserte el envio en la logistica externa");

      externalShipmentId = rowsEnvios[0].did;
    }

    /// Busco si el chofer está asignado
    const check = await checkearEstadoEnvio(
      externalDbConnection,
      externalShipmentId
    );

    if (check) {
      externalDbConnection.end();

      return check;
    }
    logCyan("El envio no fue colectado cancelado o entregado");
    let internalShipmentId;
    const consulta =
      "SELECT didLocal FROM envios_exteriores WHERE didExterno = ?";

    internalShipmentId = await executeQuery(dbConnection, consulta, [
      externalShipmentId,
    ]);

    if (internalShipmentId.length > 0 && internalShipmentId[0]?.didLocal) {
      internalShipmentId = internalShipmentId[0].didLocal;
      logCyan("Encontre el envio en envios exteriores");
    } else {
      internalShipmentId = await insertEnvios(
        dbConnection,
        company.did,
        externalLogisticId,
        0,
        dataQr,
        1,
        1,
        userId
      );
      logCyan("Inserte el envio en envios");
    }

    const checkLI = "SELECT valor FROM envios_logisticainversa WHERE didEnvio = ?";

    const rows = await executeQuery(
      externalDbConnection,
      checkLI,
      [externalShipmentId],
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


    await insertEnviosExteriores(
      dbConnection,
      internalShipmentId,
      externalShipmentId,
      1,
      nombreFantasia,
      externalCompanyId
    );
    logCyan("Inserte el envio en envios exteriores");

    /// Actualizo el estado del envío y lo envío al microservicio de estados en la logística interna

    await sendToShipmentStateMicroService(
      company.did,
      userId,
      internalShipmentId
    );
    logCyan(
      "Actualice el estado del envio y lo envie al microservicio de estados en la logistica interna"
    );

    /// Actualizo el estado del envío y lo envío al microservicio de estados en la logística externa

    await sendToShipmentStateMicroService(
      externalCompanyId,
      driver,
      externalShipmentId
    );
    logCyan(
      "Actualice el estado del envio y lo envie al microservicio de estados en la logistica externa"
    );
    externalDbConnection.end();
    const dqrext = {
      did: externalShipmentId,
      empresa: externalCompanyId,
      local: 1,
      cliente: externalLogisticId,
    };

    logCyan("Voy a asignar el envio en la logistica interna");
    await assign(externalCompanyId, userId, 0, dqrext, userId);
    const body = await informe(
      dbConnection,
      company.did,
      userId,
      userId,
      internalShipmentId
    );
    return {
      success: true,
      message: "Paquete puesto a planta  correctamente - FLEX",
      body: body,
    };
  }
}
