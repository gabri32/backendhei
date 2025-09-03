const express = require('express');
const router = express.Router();
const socket = require('../utils/socket');

// 🖨️ Enviar orden de impresión a una tienda específica
router.post('/print', (req, res) => {
  try {
    const { storeId, target, text } = req.body;

    // Validación de parámetros
    if (!storeId || !target || !text) {
      return res.status(400).json({
        error: 'Parámetros requeridos: storeId, target, text'
      });
    }

    // Buscar el socket de la impresora
    const printerSocket = socket.getPrinterSocket(storeId);
    
    if (!printerSocket) {
      return res.status(503).json({
        error: 'Tienda no conectada',
        storeId: storeId,
        connectedStores: socket.getConnectedPrinters()
      });
    }

    // Enviar orden de impresión
    printerSocket.emit('print', { target, text });
    
    console.log(`📤 Orden enviada a tienda ${storeId}, impresora ${target}`);
    
    res.json({
      message: 'Orden enviada a tienda',
      storeId: storeId,
      target: target,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en impresión:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// 📊 Obtener estado de impresoras conectadas
router.get('/status', (req, res) => {
  try {
    const connectedPrinters = socket.getConnectedPrinters();
    
    res.json({
      message: 'Estado de impresoras',
      connectedStores: connectedPrinters,
      totalConnected: connectedPrinters.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// 🔄 Enviar ping a una tienda específica
router.post('/ping', (req, res) => {
  try {
    const { storeId } = req.body;

    if (!storeId) {
      return res.status(400).json({
        error: 'storeId es requerido'
      });
    }

    const printerSocket = socket.getPrinterSocket(storeId);
    
    if (!printerSocket) {
      return res.status(503).json({
        error: 'Tienda no conectada',
        storeId: storeId
      });
    }

    // Enviar ping
    printerSocket.emit('ping');
    
    res.json({
      message: 'Ping enviado',
      storeId: storeId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en ping:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

module.exports = router;
