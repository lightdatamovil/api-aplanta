import CustomException from "../../classes/custom_exception.js";

export function parseIfJson(str) {
    try {
        const parsed = JSON.parse(str);
        return typeof parsed === 'object' && parsed !== null ? parsed : str;
    } catch (e) {
        new CustomException({
            message: "Error al parsear JSON",
            title: "Error de formato",
            stack: e.stack || '',
        });
        return str;
    }
}
