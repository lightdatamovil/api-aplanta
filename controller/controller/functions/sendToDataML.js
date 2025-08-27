import { connect } from 'amqplib';
import dotenv from 'dotenv';
import { logCyan, logGreen, logRed, logYellow } from '../../../src/funciones/logsCustom.js';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_ESTADOS = "dataML";

let connection = null;
let channel = null;

async function getChannel() {
    if (channel) return channel;

    try {
        connection = await connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_ESTADOS, { durable: true });

        process.on('exit', () => {
            if (channel) channel.close();
            if (connection) connection.close();
        });

        return channel;
    } catch (err) {
        logRed(`❌ Error al inicializar RabbitMQ: ${err.stack}`);
        throw err;
    }
}

export async function senToDataML(
    companyId,
    didEnvio,
    sellerId,
    shipmentId
) {
    const message = {
        idEmpresa: companyId,
        did: didEnvio,
        sellerId: sellerId,
        shipmentId: shipmentId
    };
    logCyan(`Enviando mensaje a RabbitMQ: ${JSON.stringify(message)}`);
    try {

        logCyan(`Enviando mensaje a RabbitMQ: ${JSON.stringify(message)}`);
        const ch = await getChannel();
        const sent = ch.sendToQueue(
            QUEUE_ESTADOS,
            Buffer.from(JSON.stringify(message)),
            { persistent: true }
        );

        if (sent) {
            logGreen('✅ Mensaje enviado correctamente al microservicio de dataML');
        } else {
            logYellow('⚠️ Mensaje no pudo encolarse (buffer lleno)');
            throw new Error('Buffer lleno en RabbitMQ');
        }
    } catch (error) {
        logRed(`❌ Falló RabbitMQ, intentando enviar por HTTP: ${error.message}`);


    }
}
