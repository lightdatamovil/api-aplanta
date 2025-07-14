export function parseIfJson(str) {
    try {
        const parsed = JSON.parse(str);
        return typeof parsed === 'object' && parsed !== null ? parsed : str;
    } catch (e) {
        return str;
    }
}
