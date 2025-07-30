export default class LogisticaConf {



    // el array debe tener la vnculacion entre logisticas ademas del did_vendedor asociado 
    static tieneBarcode = {
        12: 44,
        55: 184,
        211: 301,
        20: 215,
        327: 15,
    };

    static tieneBarcode2 = {
        20: { empresa_vinculada: 211, seller_id: 215 },
        211: { empresa_vinculada: null, seller_id: 301 },
        12: { empresa_vinculada: 55, seller_id: 44 },
        55: { empresa_vinculada: null, seller_id: 184 },
        327: { empresa_vinculada: 55, seller_id: 15 },

    };

    // planet 12   
    // zuiden 55

    static hasBarcodeEnabled(did) {
        return String(did) in this.tieneBarcode;
    }

    static getSenderId(did) {
        return this.tieneBarcode?.[String(did)] ?? 0;
    }

    static getEmpresaVinculada(did) {
        return this.tieneBarcode2?.[String(did)]?.empresa_vinculada ?? null;
    }

    // 👉 Método para obtener seller_id
    static getSellerId(did) {
        return this.tieneBarcode2?.[String(did)]?.seller_id ?? 0;
    }
}