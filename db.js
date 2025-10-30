import redis from "redis";
import dotenv from "dotenv";
import mysql2 from 'mysql2/promise';
import https from 'https';
import axios from 'axios';
import { CompaniesService, logRed, RabbitService } from "lightdata-tools";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

/// REDIS
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

export const urlApimovilGetShipmentId = process.env.URL_APIMOVIL_GET_SHIPMENT_ID;
/// MICROSERVICIO DE ESTADOS
export const rabbitUrl = process.env.RABBIT_URL;
export const queueEstados = process.env.QUEUE_ESTADOS;
export const urlEstadosMicroservice = process.env.URL_ESTADOS_MICROSERVICE;

// Produccion
export const hostProductionDb = process.env.PRODUCTION_DB_HOST;
export const portProductionDb = process.env.PRODUCTION_DB_PORT;

// JWT
export const jwtSecret = process.env.JWT_SECRET;
export const jwtIssuer = process.env.JWT_ISSUER;
export const jwtAudience = process.env.JWT_AUDIENCE;

// Servicio de empresas
export const companiesService = new CompaniesService({ redisClient, redisKey: "empresasData" })

redisClient.on("error", (error) => {
  logRed(`Error al conectar con Redis: ${error.stack}`);
});

export const rabbitService = new RabbitService(rabbitUrl);