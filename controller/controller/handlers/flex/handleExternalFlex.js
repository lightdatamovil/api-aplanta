import {
  executeQuery,
  getProdDbConfig,
  getCompanyByCode,
} from "../../../../db.js";

import mysql2 from "mysql2";
import { insertEnvios } from "../../functions/insertEnvios.js";
import { insertEnviosExteriores } from "../../functions/insertEnviosExteriores.js";
import { sendToShipmentStateMicroService } from "../../functions/sendToShipmentStateMicroService.js";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { checkIfExistLogisticAsDriverInExternalCompany } from "../../functions/checkIfExistLogisticAsDriverInExternalCompany.js";
import { informe } from "../../functions/informe.js";
import { logCyan } from "../../../../src/funciones/logsCustom.js";
import { assign } from "../../functions/assing.js";
import { insertEnviosLogisticaInversa } from "../../functions/insertLogisticaInversa.js";
import CustomException from "../../../../classes/custom_exception.js";
import { checkIfFulfillment } from "../../../../src/funciones/checkIfFulfillment.js";

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
  const mlShipmentId = dataQr.id;
  await checkIfFulfillment(dbConnection, mlShipmentId);
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
    queryLogisticasExternas, []
  );
  logCyan("Me traigo las logisticas externas");
  if (logisticasExternas.length == 0) {
    throw new CustomException({
      title: "No se encontraron logísticas externas",
      message: "No se encontraron logísticas externas",
      stack: ''
    });
  }
  /// Por cada logística externa
  for (const logistica of logisticasExternas) {
    logCyan(`logistica externa actual: ${logistica.nombre_fantasia}`);
    const externalLogisticId = logistica.did;
    const nombreFantasia = logistica.nombre_fantasia;
    const syncCode = logistica.codigoVinculacionLogE;

    const externalCompany = await getCompanyByCode(syncCode);
    const externalCompanyId = externalCompany.did;

    const dbConfigExt = getProdDbConfig(externalCompany);
    const externalDbConnection = mysql2.createConnection(dbConfigExt);

    try {
      externalDbConnection.connect();

      const sqlEnvios = `
        SELECT did
        FROM envios 
        WHERE ml_shipment_id = ? AND ml_vendedor_id = ? 
        LIMIT 1
      `;
      let rowsEnvios = await executeQuery(
        externalDbConnection,
        sqlEnvios,
        [mlShipmentId, senderid],
        true
      );

      const driver = await checkIfExistLogisticAsDriverInExternalCompany(
        externalDbConnection,
        codLocal
      );

      let externalShipmentId;

      if (rowsEnvios.length > 0) {
        externalShipmentId = rowsEnvios[0].did;
        logCyan("Encontre el envio en la logistica externa");
      } else {
        logCyan("No encontre el envio en la logistica externa");
        const sqlCuentas = `
          SELECT did, didCliente 
          FROM clientes_cuentas 
          WHERE superado = 0 AND elim = 0 AND tipoCuenta = 1 AND ML_id_vendedor = ?
        `;
        const rowsCuentas = await executeQuery(externalDbConnection, sqlCuentas, [
          senderid,
        ]);

        if (rowsCuentas.length == 0) {
          logCyan("No se encontró cuenta asociada, paso a la siguiente logística");
          continue; // <- se va al finally igual
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

      const check = await checkearEstadoEnvio(
        externalDbConnection,
        externalShipmentId
      );

      if (check) {
        return check;
      }

      logCyan("El envio no fue colectado cancelado o entregado");

      const consulta =
        "SELECT didLocal FROM envios_exteriores WHERE didExterno = ?";
      let internalShipmentId = await executeQuery(dbConnection, consulta, [
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
          userId
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

      await sendToShipmentStateMicroService(
        company.did,
        userId,
        internalShipmentId
      );
      logCyan("Actualice el estado del envio y lo envie al microservicio de estados en la logistica interna");

      await sendToShipmentStateMicroService(
        externalCompanyId,
        driver,
        externalShipmentId
      );
      logCyan("Actualice el estado del envio y lo envie al microservicio de estados en la logistica externa");

      const dqrext = {
        did: externalShipmentId,
        empresa: externalCompanyId,
        local: 1,
        cliente: externalLogisticId,
      };

      logCyan("Voy a asignar el envio en la logistica interna");
      await assign(externalCompanyId, userId, 0, dqrext, userId);

      const resultInforme = await informe(
        dbConnection,
        company.did,
        userId,
        userId,
        internalShipmentId
      );

      return {
        success: true,
        message: "Paquete puesto a planta correctamente - FLEX",
        body: resultInforme,
      };

    } catch (error) {
      logCyan(`Error en la logística externa: ${error.message}`);
      throw new CustomException({
        title: "Error en la logística externa",
        message: error.message,
        stack: error.stack,
      });
    } finally {
      externalDbConnection.end(); // Se ejecuta SIEMPRE
    }
  }
  return {
    success: false,
    message: "No se encontró cuenta asociada",
  };
}