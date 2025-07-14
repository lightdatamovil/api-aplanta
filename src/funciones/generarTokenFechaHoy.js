import crypto from 'crypto';

// Función que genera el hash SHA-256 de la fecha actual
export function generarTokenFechaHoy() {
    const ahora = new Date();
    ahora.setHours(ahora.getHours() - 3); // Resta 3 horas

    console.log("📆 Fecha ajustada (UTC-3):", ahora);

    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear();

    const fechaString = `${dia}${mes}${anio}`; // Ej: "11072025"
    const hash = crypto.createHash('sha256').update(fechaString).digest('hex');

    return hash;
}