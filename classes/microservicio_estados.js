class MicroservicioEstados {
    constructor(timeoutMs = 60000) {
        this.estado = true;
        this.timeoutMs = timeoutMs;
        this._timer = null;
    }

    setEstadoCaido() {
        this.estado = false;
        this._timer = setTimeout(() => {
            this.estado = true;
            this._timer = null;
        }, this.timeoutMs);
    }

    estaCaido() {
        return this.estado == false;
    }
}

export const microservicioEstados = new MicroservicioEstados();
