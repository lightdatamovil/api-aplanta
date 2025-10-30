import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";
import { informe } from "../../functions/informe.js";
import { altaEnvioBasica, checkIfFulfillment, EstadosEnvio, LightdataORM, sendShipmentStateToStateMicroserviceAPI } from "lightdata-tools";
import { urlEstadosMicroservice, urlAltaEnvioMicroservice, axiosInstance, queueEstadosML, urlAltaEnvioRedisMicroservice, rabbitService } from "../../../../db.js";

export async function handleInternalFlex({ db, req, company, senderId, account }) {
  const { dataQr, latitude, longitude } = req.body;
  const { userId } = req.user;

  const mlShipmentId = dataQr.id;

  await checkIfFulfillment({ db, mlShipmentId });

  let [rowEnvio] = LightdataORM.select({
    dbConnection: db,
    table: 'envios',
    where: {
      ml_shipment_id: mlShipmentId,
      ml_vendedor_id: senderId,
    },
  });

  let shipmentId = rowEnvio.length > 0 ? rowEnvio.did : null;
  let didCliente = rowEnvio.length > 0 ? rowEnvio.didCliente : null;
  let mlQrSeguridad = rowEnvio.length > 0 ? rowEnvio.ml_qr_seguridad : null;

  if (rowEnvio) {
    const check = await checkearEstadoEnvio({ db, shipmentId });
    if (check) return check;
  } else {
    shipmentId = await altaEnvioBasica({
      urlAltaEnvioMicroservice,
      urlAltaEnvioRedisMicroservice,
      axiosInstance,
      rabbitServiceInstance: rabbitService,
      queueEstadosML,
      company,
      clientId: account.didCliente,
      accountId: account.didCuenta,
      dataQr,
      flex: 1,
      externo: 0,
      userId,
      driverId: userId,
      lote: "colecta",
    });

    [rowEnvio] = await LightdataORM.select({
      dbConnection: db,
      table: 'envios',
      where: {
        ml_shipment_id: mlShipmentId,
        ml_vendedor_id: senderId,
      },
    });
  }

  shipmentId = rowEnvio.did;
  didCliente = rowEnvio.didCliente;
  mlQrSeguridad = rowEnvio.ml_qr_seguridad;

  if (!mlQrSeguridad) {
    await LightdataORM.update({
      dbConnection: db,
      table: 'envios',
      where: {
        did: shipmentId
      },
      values: {
        ml_qr_seguridad: JSON.stringify(dataQr)
      }
    });
  }

  await sendShipmentStateToStateMicroserviceAPI({
    urlEstadosMicroservice,
    axiosInstance,
    company,
    userId,
    shipmentId,
    estado: EstadosEnvio.value(EstadosEnvio.atProcessingPlant, company.did),
    latitude,
    longitude,
    desde: "A planta API",
  });

  const body = await informe({
    db,
    company,
    clientId: company.did == 144 || company.did == 167 ? didCliente : (account.didCliente || didCliente),
    userId,
    shipmentId
  });

  return {
    success: true,
    message: "Paquete insertado y puesto a planta  - FLEX",
    body,
  };
}