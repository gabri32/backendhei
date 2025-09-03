const socket = require('./socket');

/**
 * 🖨️ Servicio de Impresión
 * Facilita el envío de órdenes de impresión desde cualquier parte de la aplicación
 */
class PrinterService {
  
  /**
   * Enviar una orden de impresión a una tienda específica
   * @param {string} storeId - ID de la tienda
   * @param {string} target - Nombre de la impresora (ej: 'cocina', 'caja', 'jugos')
   * @param {string} text - Texto a imprimir
   * @returns {Promise<boolean>} - true si se envió correctamente, false si no
   */
  static async sendPrintOrder(storeId, target, text) {
    try {
      const printerSocket = socket.getPrinterSocket(storeId);
      
      if (!printerSocket) {
        console.warn(`⚠️ Tienda ${storeId} no está conectada`);
        return false;
      }

      printerSocket.emit('print', { target, text });
      console.log(`📤 Orden enviada a tienda ${storeId}, impresora ${target}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error enviando orden de impresión:', error);
      return false;
    }
  }

  /**
   * Imprimir ticket de pedido en cocina
   * @param {string} storeId - ID de la tienda
   * @param {Object} order - Objeto del pedido
   */
  static async printKitchenOrder(storeId, order) {
    const ticket = this.formatKitchenTicket(order);
    return await this.sendPrintOrder(storeId, 'cocina', ticket);
  }

  /**
   * Imprimir recibo en caja
   * @param {string} storeId - ID de la tienda
   * @param {Object} order - Objeto del pedido
   */
  static async printCashierReceipt(storeId, order) {
    const receipt = this.formatCashierReceipt(order);
    return await this.sendPrintOrder(storeId, 'caja', receipt);
  }

  /**
   * Formatear ticket para cocina
   * @param {Object} order - Objeto del pedido
   * @returns {string} - Texto formateado para impresión
   */
  static formatKitchenTicket(order) {
    const date = new Date().toLocaleString('es-ES');
    
    let ticket = '';
    ticket += '================================\n';
    ticket += '        ORDEN DE COCINA\n';
    ticket += '================================\n';
    ticket += `Orden #: ${order.orderNumber || order._id}\n`;
    ticket += `Fecha: ${date}\n`;
    ticket += `Mesa: ${order.table || 'N/A'}\n`;
    ticket += `Cliente: ${order.customerName || 'N/A'}\n`;
    ticket += '--------------------------------\n';
    
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        ticket += `${item.quantity}x ${item.name}\n`;
        if (item.notes) {
          ticket += `   Nota: ${item.notes}\n`;
        }
      });
    }
    
    ticket += '--------------------------------\n';
    if (order.notes) {
      ticket += `Notas: ${order.notes}\n`;
    }
    ticket += '================================\n\n';
    
    return ticket;
  }

  /**
   * Formatear recibo para caja
   * @param {Object} order - Objeto del pedido
   * @returns {string} - Texto formateado para impresión
   */
  static formatCashierReceipt(order) {
    const date = new Date().toLocaleString('es-ES');
    
    let receipt = '';
    receipt += '================================\n';
    receipt += '           RECIBO\n';
    receipt += '================================\n';
    receipt += `Orden #: ${order.orderNumber || order._id}\n`;
    receipt += `Fecha: ${date}\n`;
    receipt += `Cliente: ${order.customerName || 'N/A'}\n`;
    receipt += '--------------------------------\n';
    
    let total = 0;
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const itemTotal = item.quantity * item.price;
        total += itemTotal;
        receipt += `${item.quantity}x ${item.name}\n`;
        receipt += `   $${item.price.toFixed(2)} c/u = $${itemTotal.toFixed(2)}\n`;
      });
    }
    
    receipt += '--------------------------------\n';
    receipt += `TOTAL: $${total.toFixed(2)}\n`;
    receipt += '================================\n';
    receipt += '     ¡Gracias por su compra!\n';
    receipt += '================================\n\n';
    
    return receipt;
  }

  /**
   * Verificar si una tienda está conectada
   * @param {string} storeId - ID de la tienda
   * @returns {boolean} - true si está conectada
   */
  static isStoreConnected(storeId) {
    return socket.getPrinterSocket(storeId) !== undefined;
  }

  /**
   * Obtener todas las tiendas conectadas
   * @returns {string[]} - Array de storeIds conectados
   */
  static getConnectedStores() {
    return socket.getConnectedPrinters();
  }
}

module.exports = PrinterService;
