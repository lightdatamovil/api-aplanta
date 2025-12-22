import { executeQuery } from "../../../../db.js";

import { insertEnvios } from "../../functions/insertEnvios.js";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { informe } from "../../functions/informe.js";
import { checkIfFulfillment } from "../../../../src/funciones/checkIfFulfillment.js";
import { changeState } from "../../functions/changeState.js";

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
  senderId,
  mlShipmentId,
  flex
) {
  let row;

  const companyId = company.did;


  await checkIfFulfillment(dbConnection, mlShipmentId);

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
  row = resultBuscarEnvio[0];


  /// Si no existe, lo inserto y tomo el did
  if (resultBuscarEnvio.length > 0) {
    shipmentId = row.did;
    /// Checkea si el envio ya fue puesto a planta, entregado, entregado 2da o cancelado
    const check = await checkearEstadoEnvio(dbConnection, shipmentId, companyId);
    if (check) return check;
    const queryUpdateEnvios = `
                UPDATE envios 
                SET ml_qr_seguridad = ?
                WHERE superado = 0 AND elim = 0 AND did = ?
                LIMIT 1
            `;

    await executeQuery(dbConnection, queryUpdateEnvios, [JSON.stringify(dataQr), shipmentId,]);
  } else {
    console.log("No encontre el envio, lo inserto");
    // para el caso de que no este vincualdo el cliente 167 o 114, el envio ya debe estar insertado 
    shipmentId = await insertEnvios(
      dbConnection,
      companyId,
      account.didCliente,
      account.didCuenta,
      dataQr,
      flex,
      0,
      0,
      userId,
    );
    resultBuscarEnvio = shipmentId
  }

  /// Actualizo el estado del envío y lo envío al microservicio de estados
  await changeState(companyId, userId, shipmentId, null, null, dbConnection);
  //! jls 167 tambien usa una cuenta no vinculada -- gonzalo no lo saques
  if (companyId == 144 || companyId == 167 || companyId == 114) {
    const body = await informe(
      dbConnection,
      company,
      row.didCliente,
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
    company,
    account.didCliente || row.didCliente,
    userId,
    shipmentId
  );
  return {
    success: true,
    message: "Paquete insertado y puesto a planta  - FLEX",
    body: body,
  };

}