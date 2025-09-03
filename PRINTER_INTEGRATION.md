# 🖨️ Sistema de Impresión Integrado

## 📋 Resumen

Se ha integrado el sistema de impresión remota en el backend de Heii. Ahora puedes enviar órdenes de impresión a impresoras conectadas en diferentes tiendas a través de WebSockets.

## 🏗️ Arquitectura

```
Backend Heii (Puerto 3000)
├── WebSocket Server (Socket.IO)
│   ├── Manejo de salas para chat
│   └── Registro de clientes de impresión
├── API REST
│   ├── /api/printers/* (Gestión de impresión)
│   └── /api/orders/* (Órdenes con impresión automática)
└── PrinterService (Servicio helper)
```

## 🚀 Comandos para Usar

### 1. Instalar y Ejecutar Backend
```bash
# Desde el directorio backheii
npm install
npm start
```

### 2. Configurar Cliente de Impresión
```bash
# Ir al directorio del cliente
cd ../printers/client

# Instalar dependencias
npm install

# Editar configuración
# Cambiar serverUrl en config.json a tu servidor backend
```

### 3. Ejecutar Cliente de Impresión
```bash
# Desde printers/client
node index.js
```

## 📡 Endpoints Disponibles

### **Impresión Directa**
```http
POST /api/printers/print
Content-Type: application/json

{
  "storeId": "tienda-123",
  "target": "cocina",
  "text": "ORDEN #123\nPollo Asado x2\nPapas x1\n"
}
```

### **Estado de Impresoras**
```http
GET /api/printers/status
```

### **Ping a Tienda**
```http
POST /api/printers/ping
Content-Type: application/json

{
  "storeId": "tienda-123"
}
```

### **Crear Orden con Impresión Automática**
```http
POST /api/orders/create
Content-Type: application/json

{
  "storeId": "tienda-123",
  "customerInfo": {
    "name": "Juan Pérez",
    "phone": "123456789"
  },
  "table": "Mesa 5",
  "items": [
    {
      "name": "Hamburguesa Clásica",
      "quantity": 2,
      "price": 15000,
      "notes": "Sin cebolla"
    },
    {
      "name": "Papas Fritas",
      "quantity": 1,
      "price": 8000
    }
  ],
  "notes": "Cliente quiere salsa extra",
  "paymentMethod": "efectivo"
}
```

### **Reimprimir Orden**
```http
POST /api/orders/reprint
Content-Type: application/json

{
  "orderId": "1725318000000",
  "storeId": "tienda-123", 
  "target": "cocina"
}
```

### **Estado de Impresoras por Tienda**
```http
GET /api/orders/printer-status/tienda-123
```

## 💻 Uso Programático

### **En tus Controladores:**
```javascript
const PrinterService = require('../utils/printerService');

// Imprimir en cocina
await PrinterService.printKitchenOrder('tienda-123', orderObject);

// Imprimir recibo
await PrinterService.printCashierReceipt('tienda-123', orderObject);

// Verificar conexión
const isConnected = PrinterService.isStoreConnected('tienda-123');

// Impresión personalizada
await PrinterService.sendPrintOrder('tienda-123', 'jugos', 'Jugo de Naranja x1\n');
```

## 🔧 Configuración del Cliente

### **config.json del cliente:**
```json
{
    "storeId": "tienda-123",
    "serverUrl": "ws://localhost:3000",
    "printers": {
        "cocina": "00-14-C0-BD-28-68",
        "caja": "192.168.1.100",
        "jugos": "00-14-C0-BD-A8-35"
    }
}
```

**Nota:** Puedes usar MAC addresses (el cliente las resuelve automáticamente) o IPs fijas.

## 📋 Eventos WebSocket

### **Cliente → Servidor:**
- `register_printer(storeId)` - Registrar cliente de impresión
- `join_room(room)` - Unirse a sala para chat

### **Servidor → Cliente:**
- `print({ target, text })` - Enviar orden de impresión
- `ping()` - Verificar conexión

## 🔍 Logs del Sistema

El sistema genera logs informativos:
```
📡 Nueva conexión
🖨️ Cliente de impresión registrado: tienda-123
📤 Orden enviada a tienda tienda-123, impresora cocina
❌ Cliente de impresión desconectado: tienda-123
```

## 🛠️ Integración en Controladores Existentes

Para integrar impresión en tus controladores existentes:

```javascript
// Al final de tu función de crear pedido
const PrinterService = require('../utils/printerService');

// Después de guardar el pedido en la BD
const order = await Order.save(newOrder);

// Imprimir automáticamente
await PrinterService.printKitchenOrder(restaurant.storeId, order);
```

## 🔄 Flujo Completo

1. **Backend Heii** ejecutándose en puerto 3000
2. **Cliente de impresión** conecta y se registra con su storeId
3. **Frontend** crea una orden via API
4. **Backend** procesa la orden y la guarda en BD
5. **Backend** envía automáticamente la orden a impresión
6. **Cliente** recibe la orden e imprime en la impresora física

## ⚠️ Consideraciones

- El cliente debe estar ejecutándose en la misma red que las impresoras
- Las impresoras deben soportar ESC/POS (impresoras térmicas estándar)
- El storeId debe ser único por tienda
- Si una tienda no está conectada, las órdenes no se imprimirán pero el API seguirá funcionando
