const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const socket = require("./utils/socket");

// 🔌 Conexión a MongoDB
const connectToDatabase = require("./conectiondb");

// 📦 Rutas
const restaurantRoutes = require("../src/routes/restaurantes");
const authRoutes = require("./routes/auth");
const membershipRoutes = require("./routes/membershipt");
const chatbotRoutes = require("./routes/chatbotroutes");

// 🌍 CORS libre (para todos los orígenes)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 📦 Middleware JSON
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));


socket.init(server, ["*"]);

// 🔀 Rutas
app.get("/", (req, res) => res.send("Hello World!"));
app.use("/api/auth", authRoutes);
app.use("/api/restaurantes", restaurantRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/chatV1", chatbotRoutes);

// 🔗 Conexión base de datos
connectToDatabase();

// 🚀 Iniciar servidor
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Servidor corriendo con socket.io en http://localhost:${port}`);
});
