import axios from "axios";
import { logGreen, logRed } from "../../src/funciones/logsCustom.js";
import CustomException from "../../classes/custom_exception.js";

export async function assign(companyId, userId, profile, dataQr, driverId) {
  const payload = {
    companyId: Number(companyId),
    userId: userId,
    profile: profile,
    appVersion: "null",
    brand: "null",
    model: "null",
    androidVersion: "null",
    deviceId: "null",
    dataQr: dataQr,
    driverId: driverId,
    deviceFrom: "Autoasignado de colecta",
  };

  try {
    const result = await axios.post(
      "https://asignaciones.lightdata.app/api/asignaciones/asignar",
      payload
    );
    if (result.status == 200) {
      logGreen("Asignado correctamente");
    } else {
      logRed("Error al asignar");
      throw new CustomException({
        title: "Error al asignar",
        message: `Código de estado: ${result.status}`,
        stack: result.data.stack || '',
      });
    }
  } catch (error) {
    logRed(`Error al asignar: ${error.stack}`);
    throw new CustomException({
      title: "Error al asignar",
      message: `Código de estado: ${error.status}`,
      stack: error.stack || '',
    });
  }
}
