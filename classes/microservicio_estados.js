export class MicroservicioEstadosService {
    constructor(timeoutMs = 420000, axiosInstance, url) {
        this.axiosInstance = axiosInstance;
        this.url = url;
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

    async sendEstadoAPI(message) {
        await this.axiosInstance.post(this.url, message);
    }
}
