class MicroserviciosEstado {
    constructor(timeoutMs = 60000) {
        this.microserviciosEstadoCaido = false;
        this.timeoutMs = timeoutMs;
        this._timer = null;
    }

    setEstado(valor) {
        if (valor === true) {
            // Si ya está en true, no reiniciamos el timer
            if (this.microserviciosEstadoCaido) return;

            this.microserviciosEstadoCaido = true;

            // Arranca el contador
            this._timer = setTimeout(() => {
                this.microserviciosEstadoCaido = false;
                this._timer = null;
            }, this.timeoutMs);

        } else {
            // Si lo ponen manualmente en false, limpiamos el timer
            this.microserviciosEstadoCaido = false;

            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }
        }
    }

    getEstado() {
        return this.microserviciosEstadoCaido;
    }
}

// 👉 Exportamos UNA sola instancia (singleton)
export const microserviciosEstado = new MicroserviciosEstado();
