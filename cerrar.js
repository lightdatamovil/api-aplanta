import axios from 'axios';

// Configuración de RabbitMQ Management API
const RABBITMQ_HOST = 'http://158.69.131.226:15672'; // Cambia si es necesario
const USER = 'lightdata'; // Usuario de RabbitMQ
const PASSWORD = 'QQyfVBKRbw6fBb'; // Contraseña de RabbitMQ

const AUTH = {
  auth: { username: USER, password: PASSWORD }
};

// Función para cerrar conexiones realmente inactivas
async function cerrarConexionesInactivas() {
  try {
    console.log('🔍 Obteniendo conexiones activas...');

    // Obtener todas las conexiones activas
    const { data: conexiones } = await axios.get(`${RABBITMQ_HOST}/api/connections`, AUTH);
    
    const haceDiezHoras = Date.now() - 10 * 60 * 60 * 1000; // Timestamp de hace 10 horas

    for (const conexion of conexiones) {
      const lastActivity = Math.max(conexion.send_pulse || 0, conexion.recv_pulse || 0); // Última actividad
      const tiempoInactivo = Date.now() - lastActivity;

      // 🚀 Nueva validación: Si la conexión tiene canales activos, **NO** la cerramos
      if (conexion.channels > 0) {
        console.log(`✅ Conexión ${conexion.name} tiene canales activos (${conexion.channels}), no se cierra.`);
        continue;
      }

      if (tiempoInactivo > 10 * 60 * 60 * 1000) { // Más de 10 horas sin actividad
        console.log(`⛔ Cerrando conexión inactiva: ${conexion.name}`);

        // Cerrar conexión
        await axios.delete(`${RABBITMQ_HOST}/api/connections/${encodeURIComponent(conexion.name)}`, AUTH);
      }
    }

    console.log('✅ Proceso de cierre de conexiones inactivas completado.');
  } catch (error) {
    console.error('❌ Error al cerrar conexiones:', error.message);
  }
}

// Ejecutar cada 2 horas automáticamente
setInterval(cerrarConexionesInactivas, 2 * 60 * 60 * 1000);

cerrarConexionesInactivas(); // Ejecutar una vez al inicio
