const express = require('express');
const   router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurantes');
const Role = require('../models/roles');
const employeeSchema = require('../models/employees'); // Importar el esquema de empleados
const categoriaSchema = require('../models/categoria');
require('dotenv').config();
const Joi = require('joi');
const sanitize = require('mongo-sanitize');
const multer = require('multer');
const upload = multer(); 
const uri = process.env.HEII_MONGO_URI;
const dbName = process.env.HEII_MONGO_DB_NAME;
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
async function hashPassword(plainPassword) {
  const saltRounds = 15;
  const hash = await bcrypt.hash(plainPassword, saltRounds);
  return hash;
}

const LSMembership = require('../models/membership');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  path: { type: String, required: false },
  password: { type: String, required: true },
  registrationDate: { type: Date, default: Date.now },
  verificationCode: { type: String }, // nuevo
  isVerified: { type: Boolean, default: false }, // nuevo
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
  path: { type: String, required: false },
  locations: [
    {
      nombre: { type: String, required: false },
      direccion: { type: String, required: false },
      telefono: { type: String, required: false },
      horario: { type: String, required: false },
      imagen: { type: Buffer } ,
      headerimage: { type: Buffer }
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
    console.log('🔑 ¿Contraseña válida?', isPasswordValid);
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
const mebresiaparams = await LSMembership.findById(user.plan.id);
  res.status(200).json({ message: 'Inicio de sesión exitoso', user,token, mebresiaparams });
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
const sendVerificationCode = async (email, code) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"HeiAdmin" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Código de Verificación - HeiAdmin',
    text: `Hola,
  
  Tu código de verificación es: ${code}
  
  Por favor, utiliza este código para completar tu registro. Si no solicitaste este código, ignora este mensaje.
  
  Gracias,
  El equipo de HeiAdmin
  © ${new Date().getFullYear()} HeiAdmin. Todos los derechos reservados.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Código de Verificación</h2>
        <p>Hola,</p>
        <p>Tu código de verificación es: <strong>${code}</strong></p>
        <p>Por favor, utiliza este código para completar tu registro. Si no solicitaste este código, ignora este mensaje.</p>
        <br>
        <p>Gracias,</p>
        <p>El equipo de HeiAdmin</p>
        <hr>
        <footer style="font-size: 12px; color: #777;">
          © ${new Date().getFullYear()} HeiAdmin. Todos los derechos reservados.
        </footer>
      </div>
    `,
  });
};

// Ruta modificada
router.post('/registerUser', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'El email y la contraseña son obligatorios' });
    }

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos

    const newUser = new Users({
      email,
      password: hashedPassword,
      verificationCode,
      isVerified: false,
    });

    await newUser.save();
    await sendVerificationCode(email, verificationCode);

    res.status(201).json({ message: 'Usuario registrado. Verifica tu correo.' });
  } catch (error) {
    console.error('Error al registrar el usuario:', error.message);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});
router.post('/verifyCode', async (req, res) => {
  const { email, code } = req.body;

  const user = await Users.findOne({ email });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (user.verificationCode !== code) {
    return res.status(400).json({ error: 'Código incorrecto' });
  }

  user.isVerified = true;
  user.verificationCode = null;
  await user.save();

  res.status(200).json({ message: 'Correo verificado con éxito' });
});

// Ruta para actulizar si tiene membresias
router.post('/updateUser', async (req, res) => {
  try {
    const { email, planId, planNombre, fechaInicio, fechaFin, estadoMembresia, datosCompletos } = req.body;

    // Validar que el email esté presente
    if (!email) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }

    // Buscar al usuario por email
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
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

    // // Obtener el nombre de la base de datos asociada a la locación
    // const databaseName = `location_${user.locations[0].nombre.toLowerCase().replace(/\s+/g, '_')}`;

    // // Conectar a la base de datos de la locación
    // const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
    //   dbName: databaseName
    // });



    // Cerrar la conexión
    // await clientConnection.close();

    // Responder con los datos de la locación y las colecciones
    res.status(200).json( user.locations
    );
  } catch (error) {
    console.error('Error al obtener las locaciones:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
router.post('/addLocation', upload.fields([
  { name: 'imagen', maxCount: 1 },
  { name: 'headerimage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { email, nombre, direccion, telefono, horario } = req.body;
    const files = req.files;

    const imagen = files?.imagen?.[0];
    const headerimage = files?.headerimage?.[0];
console.log(headerimage)
    // Validar que los campos requeridos estén presentes
    if (!email || !nombre || !direccion || !telefono || !horario || !imagen || !headerimage) {
      return res.status(400).json({ error: 'Todos los campos y ambas imágenes son obligatorios' });
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

    // Verificar si ya existe una base de datos con el mismo nombre
    const databaseName = `location_${nombre.toLowerCase().replace(/\s+/g, '_')}`;
    const adminConnection = mongoose.connection.useDb('admin');
    const databases = await adminConnection.db.admin().listDatabases();

    const databaseExists = databases.databases.some(db => db.name === databaseName);
    if (databaseExists) {
      return res.status(400).json({ error: `Ya existe una base de datos con el nombre "${databaseName}".` });
    }

    // Agregar la nueva locación al array de locaciones
    user.locations.push({
      nombre,
      direccion,
      telefono,
      horario,
      imagen: imagen.buffer,
      headerimage: headerimage.buffer
    });

    // Guardar los cambios en la base de datos del usuario
    await user.save();

    // Crear una nueva base de datos con el nombre proporcionado
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName
    });

    // Crear colecciones base en la nueva base de datos
    await clientConnection.createCollection('employees');
    await clientConnection.createCollection('products');
    await clientConnection.createCollection('orders');
    await clientConnection.createCollection('config');
    await clientConnection.createCollection('roles');

    // Cerrar la conexión
    await clientConnection.close();

    res.status(201).json({ message: 'Ubicación agregada y base de datos creada exitosamente', user });
  } catch (error) {
    console.error('Error al agregar ubicación:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/productos/create', upload.single('imagen'), async (req, res) => {
  try {
    const {
      databaseName,
      nombre,
      descripcion,
      precio,
      id_sigo,
      categoryIds
    } = req.body;

    const imagen = req.file;

    if (!databaseName || !nombre || !descripcion || !precio || !id_sigo || !categoryIds || !imagen) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Parsear arrays enviados como string
    const parsedCategories = JSON.parse(categoryIds);

    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: "location_" + databaseName
    });

    const collection = clientConnection.collection('productos');

    const productData = {
      nombre,
      descripcion,
      precio: parseFloat(precio),
      id_sigo,
      categoryIds: parsedCategories,
      imagen: imagen.buffer, // o podrías guardar URL si subes a cloud
      active: true,
      createdAt: new Date()
    };

    const result = await collection.insertOne(productData);
    await clientConnection.close();

    res.status(201).json({ message: 'Producto creado exitosamente', result });
  } catch (error) {
    console.error('Error al crear producto:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
router.get('/categorias', async (req, res) => {
  const { databaseName } = req.query;

  if (!databaseName) {
    return res.status(400).json({ error: 'Falta el nombre de la base de datos' });
  }

  try {
    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName
    });

    const Categoria = clientConnection.model('Categoria', categoriaSchema, 'categorias');

    const categorias = await Categoria.find({}).lean();
    await clientConnection.close();

    res.status(200).json({ message: 'Categorías obtenidas exitosamente.', data: categorias });
  } catch (error) {
    console.error('Error al obtener categorías:', error.message);
    res.status(500).json({ error: 'Error interno al obtener categorías' });
  }
});
router.post('/categorias/create', upload.single('imagen'), async (req, res) => {
  try {
    const { databaseName, name } = req.body;
    const imagen = req.file;

    if (!databaseName || !name || !imagen || !req.body.subcategorias) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Parsear subcategorias (viene como string)
    let subcategorias;
    try {
      subcategorias = JSON.parse(req.body.subcategorias);
      if (!Array.isArray(subcategorias)) throw new Error('Formato inválido');
    } catch (err) {
      return res.status(400).json({ error: 'Subcategorías con formato inválido' });
    }

    // Convertir imagen a base64
    const buffer = imagen.buffer;
    const base64Image = buffer.toString('base64');

    // Crear objeto categoría
    const categoria = {
      name,
      imageUrl: base64Image,
      createdAt: new Date(),
      subcategorias,
    };

    // Conexión dinámica a base de datos
    const client = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: 'location_' + databaseName,
    });

    // Validación de existencia previa
    const existe = await client.collection('categorias').findOne({ name });
    if (existe) {
      await client.close();
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }

    // Guardar en base de datos
    const result = await client.collection('categorias').insertOne(categoria);
    await client.close();

    res.status(201).json({ message: 'Categoría creada con éxito', result });
  } catch (error) {
    console.error('Error al crear categoría:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



router.put('/categorias/update', async (req, res) => {
  try {
    const { databaseName, _id, name } = req.body;
    if (!databaseName || !_id || !name) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const connection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName
    });

    const Categoria = connection.model('Categoria', categoriaSchema, 'categorias');

    const result = await Categoria.updateOne({ _id: _id }, { $set: { name } });

    await connection.close();
    res.status(200).json({ message: 'Categoría actualizada', result });
  } catch (error) {
    console.error('Error al actualizar categoría:', error.message);
    res.status(500).json({ error: 'Error interno al actualizar' });
  }
});

router.put('/categorias/toggle', async (req, res) => {
  try {
    const { databaseName, _id } = req.body;
    console.log('Entrando a la ruta de toggle',req.body);
    if (!databaseName || !_id) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const connection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName
    });

    const Categoria = connection.model('Categoria', categoriaSchema, 'categorias');

    const categoria = await Categoria.findById(_id);
    if (!categoria) {
      await connection.close();
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    categoria.active = !categoria.active;
    await categoria.save();

    await connection.close();
    res.status(200).json({ message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error al cambiar estado de categoría:', error.message);
    res.status(500).json({ error: 'Error interno al cambiar estado' });
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






function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

router.post('/registerRoles', async (req, res) => {
  try {
    const { databaseName, roles } = req.body;

    if (!databaseName || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'El nombre de la base de datos y un array de roles son obligatorios.' });
    }

    console.log('Conectando a la base de datos:', `location_${databaseName}`);
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    const roleSchema = require('../models/roles');
    const Role = clientConnection.model('Role', roleSchema);

    const results = [];

    for (const role of roles) {
      try {
        const exists = await Role.findOne({
          $or: [
            { nombre: role.nombre },
            { descripcion: role.descripcion || null }
          ]
        });

        if (exists) {
          console.log('Rol duplicado, omitido:', role.nombre);
          continue;
        }

        const newRole = new Role(role);
        const savedRole = await newRole.save();
        results.push(savedRole);
        console.log('Rol insertado:', savedRole);
      } catch (error) {
        console.error('Error al insertar el rol:', role, error.message);
      }
    }

    await clientConnection.close();

    res.status(201).json({
      message: 'Roles procesados. Roles duplicados fueron omitidos.',
      data: results
    });
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

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    // Crear el modelo `Role` en la base de datos específica
    const Role = clientConnection.model('Role', require('../models/roles'));

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
// Ruta para actualizar un rol
router.put('/updateRole', async (req, res) => {
  try {
    const { databaseName, roleId, updates } = req.body;

    // Validar que los datos requeridos estén presentes
    if (!databaseName || !roleId || !updates) {
      return res.status(400).json({ error: 'El nombre de la base de datos, el ID del rol y los datos a actualizar son obligatorios.' });
    }

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName}`
    });

    // Crear el modelo `Role` en la base de datos específica
    const Role = clientConnection.model('Role', require('../models/roles'));

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

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    // Crear el modelo `Role` en la base de datos específica
    const Role = clientConnection.model('Role', require('../models/roles'));

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




router.get('/getEmployees', async (req, res) => {
  try {
    const { databaseName } = req.query;

    // Validar que el nombre de la base de datos esté presente
    if (!databaseName) {
      return res.status(400).json({ error: 'El nombre de la base de datos es obligatorio.' });
    }

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    // Crear el modelo `Employee` en la base de datos específica
    const Employee = clientConnection.model('employees', employeeSchema);

    // Obtener todos los empleados
    const employees = await Employee.find({});
    console.log('Empleados obtenidos:', employees);

    // Cerrar la conexión
    await clientConnection.close();

    res.status(200).json({ message: 'Empleados obtenidos exitosamente.', data: employees });
  } catch (error) {
    console.error('Error al obtener empleados:', error.message);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});
router.post('/createEmployees', async (req, res) => {
  try {
    const { databaseName, employees } = req.body;

    // Validar que los datos requeridos estén presentes
    if (!databaseName || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'El nombre de la base de datos y un array de empleados son obligatorios.' });
    }

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    // Crear el modelo `Employee` en la base de datos específica

    const Employee = clientConnection.model('employees', employeeSchema);

    // Insertar empleados uno por uno
    const results = [];
    for (const employee of employees) {
      try {
        const newEmployee = new Employee(employee);
        const savedEmployee = await newEmployee.save();
        results.push(savedEmployee);
        console.log('Empleado insertado:', savedEmployee);
      } catch (error) {
        console.error('Error al insertar el empleado:', employee, error.message);
      }
    }

    // Cerrar la conexión
    await clientConnection.close();

    res.status(201).json({ message: 'Empleados procesados.', data: results });
  } catch (error) {
    console.error('Error al crear empleados:', error.message);
    res.status(500).json({ error: 'Error al crear empleados' });
  }
});

router.put('/editEmployees', async (req, res) => {
  try {
    const { databaseName, employees } = req.body;

    // Validar que los datos requeridos estén presentes
    if (!databaseName || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'El nombre de la base de datos y un array de empleados son obligatorios.' });
    }

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    // Crear el modelo `Employee` en la base de datos específica
    const employeeSchema = new mongoose.Schema({
      nombre: { type: String, required: true },
      edad: { type: Number, required: true },
      telefono: { type: String, required: true },
      direccion: { type: String, required: true },
      cargo: {
        nombre: { type: String, required: true },
        descripcion: { type: String, required: false }
      }
    });
    const Employee = clientConnection.model('employees', employeeSchema);

    // Actualizar empleados uno por uno
    const results = [];
    for (const employee of employees) {
      try {
        const updatedEmployee = await Employee.findOneAndUpdate(
          { _id: employee._id }, // Buscar por ID del empleado
          employee, // Actualizar con los nuevos datos
          { new: true } // Retornar el documento actualizado
        );
        if (updatedEmployee) {
          results.push(updatedEmployee);
          console.log('Empleado actualizado:', updatedEmployee);
        } else {
          console.log('Empleado no encontrado:', employee._id);
        }
      } catch (error) {
        console.error('Error al actualizar el empleado:', employee, error.message);
      }
    }

    // Cerrar la conexión
    await clientConnection.close();

    res.status(200).json({ message: 'Empleados actualizados.', data: results });
  } catch (error) {
    console.error('Error al editar empleados:', error.message);
    res.status(500).json({ error: 'Error al editar empleados' });
  }
});


router.delete('/deleteEmployees', async (req, res) => {
  try {
    console.log('Entrando a la ruta de eliminar empleados',req.body);
    const { databaseName, id } = req.body;

    // Validar que los datos requeridos estén presentes
    if (!databaseName || !id._id) {
      return res.status(400).json({ error: 'El nombre de la base de datos y un array de IDs de empleados son obligatorios.' });
    }

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    
   
    const Employee = clientConnection.model('employees', employeeSchema);

    // Eliminar empleados uno por uno
    const results = [];
 
      try {
        const deletedEmployee = await Employee.findByIdAndDelete(id._id);
        if (deletedEmployee) {
          
          console.log('Empleado eliminado:', deletedEmployee);
        } else {
          console.log('Empleado no encontrado:', id);
        }
      } catch (error) {
        console.error('Error al eliminar el empleado:', id, error.message);
      }
    

    // Cerrar la conexión
    await clientConnection.close();

    res.status(200).json({ message: 'Empleados eliminados.', data: results });
  } catch (error) {
    console.error('Error al eliminar empleados:', error.message);
    res.status(500).json({ error: 'Error al eliminar empleados' });
  }
});





router.get('/getLocationsByPath', async (req, res) => {
  try {
    const { path } = req.query;
console.log(path)
    // Validar que el path esté presente
    if (!path) {
      return res.status(400).json({ error: 'El path es obligatorio.' });
    }

    // Buscar al usuario por el path
    const user = await Users.findOne({ path });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado con el path proporcionado.' });
    }

    // Extraer todas las locaciones del usuario
    const locations = user.locations.map(location => ({
      id: location._id?.toString() || '', // Asegúrate de incluir un ID único si es necesario
      name: location.nombre,
      address: location.direccion,
      phone: location.telefono,
      city: "pasto",
      country: "colombia",
      businessHours: location.horario,
      logoUrl: location.imagen ? `data:image/png;base64,${location.imagen.toString('base64')}` : null,
      headerImageUrl: location.headerimage ? `data:image/png;base64,${location.headerimage.toString('base64')}` : null,
      email: user.email, // Agregar el email del usuario
    }));
console.log(locations)
    // Validar si hay locaciones
    if (locations.length === 0) {
      return res.status(404).json({ error: 'El usuario no tiene locaciones registradas.' });
    }

    // Responder con el path y las locaciones
    res.status(200).json({
      message: 'Locaciones obtenidas exitosamente.',
      path: user.path,
      data: locations
    });
  } catch (error) {
    console.error('Error al obtener las locaciones por path:', error.message);
    res.status(500).json({ error: 'Error en el servidor.' });
  }
});



module.exports = router;