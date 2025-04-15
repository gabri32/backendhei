const express = require('express');
const   router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurantes');
require('dotenv').config();

async function hashPassword(plainPassword) {
  const saltRounds = 15;
  const hash = await bcrypt.hash(plainPassword, saltRounds);
  return hash;
}

/**
 * Ruta para registrar un nuevo restaurante
 */
router.post('/', async (req, res) => {
  try {
    console.log("Cuerpo de la solicitud recibido:", req.body);

    const { name, owner, membership, config } = req.body;

    const databaseName = `tenant_${name.toLowerCase().replace(/\s+/g, '')}`;
    console.log("Nombre de la base de datos generado:", databaseName);

    // Crear nuevo documento en la base admin
    const newRestaurant = new Restaurant({
      name,
      owner,
      databaseName,
      membership: {
        ...membership,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
        autoRenew: membership?.autoRenew ?? true
      },
      config
    });

    console.log("Nuevo restaurante creado:", newRestaurant);

    // Hashear la contraseña del propietario
    newRestaurant.owner.password = await hashPassword(owner.password);
    console.log("Contraseña hasheada:", newRestaurant.owner.password);

    // Verificar si ya existe un restaurante con el mismo nombre o base de datos
    const existe = await Restaurant.findOne({
      $or: [
        { name: name.toLowerCase() },
        { databaseName: databaseName }
      ]
    });

    console.log("Resultado de la búsqueda de restaurante existente:", existe);

    if (existe) {
      console.log("El restaurante ya existe.");
      return res.status(400).json({ error: 'El restaurante ya existe con ese nombre o base de datos' });
    }

    // Guardar el nuevo restaurante en la base de datos admin
    await newRestaurant.save();
    console.log("Nuevo restaurante guardado en la base de datos admin.");

    // Crear conexión a la base de datos del cliente
    const clientConnection = await mongoose.createConnection(
      process.env.HEII_MONGO_URI,
      {
        dbName: databaseName,
      }
    );

    console.log("Conexión a la base de datos del cliente creada.");

    // Crear colecciones base en la base de datos del cliente
    await clientConnection.createCollection('admin');
    await clientConnection.createCollection('employees');
    await clientConnection.createCollection('products');
    await clientConnection.createCollection('orders');
    await clientConnection.createCollection('config');

    console.log("Colecciones base creadas en la base de datos del cliente.");

    // Cerrar la conexión del cliente
    await clientConnection.close();
    console.log("Conexión a la base de datos del cliente cerrada.");

    res.status(201).json({ message: 'Restaurante registrado correctamente', databaseName });
  } catch (err) {
    console.error("Error en el proceso:", err);
    res.status(500).json({ error: 'Error al registrar restaurante' });
  }
});


/**
 * Ruta para el inicio de sesión de empleados
 */
// Ruta para el inicio de sesión de empleados
router.post('/login', async (req, res) => {
  try {
    const { tenantName, email, password } = req.body;

    // Buscar el restaurante correspondiente al tenantName
    const restaurant = await Restaurant.findOne({ name: tenantName.toLowerCase() });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    // Conectar a la base de datos del restaurante
    const clientConnection = await mongoose.createConnection(
      process.env.HEII_MONGO_URI,
      { dbName: restaurant.databaseName }
    );

    // Crear un modelo dinámico para los empleados
    const EmployeeModel = clientConnection.model('employees', new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      role: String,
    }));

    // Buscar al empleado en la base de datos del restaurante
    const employee = await EmployeeModel.findOne({ email });
    if (!employee) {
      await clientConnection.close();
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      await clientConnection.close();
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Generar un token JWT
    const token = jwt.sign(
      { id: employee._id, email: employee.email, tenant: restaurant.databaseName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await clientConnection.close();

    res.status(200).json({ message: 'Inicio de sesión exitoso', token });
  } catch (err) {
    console.error('Error en el inicio de sesión:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

/**
 * Ruta para insertar un empleado en un restaurante específico
 */
// Ruta para insertar un empleado en un restaurante específico
router.post('/add-employee', async (req, res) => {
  try {
    const { tenantName, email, password, name, role } = req.body;

    // Buscar el restaurante correspondiente al tenantName
    const restaurant = await Restaurant.findOne({ name: tenantName.toLowerCase() });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    // Conectar a la base de datos del restaurante
    const clientConnection = await mongoose.createConnection(
      process.env.HEII_MONGO_URI,
      { dbName: restaurant.databaseName }
    );

    // Crear un modelo dinámico para los empleados
    const EmployeeModel = clientConnection.model('employees', new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
    }));

    // Verificar si el empleado ya existe
    const existingEmployee = await EmployeeModel.findOne({ email });
    if (existingEmployee) {
      await clientConnection.close();
      return res.status(400).json({ error: 'El empleado ya existe' });
    }

    // Hashear la contraseña del empleado
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear un nuevo empleado
    const newEmployee = new EmployeeModel({
      email,
      password: hashedPassword,
      name,
      role,
    });

    // Guardar el empleado en la base de datos
    await newEmployee.save();

    await clientConnection.close();

    res.status(201).json({ message: 'Empleado agregado correctamente', employee: newEmployee });
  } catch (err) {
    console.error('Error al agregar empleado:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});




router.post('/add-product', async (req, res) => {
  try {
    const { tenantName, name, description, price, category, available } = req.body;

    // Buscar el restaurante correspondiente
    const restaurant = await Restaurant.findOne({ name: tenantName.toLowerCase() });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

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

    // Crear y guardar el producto
    const newProduct = new ProductModel({ name, description, price, category, available });
    await newProduct.save();

    await clientConnection.close();

    res.status(201).json({ message: 'Producto agregado correctamente', product: newProduct });

  } catch (err) {
    console.error('Error al agregar producto:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
router.post('/add-order', async (req, res) => {
  try {
    const { tenantName, type, items, total, details } = req.body;

    // Validación básica del tipo de orden
    const validTypes = ['domicilio', 'mesa', 'chat'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipo de orden inválido' });
    }

    // Buscar el restaurante correspondiente
    const restaurant = await Restaurant.findOne({ name: tenantName.toLowerCase() });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }

    // Conexión con la base de datos del restaurante
    const clientConnection = await mongoose.createConnection(
      process.env.HEII_MONGO_URI,
      { dbName: restaurant.databaseName }
    );

    // Modelo de orden
    const OrderModel = clientConnection.model('orders', new mongoose.Schema({
      type: { type: String, required: true },
      items: [{
        productId: String,
        name: String,
        quantity: Number,
        price: Number
      }],
      total: Number,
      status: { type: String, default: 'pendiente' },
      createdAt: { type: Date, default: Date.now },
      details: mongoose.Schema.Types.Mixed
    }));

    // Crear y guardar la orden
    const newOrder = new OrderModel({ type, items, total, details });
    await newOrder.save();

    await clientConnection.close();

    res.status(201).json({ message: 'Orden registrada exitosamente', order: newOrder });

  } catch (err) {
    console.error('Error al registrar orden:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});


router.get('/get-products', async (req, res) => {
  try {
    const { tenantName } = req.query;

    const restaurant = await Restaurant.findOne({ name: tenantName.toLowerCase() });
    if (!restaurant) return res.status(404).json({ error: 'Restaurante no encontrado' });

    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: restaurant.databaseName
    });

    const ProductModel = clientConnection.model('products', new mongoose.Schema({}, { strict: false }));
    const products = await ProductModel.find();

    await clientConnection.close();
    res.status(200).json({ products });
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/get-orders', async (req, res) => {
  try {
    const { tenantName } = req.query;

    const restaurant = await Restaurant.findOne({ name: tenantName.toLowerCase() });
    if (!restaurant) return res.status(404).json({ error: 'Restaurante no encontrado' });

    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: restaurant.databaseName
    });

    const OrderModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));
    const orders = await OrderModel.find();

    await clientConnection.close();
    res.status(200).json({ orders });
  } catch (err) {
    console.error('Error al obtener órdenes:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
router.get('/get-orders-by-type/:type', async (req, res) => {
  try {
    const { tenantName } = req.query;
    const { type } = req.params;

    const validTypes = ['domicilio', 'mesa', 'chat'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipo de orden inválido' });
    }

    const restaurant = await Restaurant.findOne({ name: tenantName.toLowerCase() });
    if (!restaurant) return res.status(404).json({ error: 'Restaurante no encontrado' });

    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: restaurant.databaseName
    });

    const OrderModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));
    const orders = await OrderModel.find({ type });

    await clientConnection.close();
    res.status(200).json({ orders });
  } catch (err) {
    console.error('Error al obtener órdenes por tipo:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});


module.exports = router;