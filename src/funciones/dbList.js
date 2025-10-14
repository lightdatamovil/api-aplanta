// src/metrics/dbActiveLocal.js
// Contador local por proceso: { [did]: count }
const activeDbConns = Object.create(null);

export function incrActiveLocal(did) {
    const key = String(did);
    activeDbConns[key] = (activeDbConns[key] || 0) + 1;
    return activeDbConns[key];
}

export function decrActiveLocal(did) {
    const key = String(did);
    if (!activeDbConns[key]) return 0;
    const next = activeDbConns[key] - 1;
    if (next <= 0) {
        delete activeDbConns[key];
        return 0;
    }
    activeDbConns[key] = next;
    return next;
}

export function getAllActiveLocal() {
    // devuelve { "1": 20, "164": 3 }
    return { ...activeDbConns };
}
