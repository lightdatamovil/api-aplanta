import { executeQuery } from "../../../../db.js";

import { insertEnvios } from "../../functions/insertEnvios.js";
import { sendToShipmentStateMicroService } from "../../functions/sendToShipmentStateMicroService.js";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { informe } from "../../functions/informe.js";
import { logCyan } from "../../../../src/funciones/logsCustom.js";
import { checkIfFulfillment } from "../../../../src/funciones/checkIfFulfillment.js";

/// Busco el envio
/// Si no existe, lo inserto y tomo el did
/// Checkeo si el envío ya fue colectado cancelado o entregado
/// Actualizo el estado del envío y lo envío al microservicio de estados
/// Asigno el envío al usuario si es necesario
export async function handleInternalFlex(
  dbConnection,
  companyId,
  userId,
  dataQr,
  account,
  senderId
) {
  const mlShipmentId = dataQr.id;
  await checkIfFulfillment(dbConnection, mlShipmentId);

  let shipmentId;

  /// Busco el envio
  const sql = `
        SELECT did,didCLiente
        FROM envios 
        WHERE ml_shipment_id = ? AND ml_vendedor_id = ? and superado = 0 and elim = 0
        LIMIT 1
    `;

  let resultBuscarEnvio = await executeQuery(dbConnection, sql, [
    mlShipmentId,
    senderId,
  ]);

  let didCLiente = resultBuscarEnvio[0]?.didCLiente || 0;

  /// Si no existe, lo inserto y tomo el did
  if (resultBuscarEnvio.length === 0) {
    shipmentId = await insertEnvios(
      dbConnection,
      companyId,
      account.didCliente,
      account.didCuenta,
      dataQr,
      1,
      0,
      userId,
    );
    resultBuscarEnvio = await executeQuery(dbConnection, sql, [
      mlShipmentId,
      senderId,
    ]);
    logCyan("Inserte el envio");
  } else {
    logCyan("Encontre el envio");
  }

  const row = resultBuscarEnvio[0];

  shipmentId = row.did;


  /// Checkeo si el envío ya fue colectado cancelado o entregado
  const check = await checkearEstadoEnvio(dbConnection, shipmentId);
  if (check) return check;
  logCyan("El envio no fue colectado cancelado o entregado");

  const queryUpdateEnvios = `
                UPDATE envios 
                SET ml_qr_seguridad = ?
                WHERE superado = 0 AND elim = 0 AND did = ?
                LIMIT 1
            `;

  await executeQuery(dbConnection, queryUpdateEnvios, [
    JSON.stringify(dataQr),
    shipmentId,
  ]);
  logCyan("Actualice el ml_qr_seguridad del envio");

  /// Actualizo el estado del envío y lo envío al microservicio de estados

  await sendToShipmentStateMicroService(companyId, userId, shipmentId);
  logCyan(
    "Actualice el estado del envio y lo envie al microservicio de estados"
  );

  if (companyId == 144) {
    const body = await informe(
      dbConnection,
      companyId,
      didCLiente,
      userId,
      shipmentId
    );
    return {
      success: true,
      message: "Paquete insertado y puesto a planta  - FLEX",
      body: body,
    };

  }
  const body = await informe(
    dbConnection,
    companyId,
    account.didCliente || didCLiente,
    userId,
    shipmentId
  );
  return {
    success: true,
    message: "Paquete insertado y puesto a planta  - FLEX",
    body: body,
  };
}
