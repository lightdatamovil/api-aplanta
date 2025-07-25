export default class LogisticaConf {

    static tieneBarcode = {
        12: { cliente: 44, empresaDB: 55 },
        55: { cliente: 184, empresaDB: 55 },
        211: { cliente: 301, empresaDB: 211 },
        20: { cliente: 215, empresaDB: 211 },
        327: { cliente: 15, empresaDB: 55 },
    };

    static hasBarcodeEnabled(did) {
        return String(did) in this.tieneBarcode;
    }

    static getSenderId(did) {
        return this.tieneBarcode?.[String(did)]?.cliente ?? 0;
    }

    static getEmpresaDBdid(did) {
        return this.tieneBarcode?.[String(did)]?.empresa ?? 0;
    }
}
