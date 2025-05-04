const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;
const connectToDatabase = require('./conectiondb');
const restaurantRoutes = require('../src/routes/restaurantes');
const authRoutes = require('./routes/auth');
const membershipRoutes = require('./routes/membershipt');
const userRoutes = require('./routes/users');
const chatbotRoutes = require('./routes/chatbotroutes')

const allowedOrigins = [
    "http://localhost:5173",
];

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200); // Manejo del preflight request
    }

    next();
});



// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Ruta para obtener todos los restaurantes
app.get('/restaurantes', async (req, res) => {
    try {
        const restaurantes = await Restaurante.find(); // Obtiene todos los documentos
        res.json(restaurantes);
    } catch (error) {
        console.error('Error al obtener los restaurantes:', error.message);
        res.status(500).json({ error: 'Error al obtener los restaurantes' });
    }
});
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));


// Registrar rutas
app.use('/api/auth', authRoutes);
app.use('/api/restaurantes', restaurantRoutes); 
app.use('/api/memberships', membershipRoutes); 
app.use('/api/chatV1', chatbotRoutes)
connectToDatabase();

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});