import express, { json, urlencoded } from 'express';
import a_planta from './route/aplanta.js';
import { redisClient } from './db.js';

const app = express();

app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));
app.use(json());

const PORT = process.env.PORT || 13000;

app.use("/api", a_planta)

await redisClient.connect();

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
