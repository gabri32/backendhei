const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const socket = require("./utils/socket"); // Importar el módulo de socket.io


const connectToDatabase = require("./conectiondb");


const restaurantRoutes = require("../src/routes/restaurantes");
const authRoutes = require("./routes/auth");
const membershipRoutes = require("./routes/membershipt");
const chatbotRoutes = require("./routes/chatbotroutes");


const allowedOrigins = [
  "http://localhost:5173",
  "https://heii.netlify.app",
  "https://heii.io",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir peticiones sin "origin" (como Postman o servidores internos)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);


app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));


socket.init(server, allowedOrigins);


app.get("/", (req, res) => res.send("Hello World!"));
app.use("/api/auth", authRoutes);
app.use("/api/restaurantes", restaurantRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/chatV1", chatbotRoutes);


connectToDatabase();

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Servidor corriendo con socket.io en http://localhost:${port}`);
});
