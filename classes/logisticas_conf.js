export default class LogisticaConf {

    static tieneBarcode = {
        12: { cliente: 44, empresa: 55 },
        55: { cliente: 184, empresa: 55 },
        211: { cliente: 301, empresa: 211 },
        20: { cliente: 215, empresa: 211 },
        327: { cliente: 15, empresa: 55 },
    };

    static hasBarcodeEnabled(did) {
        return String(did) in this.tieneBarcode;
    }

    static getSenderId(did) {
        return this.tieneBarcode?.[String(did)]?.cliente ?? 0;
    }

    static getEmpresaId(did) {
        return this.tieneBarcode?.[String(did)]?.empresa ?? 0;
    }
}
