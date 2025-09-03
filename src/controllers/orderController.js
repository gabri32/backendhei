const PrinterService = require('../utils/printerService');

/**
 * 🛒 Controlador para crear una nueva orden con impresión automática
 */
const createOrder = async (req, res) => {
  try {
    const { storeId, customerInfo, items, table, notes, paymentMethod } = req.body;

    // Validación básica
    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Datos requeridos: storeId, items (array no vacío)'
      });
    }

    // Crear objeto de orden
    const order = {
      _id: generateOrderId(),
      orderNumber: generateOrderNumber(),
      storeId,
      customerName: customerInfo?.name || 'Cliente',
      customerPhone: customerInfo?.phone,
      table: table || 'Mesa sin asignar',
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        notes: item.notes || ''
      })),
      notes: notes || '',
      paymentMethod: paymentMethod || 'efectivo',
      status: 'nuevo',
      createdAt: new Date(),
      total: calculateTotal(items)
    };

    // Aquí normalmente guardarías en la base de datos
    // const savedOrder = await Order.save(order);

    // 🖨️ Imprimir automáticamente en cocina
    const kitchenPrinted = await PrinterService.printKitchenOrder(storeId, order);
    
    // 🖨️ Imprimir recibo en caja (opcional, según configuración)
    const receiptPrinted = await PrinterService.printCashierReceipt(storeId, order);

    console.log(`📋 Orden creada: ${order.orderNumber}`);
    console.log(`🖨️ Impreso en cocina: ${kitchenPrinted}`);
    console.log(`🧾 Recibo impreso: ${receiptPrinted}`);

    res.status(201).json({
      message: 'Orden creada exitosamente',
      order: order,
      printing: {
        kitchen: kitchenPrinted,
        receipt: receiptPrinted,
        storeConnected: PrinterService.isStoreConnected(storeId)
      }
    });

  } catch (error) {
    console.error('❌ Error creando orden:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * 🔄 Reimprimir una orden existente
 */
const reprintOrder = async (req, res) => {
  try {
    const { orderId, storeId, target } = req.body;

    if (!orderId || !storeId || !target) {
      return res.status(400).json({
        error: 'Parámetros requeridos: orderId, storeId, target'
      });
    }

    // Aquí normalmente obtendrías la orden de la base de datos
    // const order = await Order.findById(orderId);
    
    // Para el ejemplo, crear una orden de muestra
    const order = {
      _id: orderId,
      orderNumber: `ORD-${Date.now()}`,
      customerName: 'Cliente de ejemplo',
      table: 'Mesa 5',
      items: [
        { name: 'Hamburguesa', quantity: 2, price: 15000 },
        { name: 'Papas Fritas', quantity: 1, price: 8000 }
      ],
      notes: 'Sin cebolla',
      total: 38000
    };

    let printed = false;
    if (target === 'cocina') {
      printed = await PrinterService.printKitchenOrder(storeId, order);
    } else if (target === 'caja') {
      printed = await PrinterService.printCashierReceipt(storeId, order);
    } else {
      return res.status(400).json({
        error: 'Target debe ser "cocina" o "caja"'
      });
    }

    res.json({
      message: `Orden reimpresa en ${target}`,
      orderId: orderId,
      printed: printed,
      storeConnected: PrinterService.isStoreConnected(storeId)
    });

  } catch (error) {
    console.error('❌ Error reimprimiendo orden:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

/**
 * 📊 Obtener estado de impresoras para un restaurante
 */
const getPrinterStatus = async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({
        error: 'storeId es requerido'
      });
    }

    const isConnected = PrinterService.isStoreConnected(storeId);
    const allConnected = PrinterService.getConnectedStores();

    res.json({
      storeId: storeId,
      connected: isConnected,
      allConnectedStores: allConnected,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado de impresoras:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// 🔧 Funciones auxiliares
function generateOrderId() {
  return new Date().getTime().toString();
}

function generateOrderNumber() {
  return `ORD-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function calculateTotal(items) {
  return items.reduce((total, item) => {
    return total + ((item.price || 0) * (item.quantity || 1));
  }, 0);
}

module.exports = {
  createOrder,
  reprintOrder,
  getPrinterStatus
};
