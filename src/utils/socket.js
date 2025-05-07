let io;

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
      socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Cliente unido a la sala: ${room}`);
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
};