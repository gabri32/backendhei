let io;

// 🖨️ Mapa para almacenar impresoras conectadas por tienda
const localPrinters = new Map(); // storeId => socket

module.exports = {
  init: (server, allowedOrigins) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
      },
    });

    io.on('connection', (socket) => {
      console.log('📡 Nueva conexión');

      // 🏪 Unirse a salas para chat/notificaciones
      socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Cliente unido a la sala: ${room}`);
      });

      // 🖨️ Registro de cliente de impresión
      socket.on('register_printer', (storeId) => {
        localPrinters.set(storeId, socket);
        console.log(`🖨️ Cliente de impresión registrado: ${storeId}`);
      });

      // ❌ Manejo de desconexión
      socket.on('disconnect', () => {
        // Limpiar salas regulares
        console.log('🔌 Cliente desconectado');
        
        // Limpiar registro de impresoras
        for (const [storeId, sock] of localPrinters.entries()) {
          if (sock === socket) {
            localPrinters.delete(storeId);
            console.log(`❌ Cliente de impresión desconectado: ${storeId}`);
          }
        }
      });
    });
    

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io no está inicializado.');
    }
    return io;
  },
  // 🖨️ Función para obtener una impresora por storeId
  getPrinterSocket: (storeId) => {
    return localPrinters.get(storeId);
  },
  // 📊 Función para obtener todas las impresoras conectadas
  getConnectedPrinters: () => {
    return Array.from(localPrinters.keys());
  }
};
