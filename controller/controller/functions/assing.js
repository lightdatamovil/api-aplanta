import { logGreen, logRed } from "../../../src/funciones/logsCustom.js";
import CustomException from "../../../classes/custom_exception.js";
import { axiosInstance, urlMicroserviciosAsignaciones } from "../../../db.js";

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
    console.log("urlMicroserviciosAsignaciones");
    const result = await sendToService(
      urlMicroserviciosAsignaciones,
      payload
    );
    console.log(JSON.stringify(result.data));
    if (result.status == 200) {
      logGreen("Asignado correctamente");
    } else {
      logRed("Error al asignar");
      console.log(urlMicroserviciosAsignaciones);
      console.log(payload);
      throw new CustomException({
        title: "Error al asignar",
        message: `Código de estado: ${result.status}`,
        stack: result.data.stack || '',
      });
    }
  } catch (error) {
    logRed(`Error al asignar: ${error.stack}`);
    console.log(urlMicroserviciosAsignaciones);
    console.log(payload);
    throw new CustomException({
      title: "Error al asignar",
      message: `Código de estado: ${error.status}`,
      stack: error.stack || '',
    });
  }
}
export async function sendToService(endpoint, message, retries = 3) {
  try {
    await axiosInstance.post(endpoint, message);
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 300 * (4 - retries)));
      return sendToService(endpoint, message, retries - 1);
    }
    throw err;
  }
}
