const express = require('express');
const router = express.Router();
const { createOrder, reprintOrder, getPrinterStatus } = require('../controllers/orderController');

// 🛒 Crear nueva orden (con impresión automática)
router.post('/create', createOrder);

// 🔄 Reimprimir orden existente
router.post('/reprint', reprintOrder);

// 📊 Obtener estado de impresoras para una tienda
router.get('/printer-status/:storeId', getPrinterStatus);

module.exports = router;
