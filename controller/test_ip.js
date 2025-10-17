// controller/test.js
import axios from "axios";
import { performance } from "node:perf_hooks";

const client = axios.create({
    baseURL: "http://10.70.0.71:13000",   // IP interna
    timeout: 10000,
});

const clientAnterior = axios.create({
    baseURL: "http://asignaciones.lightdata.app", // dominio anterior
    timeout: 10000,
});

// Helper para medir un GET y devolver métricas
async function medirGet(client, path, label) {
    const t0 = performance.now();
    try {
        const resp = await client.get(path);
        const t1 = performance.now();
        const ms = t1 - t0;

        // imprimir en consola
        console.log(`[${label}] status=${resp.status} time=${ms.toFixed(1)}ms`);

        return {
            label,
            ok: true,
            status: resp.status,
            ms,
            data: resp.data,
        };
    } catch (err) {
        const t1 = performance.now();
        const ms = t1 - t0;
        const status = err.response?.status ?? null;
        const message = err.response?.data?.message || err.message;

        // imprimir en consola
        console.log(`[${label}] ERROR status=${status ?? "n/a"} time=${ms.toFixed(1)}ms msg=${message}`);

        return {
            label,
            ok: false,
            status,
            ms,
            error: message,
        };
    }
}

export async function obtenerEstadoComparado() {
    // Cambiá el path si corresponde ("/test" o "/estados")
    const path = "/ping";

    // En paralelo para comparar “fair”
    const [ipResult, anteriorResult] = await Promise.all([
        medirGet(client, path, "IP(10.70.0.69:13000)"),
        medirGet(clientAnterior, path, "Dominio(serverestado.lightdata.app)"),
    ]);

    // devolver ambos resultados
    return {
        data: {

            ip: ipResult,
            anterior: anteriorResult,

        },
        status: 200
    };
}
