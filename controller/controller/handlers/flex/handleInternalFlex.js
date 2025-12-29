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
  let ingresado = false;
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
    if (!row) {
      console.log("Entre a insertar flex sin row"
      )

    }

    if (!account) {
      console.log("No se encontró la cuenta para didCliente")
    }
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
    ingresado = true;
    resultBuscarEnvio = shipmentId
  }

  /// Actualizo el estado del envío y lo envío al microservicio de estados
  await changeState(companyId, userId, shipmentId, null, null, dbConnection);
  //! jls 167 tambien usa una cuenta no vinculada -- gonzalo no lo saques
  if (companyId == 144 || companyId == 167 || companyId == 114) {
    if (!row) {
      console.log("No se encontró el row para didCliente")
    }
    const body = await informe(
      dbConnection,
      company,
      account.didCliente,
      userId,
      shipmentId
    );
    return {
      success: true,
      message: `Paquete ${ingresado ? "ingresado y" : ""} puesto a planta`,
      body: body,
    };

  }

  const didCliente =
    account?.didCliente ??
    row?.didCliente;

  if (!didCliente) {
    console.log(JSON.stringify({ account, row }));
  }

  const body = await informe(
    dbConnection,
    company,
    didCliente,
    userId,
    shipmentId
  );
  return {
    success: true,
    message: `Paquete ${ingresado ? "ingresado y" : ""} puesto a planta`,
    body: body,
  };

}