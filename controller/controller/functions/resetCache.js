import { clientList } from "../../../db.js";

export function clearClientList() {
    for (const key in clientList) {
        delete clientList[key];
    }
}
