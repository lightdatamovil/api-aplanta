export default class LogisticaConf {

    static tieneBarcode = {
        20: { empresa_vinculada: 211, seller_id: 215 },
        211: { empresa_vinculada: null, seller_id: 301 },
        12: { empresa_vinculada: 55, seller_id: 44 },
        55: { empresa_vinculada: null, seller_id: 184 },
        327: { empresa_vinculada: 55, seller_id: 15 },
    };

    static existeSioSi = [12];

    static hasBarcodeEnabled(did) {
        return String(did) in this.tieneBarcode;
    }

    static getEmpresaVinculada(did) {
        return this.tieneBarcode?.[String(did)]?.empresa_vinculada ?? null;
    }

    static getSenderId(did) {
        return this.tieneBarcode?.[String(did)]?.seller_id ?? 0;
    }

    static getExisteSioSi(did) {
        return this.existeSioSi.includes(Number(did));
    }
}