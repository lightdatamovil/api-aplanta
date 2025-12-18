import { connect } from "amqplib";
import CustomException from "./custom_exception.js";
import { logRed } from "../src/funciones/logsCustom.js";

/* ============================================================
   🐇 RabbitMQ Service (instanciable, con conexión propia)
   ============================================================ */
export class RabbitService {
    #rabbitUrl;
    #connection = null;
    #channel = null;

    /**
     * @param {string} rabbitUrl - URL de conexión al servidor RabbitMQ (amqp://user:pass@host)
     */
    constructor(rabbitUrl) {
        if (!rabbitUrl) {
            throw new CustomException({
                title: "Configuración inválida",
                message: "Debe proporcionarse una URL de conexión para RabbitMQ.",
            });
        }

        this.#rabbitUrl = rabbitUrl;
    }

    /**
     * Retorna un canal de RabbitMQ, lo crea si no existe.
     * @param {string} queueName - Nombre de la cola a usar.
     * @returns {Promise<Channel>}
     */
    async getChannel(queueName) {
        if (this.#channel) return this.#channel;

        if (!queueName) {
            throw new CustomException({
                title: "Configuración inválida",
                message: "Debe especificar un nombre de cola para RabbitMQ.",
            });
        }

        try {
            this.#connection = await connect(this.#rabbitUrl);
            this.#channel = await this.#connection.createChannel();
            await this.#channel.assertQueue(queueName, { durable: true });

            // Cierre limpio al terminar el proceso
            process.on("exit", async () => {
                await this.#channel?.close();
                await this.#connection?.close();
            });

            return this.#channel;
        } catch (err) {
            throw new CustomException({
                title: "Error conectando a RabbitMQ",
                message: err.message,
            });
        }
    }

    /**
     * Envía un mensaje a una cola.
     * @param {string} queueName - Nombre de la cola.
     * @param {object} message - Objeto que se enviará.
     */
    async send(queueName, message) {
        const ch = await this.getChannel(queueName);
        const sent = ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
            persistent: true,
        });

        /*
        if (!sent) {
            throw new CustomException({
                title: "Error al enviar a RabbitMQ",
                message: "El buffer de envío está lleno.",
            });
        }
            */
    }


    async close() {
        try {
            await this.#channel?.close();
            await this.#connection?.close();
        } catch (e) {
            logRed(`⚠️ Error cerrando conexión RabbitMQ: ${e.message}`);
        } finally {
            this.#channel = null;
            this.#connection = null;
        }
    }
}
