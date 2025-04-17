const express = require('express');
const   router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurantes');
const roleSchema = require('../models/roles');
require('dotenv').config();

const multer = require('multer');
const upload = multer(); 
const uri = process.env.HEII_MONGO_URI;
const dbName = process.env.HEII_MONGO_DB_NAME;
async function hashPassword(plainPassword) {
  const saltRounds = 15;
  const hash = await bcrypt.hash(plainPassword, saltRounds);
  return hash;
}
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  path: { type: String, required: false },
  password: { type: String, required: true },
  registrationDate: { type: Date, default: Date.now },
  plan: {
    id: { type: mongoose.Schema.Types.ObjectId }, // Referencia a otro modelo
    nombre: { type: String },
    fechaInicio: { type: Date },
    fechaFin: { type: Date }
  },
  estadoMembresia: {
    type: String,
    enum: ['activa', 'inactiva', 'vencida', 'pendiente'], // Valores permitidos
    default: 'inactiva'
  },
  datosCompletos: { type: Boolean, default: false },
  locations: [
    {
      nombre: { type: String, required: false },
      direccion: { type: String, required: false },
      telefono: { type: String, required: false },
      horario: { type: String, required: false },
      imagen: { type: Buffer } 
    }
  ]
});
const Users = mongoose.model('users', userSchema);


router. post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que los campos requeridos estén presentes
    if (!email || !password) {
      return res.status(400).json({ error: 'El email y la contraseña son obligatorios' });
    }

    // Buscar al usuario en la base de datos
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Generar un token JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // El token expira en 1 hora
    );
if (user.estadoMembresia === 'activa') {
  res.status(200).json({ message: 'Inicio de sesión exitoso', user,token });
    }
   else{
    res.status(200).json({ message: 'Inicio de sesión exitoso',user,token });}
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/addUserPath', async (req, res) => {
  try {
    const { email, path } = req.body;

    // Validar que los campos requeridos estén presentes
    if (!email || !path) {
      return res.status(400).json({ error: 'El email y el path son obligatorios' });
    } 

    // Buscar al usuario por email
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

   

    // Agregar el campo `path` al usuario
    user.path = path;

    // Guardar los cambios en la base de datos
    await user.save();

    res.status(200).json({ message: 'El campo "path" fue agregado al usuario exitosamente', user });
  } catch (error) {
    console.error('Error al agregar el campo "path" al usuario:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});


router.get('/verifyUserPath', async (req, res) => {
  try {
    const { email } = req.query;

    // Validar que el email esté presente
    if (!email) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }

    // Buscar al usuario por email
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el campo `path` existe
    if (!user.path) {
      return res.status(404).json({ error: 'El usuario no tiene el campo "path"' });
    }

    res.status(200).json({ message: 'El usuario tiene el campo "path"', path: user.path });
  } catch (error) {
    console.error('Error al verificar el campo "path":', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
// Ruta para registrar un usuario
router.post('/registerUser', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar que los campos requeridos estén presentes
    if (!email || !password) {
      return res.status(400).json({ error: 'El email y la contraseña son obligatorios' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya está registrado' });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear un nuevo usuario
    const newUser = new Users({
      email,
      password: hashedPassword
    });

    // Guardar el usuario en la base de datos
    await newUser.save();

    res.status(201).json({ message: 'Usuario registrado exitosamente', user: { email: newUser.email, registrationDate: newUser.registrationDate } });
  } catch (error) {
    console.error('Error al registrar el usuario:', error.message);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

// Ruta para actulizar si tiene membresias
router.post('/updateUser', async (req, res) => {
  try {
    const { email, password, planId, planNombre, fechaInicio, fechaFin, estadoMembresia, datosCompletos } = req.body;

    // Validar que el email esté presente
    if (!email) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }

    // Buscar al usuario por email
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar la contraseña si se proporciona
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Actualizar los datos del usuario
    if (planId || planNombre || fechaInicio || fechaFin) {
     
      user.plan = { 
        id: planId || user.plan?.id,
        nombre: planNombre || user.plan?.nombre,
        fechaInicio: fechaInicio || user.plan?.fechaInicio,
        fechaFin: fechaFin || user.plan?.fechaFin,
      };
    }

    if (estadoMembresia) {
      user.estadoMembresia = estadoMembresia;
    }

    if (datosCompletos !== undefined) {
      user.datosCompletos = datosCompletos;
    }

    // Guardar los cambios en la base de datos
    await user.save();

    res.status(200).json({ message: 'Usuario actualizado exitosamente', user });
  } catch (error) {
    console.error('Error al actualizar el usuario:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/getLocations', async (req, res) => {
  try {
    const { email } = req.query;

    // Validar que el email esté presente
    if (!email) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }

    // Buscar al usuario por email
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(user)
    if (user.locations.length===0) {
      return res.status(404).json({ error: 'El usuario no tiene locaciones registradas' });
    }

    // Obtener el nombre de la base de datos asociada a la locación
    const databaseName = `location_${user.locations[0].nombre.toLowerCase().replace(/\s+/g, '_')}`;

    // Conectar a la base de datos de la locación
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName
    });



    // Cerrar la conexión
    await clientConnection.close();

    // Responder con los datos de la locación y las colecciones
    res.status(200).json( user.locations[0]
    );
  } catch (error) {
    console.error('Error al obtener las locaciones:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
 // Configuración básica para manejar datos en memoria
 router.post('/addLocation', upload.single('imagen'), async (req, res) => {
  try {
    const { email, nombre, direccion, telefono, horario } = req.body;
    const imagen = req.file; // Archivo enviado

    // Validar que los campos requeridos estén presentes
    if (!email || !nombre || !direccion || !telefono || !horario || !imagen) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Buscar al usuario por email
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Inicializar el array de locaciones si no existe
    if (!user.locations) {
      user.locations = [];
    }

    // Agregar la nueva locación al array de locaciones
    user.locations.push({
      nombre,
      direccion,
      telefono,
      horario,
      imagen: imagen.buffer // Guardar la imagen como binario
    });

    // Guardar los cambios en la base de datos
    await user.save();

    // Crear una nueva base de datos con el nombre proporcionado
    const databaseName = `location_${nombre.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName
    });

    // Crear colecciones base en la nueva base de datos
    await clientConnection.createCollection('employees');
    await clientConnection.createCollection('products');
    await clientConnection.createCollection('orders');
    await clientConnection.createCollection('config');

    // Cerrar la conexión
    await clientConnection.close();

    res.status(201).json({ message: 'Ubicación agregada y base de datos creada exitosamente', user });
  } catch (error) {
    console.error('Error al agregar ubicación:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
// Ruta para añadir datos a una colección específica de la base de datos de la locación
router.post('/addDataToCollection', upload.single('imagen'), async (req, res) => {
  try {
    const { databaseName, collectionName, nombre, descripcion, precio, tipo, disponible } = req.body;
    const imagen = req.file; // Archivo enviado

    // Validar que los campos requeridos estén presentes
    if (!databaseName || !collectionName || !nombre || !descripcion || !precio || !tipo || disponible === undefined || !imagen) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Conectar a la base de datos especificada
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: "location_"+databaseName
    });

    // Crear el objeto del producto
    const productData = {
      nombre,
      descripcion,
      precio: parseFloat(precio), // Convertir el precio a número
      tipo,
      disponible: disponible === 'true', // Convertir el valor a booleano
      imagen: imagen.buffer // Guardar la imagen como binario
    };

    // Añadir los datos a la colección
    const collection = clientConnection.collection(collectionName);
    const result = await collection.insertOne(productData);

    // Cerrar la conexión
    await clientConnection.close();

    res.status(201).json({ message: 'Producto añadido exitosamente', result });
  } catch (error) {
    console.error('Error al añadir datos a la colección:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
router.get('/getDataFromCollection', async (req, res) => {
  try {
    const { nombre, collectionName } = req.query;

    // Validar que los campos requeridos estén presentes
    if (!nombre || !collectionName) {
      return res.status(400).json({ error: 'El nombre de la locación y la colección son obligatorios' });
    }

    // Generar el nombre de la base de datos
    const databaseName = `location_${nombre.toLowerCase().replace(/\s+/g, '_')}`;
    console.log(databaseName);

    // Conectar a la base de datos de la locación
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName
    });

    // Crear un modelo dinámico para la colección
    const DynamicModel = clientConnection.model(
      collectionName,
      new mongoose.Schema({}, { strict: false }) // Esquema flexible
    );

    // Obtener los datos de la colección
    const data = await DynamicModel.find({});

    // Cerrar la conexión
    await clientConnection.close();

    res.status(200).json({ message: 'Datos obtenidos exitosamente', data });
  } catch (error) {
    console.error('Error al obtener datos de la colección:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});




const getRoleModel = (dbConnection) => {
  return dbConnection.model('Role', roleSchema); // Crear el modelo dinámico
};

router.post('/registerRoles', async (req, res) => {
  try {
    const { databaseName, roles } = req.body;

    // Validar que los datos requeridos estén presentes
    if (!databaseName || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'El nombre de la base de datos y un array de roles son obligatorios.' });
    }

    // Conectar a la base de datos del usuario
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    // Obtener el modelo dinámico para los roles
    const Role = getRoleModel(clientConnection);
    console.log('Creando modelo dinámico para roles:', Role);

    // Insertar los roles en la colección
    const result = await Role.insertMany(roles, { ordered: false }); // `ordered: false` permite continuar si hay duplicados

    // Cerrar la conexión
    await clientConnection.close();

    res.status(201).json({ message: 'Roles registrados exitosamente.', data: result });
  } catch (error) {
    console.error('Error al registrar los roles:', error.message);
    res.status(500).json({ error: 'Error al registrar los roles' });
  }
});
router.get('/getRoles', async (req, res) => {
  try {
    const { databaseName } = req.query;

    // Validar que el nombre de la base de datos esté presente
    if (!databaseName) {
      return res.status(400).json({ error: 'El nombre de la base de datos es obligatorio.' });
    }

    // Conectar a la base de datos del usuario
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    // Obtener el modelo dinámico para los roles
    const Role = getRoleModel(clientConnection);

    // Obtener los roles disponibles
    const roles = await Role.find({ disponible: true });

    // Cerrar la conexión
    await clientConnection.close();

    res.status(200).json({ message: 'Roles obtenidos exitosamente.', data: roles });
  } catch (error) {
    console.error('Error al obtener los roles:', error.message);
    res.status(500).json({ error: 'Error al obtener los roles' });
  }
});
router.put('/updateRole', async (req, res) => {
  try {
    const { databaseName, roleId, updates } = req.body;

    // Validar que los datos requeridos estén presentes
    if (!databaseName || !roleId || !updates) {
      return res.status(400).json({ error: 'El nombre de la base de datos, el ID del rol y los datos a actualizar son obligatorios.' });
    }

    // Conectar a la base de datos del usuario
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    // Obtener el modelo dinámico para los roles
    const Role = getRoleModel(clientConnection);

    // Actualizar el rol
    const updatedRole = await Role.findByIdAndUpdate(roleId, updates, { new: true });

    // Cerrar la conexión
    await clientConnection.close();

    res.status(200).json({ message: 'Rol actualizado exitosamente.', data: updatedRole });
  } catch (error) {
    console.error('Error al actualizar el rol:', error.message);
    res.status(500).json({ error: 'Error al actualizar el rol' });
  }
});
router.delete('/deleteRole', async (req, res) => {
  try {
    const { databaseName, roleId } = req.body;
    // Validar que los datos requeridos estén presentes
    if (!databaseName || !roleId) {
      return res.status(400).json({ error: 'El nombre de la base de datos y el ID del rol son obligatorios.' });
    }

    // Conectar a la base de datos del usuario
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    // Obtener el modelo dinámico para los roles
    const Role = getRoleModel(clientConnection);

    // Eliminar el rol
    await Role.findByIdAndDelete(roleId);

    // Cerrar la conexión
    await clientConnection.close();

    res.status(200).json({ message: 'Rol eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar el rol:', error.message);
    res.status(500).json({ error: 'Error al eliminar el rol' });
  }
});
module.exports = router;