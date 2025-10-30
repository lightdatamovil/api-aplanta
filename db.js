import redis from "redis";
import dotenv from "dotenv";
import mysql2 from 'mysql2/promise';
import https from 'https';
import axios from 'axios';
import { CompaniesService, logRed, RabbitService } from "lightdata-tools";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

const local = process.env.LOCAL;
/// Redis para obtener las empresas
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;

export const redisClient = redis.createClient({
  socket: {
    host: redisHost,
    port: redisPort,
  },
  password: redisPassword,
});

redisClient.on('error', (err) => {
  logRed(`Error al conectar con Redis: ${err.message}`);
});

// Servicio de empresas
export const companiesService = new CompaniesService({ redisClient, redisKey: "empresasData" });

/// Base de datos de aplanta
const aplantaDBHost = process.env.APLANTA_DB_HOST;
const aplantaDBPort = process.env.APLANTA_DB_PORT;

/// Usuario y contraseña para los logs de la base de datos de aplanta
const aplantaDbUserForLogs = process.env.APLANTA_DB_USER_FOR_LOGS;
const aplantaDbPasswordForLogs = process.env.APLANTA_DB_PASSWORD_FOR_LOGS;
const aplantaDbNameForLogs = process.env.APLANTA_DB_NAME_FOR_LOGS;

export const poolLocal = mysql2.createPool({
  host: aplantaDBHost,
  user: aplantaDbUserForLogs,
  password: aplantaDbPasswordForLogs,
  database: aplantaDbNameForLogs,
  port: aplantaDBPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  timeout: 10000,
  family: 4,
});

export const axiosInstance = axios.create({
  httpsAgent,
  timeout: 335000,
});

// Produccion
export const hostProductionDb = process.env.PRODUCTION_DB_HOST;
export const portProductionDb = process.env.PRODUCTION_DB_PORT;

// JWT
export const jwtSecret = process.env.JWT_SECRET;
export const jwtIssuer = process.env.JWT_ISSUER;
export const jwtAudience = process.env.JWT_AUDIENCE;
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';

/// Microservicios y colas
export const rabbitUrl = process.env.RABBITMQ_URL;

export const rabbitService = new RabbitService(rabbitUrl);

export const urlEstadosMicroservice = local == 'true' ? process.env.URL_ESTADOS_MICROSERVICE : process.env.URL_ESTADOS_MICROSERVICE_RED;
export const queueEstados = process.env.QUEUE_ESTADOS;
export const queueEstadosML = process.env.QUEUE_ESTADOS_ML;

/// Microservicio de asignacion
export const urlAsignacionMicroservice = local == 'true' ? process.env.URL_ASIGNACION_MICROSERVICE : process.env.URL_ASIGNACION_MICROSERVICE_RED;

/// Microservicio de alta de envios
export const urlAltaEnvioMicroservice = process.env.URL_ALTA_ENVIO_MICROSERVICE;
export const urlAltaEnvioRedisMicroservice = process.env.URL_ALTA_ENVIO_REDIS_MICROSERVICE;
export const urlApimovilGetShipmentId = process.env.URL_APIMOVIL_GET_SHIPMENT_ID;
