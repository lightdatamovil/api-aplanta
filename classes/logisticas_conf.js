export default class LogisticaConf {

    static tieneBarcode = {
        12: 44,
        55: 184,
        211: 301,
        20: 215,
        327: 15,
    };

    static hasBarcodeEnabled(did) {
        return String(did) in this.tieneBarcode;
    }

    static getSenderId(did) {
        return this.tieneBarcode?.[String(did)] ?? 0;
    }
}
