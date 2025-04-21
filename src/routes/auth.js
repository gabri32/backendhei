const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurantes');
require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.HEII_MONGO_URI;


router.post('/registerrestaurant', async (req, res) => {
try{
  
}catch (err) {

}

})


// Ruta para registrar un nuevo usuario---------------------------------------------------------
router.post('/registeruser', async (req, res) => {
  try {
    const { name, email, password, restaurantName } = req.body

    // 1. Buscar el restaurante por nombre
    const restaurant = await Restaurant.findOne({ name: restaurantName.toLowerCase() })
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' })
    }

    // 2. Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(
      process.env.HEII_MONGO_URI,
      { dbName: restaurant.databaseName }
    )

    // 3. Definir el esquema del cliente
    const Clientemodel = clientConnection.model('clients', new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, default: 'cliente' },
      lstpedidos: { type: Array, default: [] }
    }))

    // 4. Verificar si ya existe el email
    const existing = await Clientemodel.findOne({ email })
    if (existing) {
      return res.status(400).json({ error: 'El usuario ya está registrado' })
    }

    // 5. Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 15)

    // 6. Crear y guardar nuevo cliente
    const newUser = new Clientemodel({ name, email, password: hashedPassword })
    await newUser.save()

    const user = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      lstpedidos: newUser.lstpedidos
    }

    res.status(201).json({ message: 'Registro exitoso', user })

    
  } catch (err) {
    console.error('Error al registrar usuario:', err)
    res.status(500).json({ error: 'Error en el servidor' })
  }
})
// Ruta para logearse un nuevo usuario---------------------------------------------------------
router.post('/loginuser', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Buscar el restaurante por nombre
    const restaurant = await Restaurant.findOne({ name: name.toLowerCase() });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    // Intentar autenticar como cliente
    const clientConnection = await mongoose.createConnection(
      process.env.HEII_MONGO_URI,
      { dbName: restaurant.databaseName }
    );
    const ClientModel = clientConnection.model('clients', new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      lstpedidos: Array
    }));
    const client = await ClientModel.findOne({ email });
    if (client && await bcrypt.compare(password, client.password)) {
  
      return res.status(200).json({
        message: 'Login exitoso',
        user: {
          id: client._id,
          name: client.name,
          email: client.email,
          role: 'cliente',
          lstpedidos: client.lstpedidos
        }
      });
    }
    

    // Intentar autenticar como empleado
    const employeeConnection = await mongoose.createConnection(
      process.env.HEII_MONGO_URI,
      { dbName: restaurant.databaseName }
    );
    const EmployeeModel = employeeConnection.model('employees', new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String
    }));
    const employee = await EmployeeModel.findOne({ email });
    if (employee && await bcrypt.compare(password, employee.password)) {
   
      return res.status(200).json({
        message: 'Login exitoso',
        user: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role
        }
      });
    }
  

    // Intentar autenticar como administrador
    if (restaurant.owner && restaurant.owner.email === email) {
      const isPasswordValid = await bcrypt.compare(password, restaurant.owner.password);
      if (isPasswordValid) {
        return res.status(200).json({
          message: 'Login exitoso',
          user: {
            id: restaurant.owner._id,
            name: restaurant.owner.name,
            email: restaurant.owner.email,
            role: 'admin'
          }
        });
      }
    }

    // Si ninguna autenticación fue exitosa
    return res.status(401).json({ error: 'Credenciales inválidas' });

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});




// Ruta para datos del menu sin logearse--------------------------------------------------------------

router.post('/finrestaurant', async (req, res) => {
  try {
    const { name } = req.body;
    console.log("Cuerpo de la solicitud recibido:", req.body);

    // 1. Buscar restaurante
  
    // Buscar el restaurante correspondiente
    const restaurant = await Restaurant.findOne({ name: name.toLowerCase() });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
console.log(restaurant.location)
    // Conectar a la base de datos del tenant
    const clientConnection = await mongoose.createConnection(
      process.env.HEII_MONGO_URI,
      { dbName: restaurant.databaseName }
    );

    // Definir el esquema del producto
    const ProductModel = clientConnection.model('products', new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      price: { type: Number, required: true },
      category: String,
      available: { type: Boolean, default: true }
    }));
    // 4. Buscar productos activos
    const productosActivos = await ProductModel.find({ available: true });
    // console.log("Productos activos encontrados:", productosActivos.length)
    // console.log("Ejemplo de producto:", productosActivos[0])
    
    // 5. Armar respuesta
    const datos = {
      id: restaurant._id,
      nombre: restaurant.name,
      location: restaurant.location,
      productos: productosActivos
    };

    res.status(200).json({ message: 'exitoso', datos });



  } catch (err) {
    console.error('Error de sesión:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});




module.exports = router;