import express, { json, urlencoded } from 'express';
import a_planta from './routes/aplanta.js';
import { jwtSecret, jwtIssuer, jwtAudience, redisClient } from './db.js';
import cors from 'cors';
import clear from './routes/clearClient.js';
import { logBlue, Status, verifyToken } from 'lightdata-tools';

const app = express();

app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));
app.use(json());
app.use(cors());

const PORT = process.env.PORT;

app.use("/client", clear)
app.use(verifyToken({ jwtSecret, jwtIssuer, jwtAudience }));
app.use("/api", a_planta)
app.get('/ping', (req, res) => {
  const currentDate = new Date();
  currentDate.setHours(currentDate.getHours());
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');

  const formattedTime = `${hours}:${minutes}:${seconds}`;

  res.status(Status.ok).json({
    hora: formattedTime
  });
});

await redisClient.connect();

app.listen(PORT, () => {
  logBlue(`Servidor corriendo en el puerto ${PORT}`);
});
