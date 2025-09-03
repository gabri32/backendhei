// 🧪 Script de prueba para el sistema de impresión integrado
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testPrinterSystem() {
  console.log('🧪 Iniciando pruebas del sistema de impresión...\n');

  try {
    // 1. Verificar estado de impresoras
    console.log('1️⃣ Verificando estado de impresoras...');
    const statusResponse = await axios.get(`${BASE_URL}/printers/status`);
    console.log('✅ Estado:', statusResponse.data);
    console.log('');

    // 2. Enviar ping a tienda
    console.log('2️⃣ Enviando ping a tienda...');
    const pingResponse = await axios.post(`${BASE_URL}/printers/ping`, {
      storeId: 'heii-tienda-demo'
    });
    console.log('✅ Ping:', pingResponse.data);
    console.log('');

  } catch (error) {
    if (error.response) {
      console.error('❌ Error de respuesta:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Error de conexión: No se pudo conectar al servidor');
      console.error('   Asegúrate de que el backend esté ejecutándose en puerto 3000');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Ejecutar pruebas
console.log('🚀 Iniciando script de prueba del sistema de impresión');
console.log('📋 Requisitos:');
console.log('   - Backend ejecutándose en puerto 3000');
console.log('   - Cliente de impresión conectado (opcional para prueba completa)');
console.log('');

testPrinterSystem();
