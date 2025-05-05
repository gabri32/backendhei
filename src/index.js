const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

// 🔌 Conexión a MongoDB
const connectToDatabase = require('./conectiondb');

// 📦 Rutas
const restaurantRoutes = require('../src/routes/restaurantes');
const authRoutes = require('./routes/auth');
const membershipRoutes = require('./routes/membershipt');
const chatbotRoutes = require('./routes/chatbotroutes');

// 🌍 CORS personalizado
const allowedOrigins = ["http://localhost:5173"];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// 🧠 Configurar socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('🟢 Socket conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔴 Socket desconectado:', socket.id);
  });
});

// Exportar socket para usar en otras rutas
module.exports.io = io;

// 📦 Middleware JSON
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 🔀 Rutas
app.get('/', (req, res) => res.send('Hello World!'));
app.use('/api/auth', authRoutes);
app.use('/api/restaurantes', restaurantRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/chatV1', chatbotRoutes);

// 🔗 Conexión base de datos
connectToDatabase();

// 🚀 Iniciar servidor
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Servidor corriendo con socket.io en http://localhost:${port}`);
});
