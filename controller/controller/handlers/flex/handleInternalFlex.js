import { executeQuery } from "../../../../db.js";

import { insertEnvios } from "../../functions/insertEnvios.js";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { informe } from "../../functions/informe.js";
import { logBlue, logCyan } from "../../../../src/funciones/logsCustom.js";
import { checkIfFulfillment } from "../../../../src/funciones/checkIfFulfillment.js";
import { sendToShipmentStateMicroServiceAPI } from "../../functions/sendToShipmentStateMicroServiceAPI.js";

/// Busco el envio
/// Si no existe, lo inserto y tomo el did
/// Checkeo si el envío ya fue colectado cancelado o entregado
/// Actualizo el estado del envío y lo envío al microservicio de estados
/// Asigno el envío al usuario si es necesario
export async function handleInternalFlex(
  dbConnection,
  company,
  userId,
  dataQr,
  account,
  senderId
) {
  const companyId = company.did;
  const mlShipmentId = dataQr.id;
  const startTime = performance.now();

  logBlue(`Inicio handleInternalFlex - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);
  await checkIfFulfillment(dbConnection, mlShipmentId);
  logBlue(`Fin checkIfFulfillment - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);

  let shipmentId;

  /// Busco el envio
  const sql = `
        SELECT did,didCliente
        FROM envios 
        WHERE ml_shipment_id = ? AND ml_vendedor_id = ? and superado = 0 and elim = 0
        LIMIT 1
    `;

  let resultBuscarEnvio = await executeQuery(dbConnection, sql, [
    mlShipmentId,
    senderId,
  ]);
  logBlue(`Fin executeQuery buscar envio - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);
  const row = resultBuscarEnvio[0];


  /// Si no existe, lo inserto y tomo el did
  if (resultBuscarEnvio.length > 0) {
    logCyan("Encontre el envio");
    shipmentId = row.did;
    /// Checkea si el envio ya fue puesto a planta, entregado, entregado 2da o cancelado
    const check = await checkearEstadoEnvio(dbConnection, shipmentId);
    logBlue(`Fin checkearEstadoEnvio - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);
    if (check) return check;
    logCyan("El envio no fue puesto a planta, entregado, entregado 2da o cancelado");
    const queryUpdateEnvios = `
                UPDATE envios 
                SET ml_qr_seguridad = ?
                WHERE superado = 0 AND elim = 0 AND did = ?
                LIMIT 1
            `;

    await executeQuery(dbConnection, queryUpdateEnvios, [JSON.stringify(dataQr), shipmentId,]);
    logBlue(`Fin executeQuery update envio - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);
    logCyan("Actualice el ml_qr_seguridad del envio");
  } else {
    shipmentId = await insertEnvios(
      dbConnection,
      companyId,
      account.didCliente,
      account.didCuenta,
      dataQr,
      1,
      0,
      0,
      userId,
    );
    logBlue(`Fin insertEnvios - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);
    resultBuscarEnvio = await executeQuery(dbConnection, sql, [
      mlShipmentId,
      senderId,
    ]);
    logBlue(`Fin executeQuery buscar envio 2 - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);
    logCyan("Inserte el envio");
  }

  /// Actualizo el estado del envío y lo envío al microservicio de estados
  await sendToShipmentStateMicroServiceAPI(companyId, userId, shipmentId);
  logBlue(`Fin sendToShipmentStateMicroServiceAPI - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);
  logCyan(
    "Actualice el estado del envio y lo envie al microservicio de estados"
  );

  //! jls 167 tambien usa una cuenta no vinculada -- gonzalo no lo saques
  if (companyId == 144 || companyId == 167) {
    const body = await informe(
      dbConnection,
      company,
      row.didCliente,
      userId,
      shipmentId
    );
    logBlue(`Fin informe2 - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);
    return {
      success: true,
      message: "Paquete insertado y puesto a planta  - FLEX",
      body: body,
    };

  }
  const body = await informe(
    dbConnection,
    company,
    account.didCliente || row.didCliente,
    userId,
    shipmentId
  );
  logBlue(`Fin informe - ${((performance.now() - startTime) / 1000).toFixed(2)} seg`);
  return {
    success: true,
    message: "Paquete insertado y puesto a planta  - FLEX",
    body: body,
  };
}