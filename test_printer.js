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

    // 3. Crear orden con impresión automática
    console.log('3️⃣ Creando orden con impresión automática...');
    const orderResponse = await axios.post(`${BASE_URL}/orders/create`, {
      storeId: 'heii-tienda-demo',
      customerInfo: {
        name: 'Juan Pérez',
        phone: '3001234567'
      },
      table: 'Mesa 3',
      items: [
        {
          name: 'Hamburguesa Clásica',
          quantity: 2,
          price: 15000,
          notes: 'Sin cebolla'
        },
        {
          name: 'Papas Fritas',
          quantity: 1,
          price: 8000
        },
        {
          name: 'Coca Cola',
          quantity: 2,
          price: 3000
        }
      ],
      notes: 'Cliente quiere salsa extra',
      paymentMethod: 'tarjeta'
    });
    console.log('✅ Orden creada:', orderResponse.data);
    console.log('');

    // 4. Reimprimir orden
    console.log('4️⃣ Reimprimiendo orden en cocina...');
    const reprintResponse = await axios.post(`${BASE_URL}/orders/reprint`, {
      orderId: orderResponse.data.order._id,
      storeId: 'heii-tienda-demo',
      target: 'cocina'
    });
    console.log('✅ Reimpresión:', reprintResponse.data);
    console.log('');

    // 5. Impresión directa personalizada
    console.log('5️⃣ Enviando impresión directa personalizada...');
    const directPrintResponse = await axios.post(`${BASE_URL}/printers/print`, {
      storeId: 'heii-tienda-demo',
      target: 'jugos',
      text: '================================\\n' +
            '        ORDEN DE JUGOS\\n' +
            '================================\\n' +
            'Jugo de Naranja x1\\n' +
            'Jugo de Mango x2\\n' +
            '================================\\n\\n'
    });
    console.log('✅ Impresión directa:', directPrintResponse.data);
    console.log('');

    console.log('🎉 ¡Todas las pruebas completadas exitosamente!');

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
