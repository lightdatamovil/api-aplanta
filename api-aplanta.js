import express, { json, urlencoded } from 'express';
import a_planta from './route/aplanta.js';
import { redisClient } from './db.js';
import { logBlue } from './src/funciones/logsCustom.js';
import cors from 'cors';
import clear from './route/clearClient.js';

const app = express();

app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));
app.use(json());
app.use(cors());

const PORT = process.env.PORT;

app.use("/api", a_planta)
app.use("/client", clear)
app.get('/ping', (req, res) => {
  const currentDate = new Date();
  currentDate.setHours(currentDate.getHours()); // Resta 3 horas

  // Formatear la hora en el formato HH:MM:SS
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');

  const formattedTime = `${hours}:${minutes}:${seconds}`;

  res.status(200).json({
    hora: formattedTime
  });
});

await redisClient.connect();

app.listen(PORT, () => {
  logBlue(`Servidor corriendo en el puerto ${PORT}`);
});
