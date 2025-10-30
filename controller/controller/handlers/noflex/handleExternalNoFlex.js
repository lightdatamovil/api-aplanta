import { checkIfExistLogisticAsDriverInExternalCompany } from "../../functions/checkIfExistLogisticAsDriverInExternalCompany.js";
import { informe } from "../../functions/informe.js";
import { altaEnvioBasica, assign, connectMySQL, CustomException, EstadosEnvio, getProductionDbConfig, LightdataORM, sendShipmentStateToStateMicroserviceAPI } from "lightdata-tools";
import { companiesService, hostProductionDb, portProductionDb, urlEstadosMicroservice, urlAsignacionMicroservice, axiosInstance, urlAltaEnvioMicroservice, queueEstadosML, urlAltaEnvioRedisMicroservice, rabbitService } from "../../../../db.js";
import { checkearEstadoEnvio } from "../../functions/checkarEstadoEnvio.js";

export async function handleExternalNoFlex({ db, req, company }) {
    const { dataQr, latitude, longitude } = req.body;
    const { userId } = req.user;

    const shipmentIdFromDataQr = dataQr.did;
    const clientIdFromDataQr = dataQr.cliente;

    let dbDueña;

    try {
        const [rowEncargadaShipmentId] = await LightdataORM.select({
            dbConnection: db,
            table: "envios_exteriores",
            where: { didExterno: shipmentIdFromDataQr },
            select: ["didLocal"],
        });

        let encargadaShipmentId = rowEncargadaShipmentId.didLocal;

        if (rowEncargadaShipmentId) {
            const estado = await checkearEstadoEnvio({ db, shipmentId: encargadaShipmentId });
            if (estado) return estado;
        }

        const companyDueña = await companiesService.getById(dataQr.empresa);

        const dbConfigExt = getProductionDbConfig({
            host: hostProductionDb,
            port: portProductionDb,
            company: companyDueña,
        });

        dbDueña = await connectMySQL(dbConfigExt);

        const companyClientList = await companiesService.getClientsByCompany({
            db: dbDueña,
            companyId: companyDueña.did
        });

        const client = companyClientList[clientIdFromDataQr];

        const driver = await checkIfExistLogisticAsDriverInExternalCompany({ db: dbDueña, syncCode: company.codigo });

        if (!driver) {
            return { success: false, message: "No se encontró chofer asignado" };
        }

        const [rowDueñaClient] = await LightdataORM.select({
            dbConnection: db,
            table: "clientes",
            where: { codigoVinculacionLogE: companyDueña.codigo },
            select: ["did"],
            throwIfNotExists: true,
        });

        if (rowEncargadaShipmentId) {
            encargadaShipmentId = rowEncargadaShipmentId.didLocal;
        } else {
            encargadaShipmentId = await altaEnvioBasica({
                urlAltaEnvioMicroservice,
                urlAltaEnvioRedisMicroservice,
                axiosInstance,
                rabbitServiceInstance: rabbitService,
                queueEstadosML,
                company,
                clientId: rowDueñaClient.did,
                accountId: 0,
                dataQr,
                flex: 0,
                externo: 1,
                userId,
                driverId: driver,
                lote: "A planta API",
                didExterno: shipmentIdFromDataQr,
                nombreClienteEnEmpresaDueña: client.nombre,
                empresaDueña: companyDueña.did,
            });
        }

        const [rowLogisticaInversa] = await LightdataORM.select({
            dbConnection: dbDueña,
            table: "envios_logisticainversa",
            where: { didEnvio: shipmentIdFromDataQr },
            select: ["valor"],
        });

        if (rowLogisticaInversa) {
            await LightdataORM.insert({
                dbConnection: db,
                table: "envios_logisticainversa",
                data: {
                    didEnvio: encargadaShipmentId,
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
            driverId: userId,
            shipmentId: encargadaShipmentId,
            estado: EstadosEnvio.value(EstadosEnvio.atProcessingPlant, company.did),
            latitude,
            longitude,
            desde: "A Planta App",
        });

        await sendShipmentStateToStateMicroserviceAPI({
            urlEstadosMicroservice,
            axiosInstance,
            company: companyDueña,
            userId,
            driverId: driver,
            shipmentId: shipmentIdFromDataQr,
            estado: EstadosEnvio.value(EstadosEnvio.collected, companyDueña.did),
            latitude,
            longitude,
            desde: "A planta API",
        });

        await assign({
            req,
            axiosInstance,
            url: urlAsignacionMicroservice,
            dataQr: dataQr,
            driverId: driver,
            desde: "A planta API",
        });

        const body = await informe({
            db,
            company,
            clientId: rowDueñaClient.did,
            userId,
            shipmentId: encargadaShipmentId
        });

        return {
            success: true,
            message: "Paquete puesto a planta  con exito",
            body,
        };
    } catch (error) {
        if (error.isAxiosError) throw error;

        throw new CustomException({
            title: "Error al procesar la colecta externa",
            message: error.message || "Error desconocido al procesar la colecta externa.",
        });
    } finally {
        if (dbDueña) await dbDueña.end();
    }
}