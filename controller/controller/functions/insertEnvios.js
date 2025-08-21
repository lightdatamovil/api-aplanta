import { executeQuery } from '../../../db.js';
import axios from "axios";

export async function insertEnvios(dbConnection, companyId, clientId, accountId, dataQr, flex, externo, driverId, userId) {
    const lote = Math.random().toString(36).substring(2, 15);
    const fecha_actual = new Date();
    fecha_actual.setHours(fecha_actual.getHours() - 3);
    const fecha_inicio = fecha_actual.toISOString().slice(0, 19).replace('T', ' ');
    const idshipment = dataQr.id;
    const senderid = dataQr.sender_id;
    const fechaunix = Math.floor(Date.now() / 1000);

    const queryInsertEnvios = `
            INSERT INTO envios (did, ml_shipment_id, ml_vendedor_id, didCliente, quien, lote, didCuenta, ml_qr_seguridad, fecha_inicio, flex, exterior, fechaunix, choferAsignado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    // !modificacion harcodeo chofer asignado en a planta
    const result = await executeQuery(
        dbConnection,
        queryInsertEnvios,
        [0, idshipment, senderid, clientId, userId, lote, accountId, JSON.stringify(dataQr), fecha_inicio, flex, externo, fechaunix, driverId],
    );

    if (result.insertId) {
        await axios.post(
            'https://altaenvios.lightdata.com.ar/api/enviosMLredis',
            {
                idEmpresa: companyId,
                estado: 1,
                did: result.insertId,
                ml_shipment_id: idshipment,
                ml_vendedor_id: senderid
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            },
        );

        const updateSql = `
                UPDATE envios 
                SET did = ? 
                WHERE superado = 0 AND elim = 0 AND id = ? 
                LIMIT 1
            `;

        await executeQuery(dbConnection, updateSql, [result.insertId, result.insertId]);
    }

    return result.insertId;
}

export async function insertEnviosMicroservicio(
    companyId,
    clientId,
    accountId,
    dataQr,
    flex,
    externo,
    driverId,
    userId
) {
    const lote = "apl";
    const fechaInicio = new Date(Date.now() - 3 * 60 * 60 * 1000)
        .toISOString().slice(0, 19).replace("T", " ");

    // Normaliza campos de dataQr
    const shipmentId = dataQr?.shipmentId ?? dataQr?.id ?? "";
    const senderId = dataQr?.senderId ?? dataQr?.sender_id ?? 0;
    const securityDigit = dataQr?.security_digit ?? "0";

    const payload = {
        data: {
            didCuenta: Number(accountId),
            didCliente: Number(clientId),
            idEmpresa: Number(companyId),
            flex: Number(flex),
            ml_shipment_id: String(shipmentId),
            ml_vendedor_id: Number(senderId),
            ml_qr_seguridad: String(securityDigit),
            lote,
            enviosDireccionesDestino: {},
            fecha_inicio: fechaInicio,
            didDeposito: 1,
            didServicio: 1,
        },
    };

    const url = flex === 1
        ? "https://altaenvios.lightdata.com.ar/api/altaenvioflex"
        : "https://altaenvios.lightdata.com.ar/api/altaenvio";

    console.log("📤 POST ->", url);
    console.dir(payload, { depth: null });

    try {
        const res = await axios.post(url, payload, {
            headers: { "Content-Type": "application/json" },
        });
        console.log("✅ Respuesta:", res.data);
        const insertId = res.data?.did ?? null;

        if (insertId) {
            const redisPayload = {
                idEmpresa: companyId,
                estado: 1,
                did: insertId,
                ml_shipment_id: shipmentId,
                ml_vendedor_id: senderId,
            };
            console.log("📤 Notificando enviosMLredis:", redisPayload);
            await axios.post(
                "https://altaenvios.lightdata.com.ar/api/enviosMLredis",
                redisPayload,
                { headers: { "Content-Type": "application/json" } }
            );
        }

        return insertId;
    } catch (error) {
        console.error("❌ Error microservicio");
        if (error.response) {
            console.error("📥 Status:", error.response.status);
            console.error("📥 Body:", error.response.data);
        } else {
            console.error("📥 Error:", error.message);
        }
        throw error;
    }
}


/**
export async function insertEnviosNoFlexMicroservicio(
    companyId,
    clientId,
    accountId,
    dataQr,
    flex,
    externo,
    driverId,
    userId
) {
    const lote = "apl";  // default si no viene
    const fecha_actual = new Date();
    fecha_actual.setHours(fecha_actual.getHours() - 3);

    const payload = {
        data: {
            didCuenta: Number(accountId),
            didCliente: Number(clientId ?? 0),
            idEmpresa: Number(companyId),
            flex: Number(flex ?? 1),
            ml_shipment_id: String(dataQr?.id ?? ""),
            ml_vendedor_id: Number(dataQr?.sender_id ?? 0),
            ml_qr_seguridad: String(dataQr?.security_digit ?? "0"),
            lote,
            // ! ESTA CLAVE ES OBLIGATORIA
            enviosDireccionesDestino: {
            }
        }
    };

    console.log("📤 Enviando payload al microservicio FLEX (mínimo):");
    console.dir(payload, { depth: null });

    try {
        const result = await axios.post(
            "https://altaenvios.lightdata.com.ar/api/altaenvioflex",
            payload,
            { headers: { "Content-Type": "application/json" } }
        );

        console.log("✅ Respuesta microservicio FLEX:", result.data);

        const insertId = result.data?.did ?? null;

        // Retornamos insertId, que tu endpoint luego usará para construir EnviosFlex
        return insertId;
    } catch (error) {
        console.error("❌ Error en microservicio FLEX");

        if (error.response) {
            console.error("📥 Código de estado:", error.response.status);
            console.error("📥 Respuesta completa:", error.response.data);
        } else {
            console.error("📥 Error:", error.message);
        }

        throw error;
    }
}

export async function insertEnviosFlexMicroservicio(
    companyId,
    clientId,
    accountId,
    dataQr,
    flex,
    externo,
    driverId,
    userId
) {
    const lote = "apl";
    const fecha_actual = new Date();
    fecha_actual.setHours(fecha_actual.getHours() - 3);
    const fecha_inicio = fecha_actual.toISOString().slice(0, 19).replace("T", " ");
    const idshipment = dataQr.id;
    const senderid = dataQr.sender_id;
    const fechaunix = Math.floor(Date.now() / 1000);

    // 🔹 Armamos payload
    const payload = {
        data: {
            // obligatorios mínimos
            didCuenta: accountId,
            didCliente: clientId,
            idEmpresa: companyId,
            flex: flex,
            ml_shipment_id: idshipment,
            ml_vendedor_id: senderid,
            fecha_inicio,
            lote: lote,
            didDeposito: 1, // default
            ff: 0,          // fulfillment default
            ml_venta_id: 0, // default si no lo tenés en dataQr
            didServicio: 1, // default
        }
    }
    console.log("📤 Enviando payload al microservicio:");
    console.dir(payload, { depth: null });

    try {
        // 🔹 Llamada al microservicio principal
        const result = await axios.post(
            "https://altaenvios.lightdata.com.ar/api/altaenvio",
            payload,
            { headers: { "Content-Type": "application/json" } }
        );

        console.log("✅ Respuesta microservicio altaenvio:", result.data);

        const insertId = result.data?.did ?? null;

        if (insertId) {
            // 🔹 Notificación a redis
            const redisPayload = {
                idEmpresa: companyId,
                estado: 1,
                did: insertId,
                ml_shipment_id: idshipment,
                ml_vendedor_id: senderid
            };

            console.log("📤 Enviando a enviosMLredis:", redisPayload);

            await axios.post(
                "https://altaenvios.lightdata.com.ar/api/enviosMLredis",
                redisPayload,
                { headers: { "Content-Type": "application/json" } }
            );

            return insertId;
        }

        return null;
    } catch (error) {
        console.error("❌ Error al llamar al microservicio altaenvio");

        if (error.response) {
            console.error("📥 Código de estado:", error.response.status);
            console.error("📥 Respuesta completa:", error.response.data);
        } else {
            console.error("📥 Error:", error.message);
        }

        throw error; // lo re-lanzo para que lo capture tu handler global
    }
}
 */