import { logPurple } from "./logsCustom.js";

export const configPaises = {
    1: { tz: 'America/Argentina/Buenos_Aires', locale: 'es-AR' },
    2: { tz: 'America/Santiago', locale: 'es-CL' },
    3: { tz: 'America/Sao_Paulo', locale: 'pt-BR' },
    4: { tz: 'America/Montevideo', locale: 'es-UY' },
    5: { tz: 'America/Bogota', locale: 'es-CO' },
    6: { tz: 'America/Mexico_City', locale: 'es-MX' },
    7: { tz: 'America/Lima', locale: 'es-PE' },
    8: { tz: 'America/Guayaquil', locale: 'es-EC' },
};

export function getFechaConHoraLocalDePais(idPais) {
    logPurple(`getFechaConHoraLocalDePais called for country ID: ${idPais}`);
    const conf = configPaises[idPais];
    if (!conf) {
        logPurple(`No configuration found for country ID: ${idPais}`);
        return null;
    }
    if (!conf) return null;

    const now = new Date();

    const parts = new Intl.DateTimeFormat(conf.locale, {
        timeZone: conf.tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(now);

    const get = (type) => parts.find(p => p.type === type)?.value;

    const dia = get('day');
    const mes = get('month');
    const año = get('year');
    const hora = get('hour');
    const minuto = get('minute');
    const segundo = get('second');
    logPurple(`Formatted date: ${dia}/${mes}/${año} ${hora}:${minuto}:${segundo}`);
    return `${año}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}