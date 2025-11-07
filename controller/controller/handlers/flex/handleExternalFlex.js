import { checkIfExistLogisticAsDriverInDueñaCompany } from "../../functions/checkIfExistLogisticAsDriverInDueñaCompany.js";
import { informe } from "../../functions/informe.js";
import { altaEnvioBasica, assign, checkIfFulfillment, connectMySQL, CustomException, EstadosEnvio, executeQuery, getProductionDbConfig, LightdataORM, sendShipmentStateToStateMicroserviceAPI } from "lightdata-tools";
import { companiesService, hostProductionDb, portProductionDb, urlEstadosMicroservice, queueEstadosML, urlAsignacionMicroservice, urlAltaEnvioMicroservice, urlAltaEnvioRedisMicroservice, rabbitService, axiosInstance } from "../../../../db.js";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";

export async function handleExternalFlex({ db, req, company }) {
  const { dataQr, latitude, longitude } = req.body;
  const { userId } = req.user;

  const senderid = dataQr.sender_id;
  const shipmentId = dataQr.id;
  const codLocal = company.codigo;

  await checkIfFulfillment({ db, shipmentId });

  const queryLogisticasExternas = `
            SELECT did, nombre_fantasia, codigoVinculacionLogE 
            FROM clientes 
            WHERE superado = 0 AND elim = 0 AND codigoVinculacionLogE != ''
        `;
  const logisticasExternas = await executeQuery({
    db,
    query: queryLogisticasExternas
  });

  if (logisticasExternas.length == 0) {
    throw new CustomException({
      title: "No se encontraron logísticas externas",
      message: "No se encontro cuenta asociada",
      stack: ''
    });

  }

  for (const logistica of logisticasExternas) {
    if (logistica.did == undefined) {
      throw new CustomException({
        title: `La logística está mal vinculada`,
        message: `La logística externa vinculada a la cuenta de ML: ${dataQr.sender_id} está mal vinculada`,
      });
    }

    const externalLogisticId = logistica.did;
    const nombreFantasia = logistica.nombre_fantasia;
    const syncCode = logistica.codigoVinculacionLogE;

    const externalCompany = await companiesService.getCompanyByCode(syncCode);
    const externalCompanyId = externalCompany.did;

    const dbConfigExt = getProductionDbConfig({
      host: hostProductionDb,
      port: portProductionDb,
      company: externalCompany
    });

    const dbDueña = await connectMySQL(dbConfigExt);

    try {
      const driver = await checkIfExistLogisticAsDriverInDueñaCompany({
        db: dbDueña,
        syncCode: codLocal
      });

      if (!driver) {
        continue;
      }

      const [rowsEnvios] = await LightdataORM.select({
        db: dbDueña,
        table: 'envios',
        where: {
          ml_shipment_id: shipmentId,
          ml_vendedor_id: senderid
        },
        select: ['did', 'didCliente']
      });

      let externalShipmentId;

      if (rowsEnvios.length > 0) {
        externalShipmentId = rowsEnvios.did;
        const check = await checkearEstadoEnvio({
          db: dbDueña,
          shipmentId: externalShipmentId
        });
        if (check) return check;
      } else {
        const rowsCuentas = await LightdataORM.select({
          db: dbDueña,
          table: 'clientes_cuentas',
          where: { ML_id_vendedor: senderid, tipoCuenta: 1 },
          select: ['did', 'didCliente']
        });

        if (rowsCuentas.length == 0) {
          continue;
        }

        const externalClientId = rowsCuentas.didCliente;
        const didcuenta_ext = rowsCuentas.did;

        externalShipmentId = await altaEnvioBasica({
          urlAltaEnvioMicroservice,
          urlAltaEnvioRedisMicroservice,
          axiosInstance,
          rabbitServiceInstance: rabbitService,
          queueEstadosML,
          externalCompany,
          clientId: externalClientId,
          accountId: didcuenta_ext,
          dataQr,
          flex: 1,
          externo: 0,
          userId,
          driverId: driver,
          lote: "aplanta",
        });
      }

      let [internalShipmentId] = await LightdataORM.select({
        db,
        table: 'envios_exteriores',
        where: { didExterno: externalShipmentId },
        select: ['didLocal']
      });

      if (internalShipmentId) {
        internalShipmentId = internalShipmentId.didLocal;
      } else {
        internalShipmentId = await altaEnvioBasica({
          urlAltaEnvioMicroservice,
          urlAltaEnvioRedisMicroservice,
          axiosInstance,
          rabbitServiceInstance: rabbitService,
          queueEstadosML,
          company,
          clientId: 0,
          accountId: externalLogisticId,
          dataQr,
          flex: 1,
          externo: 1,
          userId,
          driverId: driver,
          lote: "aplanta",
          didExterno: externalShipmentId,
          nombreClienteEnEmpresaDueña: nombreFantasia,
          empresaDueña: externalCompanyId,
        });
      }

      const [rowLogisticaInversa] = await LightdataORM.select({
        db: dbDueña,
        table: "envios_logisticainversa",
        where: { didEnvio: externalShipmentId },
        select: ["valor"],
      });

      if (rowLogisticaInversa) {
        await LightdataORM.insert({
          db,
          table: "envios_logisticainversa",
          data: {
            didEnvio: internalShipmentId,
            didCampoLogistica: 1,
            valor: rowLogisticaInversa.valor,
          },
          quien: userId,
        });
      }

      await sendShipmentStateToStateMicroserviceAPI({
        urlEstadosMicroservice,
        axiosInstance,
        company,
        userId,
        shipmentId: internalShipmentId,
        estado: EstadosEnvio.value(EstadosEnvio.atProcessingPlant, company.did),
        latitude,
        longitude,
        desde: 'aplanta'
      });

      await sendShipmentStateToStateMicroserviceAPI({
        urlEstadosMicroservice,
        axiosInstance,
        externalCompany,
        driver,
        shipmentId: externalShipmentId,
        estado: EstadosEnvio.value(EstadosEnvio.atProcessingPlant, externalCompany.did),
        latitude,
        longitude,
        desde: 'aplanta'
      });

      const dqrext = {
        did: externalShipmentId,
        empresa: externalCompanyId,
        local: 1,
        cliente: externalLogisticId,
      };


      await assign({
        req,
        urlAsignacionMicroservice,
        dataQr: dqrext,
        driverId: driver,
        desde: 'colecta'
      });

      const [internalClient] = await LightdataORM.select({
        db,
        table: 'envios',
        where: { did: internalShipmentId },
        select: ['didCliente'],
        throwIfNotExists: true
      });

      const resultInforme = await informe({
        db,
        company,
        userId,
        clientId: internalClient.didCliente,
        internalShipmentId
      });

      return {
        success: true,
        message: "Paquete puesto a planta correctamente - FLEX",
        body: resultInforme,
      };
    } catch (error) {
      throw new CustomException({
        title: `Error al procesar la logística externa ${nombreFantasia}`,
        message: error.message,
      });
    } finally {
      if (dbDueña) await dbDueña.end();
    }
  }
  return {
    success: false,
    message: "No se encontró cuenta asociada",
  };
}