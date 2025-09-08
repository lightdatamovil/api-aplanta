import redis from "redis";
import dotenv from "dotenv";
import mysql2 from "mysql2";
import { CompaniesService, logRed } from "lightdata-tools";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

/// Redis para obtener las empresas
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;

/// Base de datos de aplanta
const aplantaDBHost = process.env.APLANTA_DB_HOST;
const aplantaDBPort = process.env.APLANTA_DB_PORT;

/// Usuario y contraseña para los logs de la base de datos de aplanta
const aplantaDbUserForLogs = process.env.APLANTA_DB_USER_FOR_LOGS;
const aplantaDbPasswordForLogs = process.env.APLANTA_DB_PASSWORD_FOR_LOGS;
const aplantaDbNameForLogs = process.env.APLANTA_DB_NAME_FOR_LOGS;

// Produccion
export const hostProductionDb = process.env.PRODUCTION_DB_HOST;
export const portProductionDb = process.env.PRODUCTION_DB_PORT;
export const jwtSecret = process.env.JWT_SECRET;
export const redisClient = redis.createClient({
  socket: {
    host: redisHost,
    port: redisPort,
  },
  password: redisPassword,
});
export const companiesService = new CompaniesService({ redisClient, redisKey: "empresasData" })

redisClient.on("error", (error) => {
  logRed(`Error al conectar con Redis: ${error.stack}`);
});

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
