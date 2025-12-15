import { executeQuery, getProdDbConfig, getCompanyByCode } from "../../../../db.js";
import mysql2 from "mysql2";
import { insertEnvios } from "../../functions/insertEnvios.js";
import { insertEnviosExteriores } from "../../functions/insertEnviosExteriores.js";
import { checkIfExistLogisticAsDriverInExternalCompany } from "../../functions/checkIfExistLogisticAsDriverInExternalCompany.js";
import { informe } from "../../functions/informe.js";
import { assign } from "../../functions/assing.js";
import { insertEnviosLogisticaInversa } from "../../functions/insertLogisticaInversa.js";
import CustomException from "../../../../classes/custom_exception.js";
import { checkIfFulfillment } from "../../../../src/funciones/checkIfFulfillment.js";
import { sendToShipmentStateMicroServiceAPI } from "../../functions/sendToShipmentStateMicroServiceAPI.js";


/* Esta funcion busca las logisticas vinculadas
 Reviso si el envío ya fue colectado cancelado o entregado en la logística externa
 Si el envio existe, tomo el did
 Si no existe, lo inserto y tomo el did
 Tomo los datos de los clientes de la logística externa para luego insertar los envios
 Inserto el envio en la tabla envios y envios exteriores de la logística interna
 Actualizo el estado del envío y lo envío al microservicio de estados en la logística interna
 Actualizo el estado del envío y lo envío al microservicio de estados en la logística externa

*/


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
  if (logisticasExternas.length == 0) {
    throw new CustomException({
      title: "No se encontraron logísticas externas",
      message: "No se encontro cuenta asociada",
      stack: ''
    });

  }
  /// Por cada logística externa
  for (const logistica of logisticasExternas) {
    const externalLogisticId = logistica.did;
    const syncCode = logistica.codigoVinculacionLogE;

    const externalCompany = await getCompanyByCode(syncCode);
    const externalCompanyId = externalCompany.did;

    const dbConfigExt = getProdDbConfig(externalCompany);
    const externalDbConnection = mysql2.createConnection(dbConfigExt);
    externalDbConnection.connect();

    try {
      const driver = await checkIfExistLogisticAsDriverInExternalCompany(
        externalDbConnection,
        codLocal
      );

      if (!driver) {
        continue;
      }

      const sqlEnvios = `SELECT did
            FROM envios  WHERE ml_shipment_id = ? AND ml_vendedor_id = ?  and elim = 0 and superado = 0 LIMIT 1  `;
      let rowsEnvios = await executeQuery(externalDbConnection, sqlEnvios, [mlShipmentId, senderid], true);

      let externalShipmentId;

      if (rowsEnvios.length > 0) {
        externalShipmentId = rowsEnvios[0].did;

      } else {
        //? Esto en algun momento puede llegar a funcionar mal si un seller trabaja con 2 logisticas
        const sqlCuentas = `
          SELECT did, didCliente 
          FROM clientes_cuentas 
          WHERE superado = 0 AND elim = 0 AND tipoCuenta = 1 AND ML_id_vendedor = ?
        `;
        const rowsCuentas = await executeQuery(externalDbConnection, sqlCuentas, [senderid]);

        if (rowsCuentas.length == 0) {
          continue;
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
          0,
          driver,
          driver
        );

        externalShipmentId = result;
      }

      let internalShipmentId;
      const consulta =
        "SELECT didLocal FROM envios_exteriores WHERE didExterno = ?  and didEmpresa =  ? and superado = 0 and elim = 0 LIMIT 1";
      internalShipmentId = await executeQuery(dbConnection, consulta, [
        externalShipmentId,
        externalCompanyId
      ], true);

      if (internalShipmentId.length > 0 && internalShipmentId[0]?.didLocal) {
        internalShipmentId = internalShipmentId[0].didLocal;
      } else {

        internalShipmentId = await insertEnvios(
          dbConnection,
          company.did,
          externalLogisticId,
          0,
          dataQr,
          1,
          1,
          0,
          userId
        );


        await insertEnviosExteriores(
          dbConnection,
          internalShipmentId,
          externalShipmentId,
          1,
          "ERROR MOMENTANEO",
          externalCompanyId
        );
      }

      const checkLI = "SELECT valor FROM envios_logisticainversa WHERE didEnvio = ?";
      const rows = await executeQuery(externalDbConnection, checkLI, [externalShipmentId], true);

      if (rows.length > 0) {
        await insertEnviosLogisticaInversa(
          dbConnection,
          internalShipmentId,
          rows[0].valor,
          userId
        );
      }

      await sendToShipmentStateMicroServiceAPI(
        company.did,
        userId,
        internalShipmentId,
        null,
        null,
        dbConnection
      );

      await sendToShipmentStateMicroServiceAPI(
        externalCompanyId,
        driver,
        externalShipmentId,
        null,
        null,
        externalDbConnection
      );

      const dqrext = {
        did: externalShipmentId,
        empresa: externalCompanyId,
        local: 1,
        cliente: externalLogisticId,
      };

      await assign(externalCompanyId, userId, 0, dqrext, driver);
      const queryInternalClient = `
        SELECT didCliente 
        FROM envios 
        WHERE did = ? and elim = 0 and superado=0
      `;
      const internalClient = await executeQuery(
        dbConnection,
        queryInternalClient,
        [internalShipmentId], true
      );
      if (internalClient.length == 0) {
        return {
          success: false,
          message: "No se encontró cliente asociado",
        };
      }
      const resultInforme = await informe(
        dbConnection,
        company,
        internalClient[0].didCliente,
        userId,
        internalShipmentId,
        "ERROR MOMENTANEO"
      );

      return {
        success: true,
        message: "Paquete puesto a planta correctamente - FLEX",
        body: resultInforme,
      };

    } catch (error) {
      throw new CustomException({
        title: "Error en la logística externa",
        message: error.message,
        stack: error.stack,
      });
    } finally {
      externalDbConnection.end();
    }
  }
  return {
    success: false,
    message: "No se encontró cuenta asociada",
  };
}