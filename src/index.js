const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const socket = require('./utils/socket'); // Importar el módulo de socket.io

// 🔌 Conexión a MongoDB
const connectToDatabase = require('./conectiondb');

// 📦 Rutas
const restaurantRoutes = require('../src/routes/restaurantes');
const authRoutes = require('./routes/auth');
const membershipRoutes = require('./routes/membershipt');
const chatbotRoutes = require('./routes/chatbotroutes');

// 🌍 CORS personalizado
const allowedOrigins = ["http://localhost:5173","https://backendhei-5rbz.onrender.com"];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS,PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// 🧠 Configurar socket.io
socket.init(server, allowedOrigins);

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