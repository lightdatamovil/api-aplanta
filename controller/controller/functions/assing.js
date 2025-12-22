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
    deviceFrom: "Asignacion por empresa externa",
  };

  try {
    const result = await sendToService(
      urlMicroserviciosAsignaciones,
      payload
    );
    if (result.status != 200) {
      throw new CustomException({
        title: "Error al asignar",
        message: `Código de estado: ${result.status}`,
        stack: result.data.stack || '',
      });
    }
  } catch (error) {
    throw new CustomException({
      title: "Error al asignar",
      message: `Código de estado: ${error.status}`,
      stack: error.stack || '',
    });
  }
}
export async function sendToService(endpoint, message, retries = 3) {
  try {
    return await axiosInstance.post(endpoint, message);
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 300 * (4 - retries)));
      return sendToService(endpoint, message, retries - 1);
    }
    throw err;
  }
}
