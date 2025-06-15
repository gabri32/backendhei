const express = require('express');
const ThermalPrinter = require("node-thermal-printer").printer;
const Types = require("node-thermal-printer").types;
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurantes');
const Role = require('../models/roles');
const employeeSchema = require('../models/employees'); // Importar el esquema de empleados
const categoriaSchema = require('../models/categoria');
const Pedido = require('../models/orders');
const  sendPedidoConfirmacion  = require('../utils/sendPedidoConfirmacion');
require('dotenv').config();
const Joi = require('joi');
const multer = require('multer');
const upload = multer();
const nodemailer = require('nodemailer');
const LSMembership = require('../models/membership');
const SALT_ROUNDS = 10;
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
      imagen: { type: Buffer },
      headerimage: { type: Buffer }
    }
  ]
});
const Users = mongoose.model('users', userSchema);
const staff = require('../models/usuarios');
const clients = require('../models/client');
const { getIO } = require('../utils/socket'); // Ajusta la ruta si es necesario


router.post('/login', async (req, res) => {
  try {

    if (req) {
      console.log(req.body)
      const { email, password } = req.body;
      console.log('🔑 Datos de inicio de sesión:', req.body);
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
        res.status(200).json({ message: 'Inicio de sesión exitoso', user, token, mebresiaparams });
      }
      else {
        res.status(200).json({ message: 'Inicio de sesión exitoso', user, token });
      }
    }
    else {
      res.status(500).json({ error: 'Error en el req' });
    }
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
router.post('/wompi-webhook', async (req, res) => {
  try {
    const event = req.body.event;
    const transaction = req.body.data?.transaction;
console.log("📩 Webhook recibido:", {
  event,
  transactionId: transaction.id,
  userId: transaction.sku,
  status: transaction.status,
  amount: transaction.amount_in_cents,
  reference: transaction.reference,
});

    if (event === 'transaction.updated' && transaction.status === 'APPROVED') {
      const userId = transaction.sku;  // authData._id
      const planId = transaction.metadata?.planId;
      const planName = transaction.metadata?.planName;

      const user = await Users.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado para webhook' });
      }

      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setMonth(fechaInicio.getMonth() + 1);

      user.plan = {
        id: planId,
        nombre: planName,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString()
      };

      user.estadoMembresia = "activa";
      user.datosCompletos = true;

      await user.save();

      console.log(`✅ Membresía activada por webhook para usuario ${user.email}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error en webhook:", err.message);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
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
    if (user.locations.length === 0) {
      return res.status(404).json({ error: 'El usuario no tiene locaciones registradas' });
    }
    res.status(200).json(user.locations
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
    await clientConnection.createCollection('productos');
    await clientConnection.createCollection('orders');
    await clientConnection.createCollection('config');
    await clientConnection.createCollection('roles');
    await clientConnection.createCollection('prompt');

    // Cerrar la conexión
    await clientConnection.close();

    res.status(201).json({ message: 'Ubicación agregada y base de datos creada exitosamente', user });
  } catch (error) {
    console.error('Error al agregar ubicación:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
router.get('/categorias/subcategorias', async (req, res) => {
  try {

    const { databaseName, categoryid } = req.query;

    if (!databaseName || !categoryid) {
      return res.status(400).json({ error: 'El nombre de la base de datos y el ID de la categoría son obligatorios.' });
    }

    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName,
    });

    const Categoria = clientConnection.model('categorias', categoriaSchema);
    const _id = categoryid;
    const categoria = await Categoria.findById(_id).lean();
    await clientConnection.close();

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    }

    res.status(200).json({ message: 'Subcategorías obtenidas exitosamente.', data: categoria.subcategorias });
  } catch (error) {
    console.error('Error al obtener subcategorías:', error.message);
    res.status(500).json({ error: 'Error interno al obtener subcategorías.' });
  }
});
router.post('/productos/upsert', upload.single('imagen'), async (req, res) => {
  try {
    const {
      databaseName,
      _id,
      nombre,
      descripcion,
      precio,
      id_sigo,
      categoryIds,
      subcategoryIds,
      puedeSerAgregadoACombo,
      permiteAdiciones
    } = req.body;

    const imagen = req.file;

    if (!databaseName || !nombre || !descripcion || !precio || !id_sigo || !categoryIds) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const parsedCategories = JSON.parse(categoryIds);
    const parsedSubcategories = subcategoryIds ? JSON.parse(subcategoryIds) : [];

    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, { dbName });
    const collection = clientConnection.collection('productos');

    const baseProductData = {
      nombre,
      descripcion,
      precio: parseFloat(precio),
      id_sigo,
      puedeSerAgregadoACombo: puedeSerAgregadoACombo === 'true',
      permiteAdiciones: permiteAdiciones === 'true',
      categoryIds: parsedCategories,
      subcategoryIds: parsedSubcategories,
      active: true,
      updatedAt: new Date()
    };

    let result;

    if (_id) {
      // Si hay imagen nueva, la incluimos. Si no, no tocamos la imagen.
      const updateData = {
        ...baseProductData,
        ...(imagen && { imagen: imagen.buffer }) // Solo si existe imagen
      };

      result = await collection.updateOne(
        { _id: new mongoose.Types.ObjectId(_id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        await clientConnection.close();
        return res.status(404).json({ error: 'Producto no encontrado para actualizar.' });
      }

      res.status(200).json({ message: 'Producto actualizado exitosamente', result });

    } else {
      // Crear nuevo producto (imagen obligatoria si la quieres así)
      const newProductData = {
        ...baseProductData,
        imagen: imagen ? imagen.buffer : undefined,
        createdAt: new Date()
      };

      result = await collection.insertOne(newProductData);
      res.status(201).json({ message: 'Producto creado exitosamente', result });
    }

    await clientConnection.close();
  } catch (error) {
    console.error('Error al crear o actualizar producto:', error.message);
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
 const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
const client = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
  dbName,
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
    console.log('Entrando a la ruta de toggle', req.body);
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

    // Normalizar el nombre de la base de datos
    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName
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


/**Funciones de empleados y ususarios 
 * TODAS CON dbName 
 * getEmployees
 * createEmployees
 * editEmployees
 * deleteEmployees
*/

router.get('/getEmployees', async (req, res) => {
  try {
    const { databaseName } = req.query;

    if (!databaseName) {
      return res.status(400).json({ error: 'El nombre de la base de datos es obligatorio.' });
    }

    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });

    const Employee = clientConnection.model('employees', employeeSchema);

    // Excluir el campo 'password' de la respuesta
    const employees = await Employee.find({}, { password: 0 });
    console.log('Empleados obtenidos:', employees);

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

    if (!databaseName || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'El nombre de la base de datos y un array de empleados son obligatorios.' });
    }

    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, { dbName });

    const Employee = clientConnection.model('employees', employeeSchema);
    const User = clientConnection.model('usuarios', staff);

    const results = [];

    for (const employee of employees) {
      try {
        if (!employee.email || !employee.password) {
          console.warn('Empleado sin email o password, se omite:', employee);
          continue;
        }

        // 1. Crear empleado
        const newEmployee = new Employee(employee);
        const savedEmployee = await newEmployee.save();

        // 2. Hashear contraseña
        const hashedPassword = await bcrypt.hash(employee.password, SALT_ROUNDS);

        // 3. Buscar si ya existe el usuario
        let user = await User.findOne({ email: employee.email });

        if (user) {
          // Ya existe (como cliente quizás), solo se actualiza ref_empleado
          user.ref_empleado = savedEmployee._id;
          user.password = hashedPassword; // opcional: podrías dejar la anterior
          await user.save();
        } else {
          // No existe, se crea
          await User.create({
            email: employee.email,
            password: hashedPassword,
            ref_empleado: savedEmployee._id,
            ref_cliente: null,
            sucursal: dbName
          });
        }

        results.push(savedEmployee);
        console.log('Empleado y usuario insertados:', savedEmployee.email);
      } catch (error) {
        console.error('Error al insertar el empleado:', employee.email, error.message);
      }
    }

    await clientConnection.close();
    res.status(201).json({ message: 'Empleados procesados correctamente.', data: results });
  } catch (error) {
    console.error('Error general al crear empleados:', error.message);
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

    // Usar el esquema importado directamente
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
    console.log('Entrando a la ruta de eliminar empleados', req.body);
    const { databaseName, id } = req.body;
    // Validar que los datos requeridos estén presentes
    if (!databaseName || !id._id) {
      return res.status(400).json({ error: 'El nombre de la base de datos y un array de IDs de empleados son obligatorios.' });
    }

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`
    });


    const User = clientConnection.model('usuarios', staff);
    const Employee = clientConnection.model('employees', employeeSchema);

    // Eliminar empleados uno por uno
    const results = [];

    try {
      const deletedUser = await User.findOneAndDelete({ ref_empleado: id._id });
      if (deletedUser) {
      const deletedEmployee = await Employee.findByIdAndDelete(id._id);
      
      if (deletedEmployee) {

        console.log('Empleado eliminado:', deletedEmployee);
      }
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


router.post('/auth/registerClient', async (req, res) => {
  try {
    const { databaseName, cliente } = req.body;

    if (!databaseName || !cliente || !cliente.email || !cliente.password) {
      return res.status(400).json({ error: 'Faltan datos del cliente o de la base de datos.' });
    }

    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, { dbName });

    const Cliente = clientConnection.model('clientes', clients);
    const User = clientConnection.model('usuarios', staff);

    const existe = await Cliente.findOne({ email: cliente.email });
    if (existe) {
      await clientConnection.close();
      return res.status(400).json({ error: 'Ya existe un cliente con ese email.' });
    }

    const newClient = new Cliente(cliente);
    const savedClient = await newClient.save();

    const hashedPassword = await bcrypt.hash(cliente.password, SALT_ROUNDS);

    let user = await User.findOne({ email: cliente.email });

    if (user) {
      user.ref_cliente = savedClient._id;
      user.password = hashedPassword;
      await user.save();
    } else {
      await User.create({
        email: cliente.email,
        password: hashedPassword,
        ref_empleado: null,
        ref_cliente: savedClient._id,
        sucursal: dbName
      });
    }

    await clientConnection.close();

    // Respuesta limpia
    res.status(201).json({
      message: 'Cliente registrado correctamente.',
      data: {
        _id: savedClient._id,
        nombre: savedClient.nombre,
        direccion: savedClient.direccion || '',
        telefono: savedClient.telefono || '',
        email: savedClient.email
      }
    });

  } catch (error) {
    console.error('Error al registrar cliente:', error.message);
    res.status(500).json({ error: 'Error al registrar cliente.' });
  }
});


router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, databaseName } = req.body;

    if (!email || !password || !databaseName) {
      return res.status(400).json({ error: 'Email, contraseña y base de datos son requeridos.' });
    }

    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const db = await mongoose.createConnection(process.env.HEII_MONGO_URI, { dbName });

    const User = db.model('usuarios', staff);
    const Cliente = db.model('clientes', clients);
    const Empleado = db.model('employees', employeeSchema);

    const user = await User.findOne({ email });
    if (!user) {
      await db.close();
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await db.close();
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    let tipo = '';
    const responseData = { email };

    if (user.ref_cliente) {
      const cliente = await Cliente.findById(user.ref_cliente).lean();
      if (cliente) {
        tipo += 'C';
        responseData.cliente = {
          _id: cliente._id,
          nombre: cliente.nombre,
          direccion: cliente.direccion || '',
          telefono: cliente.telefono || '',
          email: cliente.email,
          rol: ""
        };
      }
    }

    if (user.ref_empleado) {
      const empleado = await Empleado.findById(user.ref_empleado).lean();
      if (empleado) {
        tipo += 'E';
        responseData.empleado = {
          _id: empleado._id,
          nombre: empleado.nombre,
          direccion: empleado.direccion || '',
          telefono: empleado.telefono || '',
          email: empleado.email,
          rol: empleado.cargo.nombre ,
          permisos: empleado.permisos || [],
        };
      }
    }

    responseData.tipo = tipo;

    await db.close();
    return res.status(200).json({ message: 'Login exitoso', data: responseData });

  } catch (error) {
    console.error('Error en login:', error.message);
    return res.status(500).json({ error: 'Error al procesar login.' });
  }
});

router.get('/roles', async (req, res) => {
  try {
    const { databaseName } = req.query;

    if (!databaseName) {
      return res.status(400).json({ error: 'El nombre de la base de datos es obligatorio.' });
    }

    const dbName = `location_${databaseName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName
    });

    const Role = clientConnection.model('Role', require('../models/roles'));

    const roles = await Role.find({}).lean();
    await clientConnection.close();

    res.status(200).json({ message: 'Roles obtenidos exitosamente.', data: roles });
  } catch (error) {
    console.error('Error al obtener roles:', error.message);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
})

router.post('/crearOrders', async (req, res) => {
  try {
    const { dbName, ...pedidoData } = req.body;

    if (!dbName) {
      return res.status(400).json({ error: 'El nombre de la base de datos (dbName) es obligatorio.' });
    }

    const databaseName = `location_${dbName.toLowerCase().replace(/\\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    const PedidoModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));
    const nuevoPedido = await PedidoModel.create({
      ...pedidoData,
      estado: 'enviado',
      impreso: false,
      productosEditados: [],
      editado: false,
      ...(pedidoData.tipo === 'para_llevar' && pedidoData.nombreCliente ? { nombreCliente: pedidoData.nombreCliente } : {})
    });

    if (nuevoPedido.tipo === 'a_domicilio' && nuevoPedido.email) {
      await sendPedidoConfirmacion(nuevoPedido.email, nuevoPedido);
    }

    await clientConnection.close();

    res.status(201).json({ message: 'Pedido creado exitosamente.', data: nuevoPedido });
  } catch (error) {
    console.error('Error al crear pedido:', error.message);
    res.status(500).json({ error: 'Error al crear el pedido.' });
  }
});
router.patch('/agregarProductosPedido/:id', async (req, res) => {
  const { dbName, productosNuevos } = req.body;
  const { id } = req.params;

  if (!dbName || !productosNuevos || !Array.isArray(productosNuevos)) {
    return res.status(400).json({ error: 'Faltan datos requeridos o formato inválido.' });
  }

  const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
  const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
    dbName: databaseName,
  });

  try {
  const PedidoModel = clientConnection.model('orders', Pedido.schema);
    const pedido = await PedidoModel.findById(id);
console.log('Pedido encontrado:', pedido);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (pedido.estado !== 'enviado') return res.status(400).json({ error: 'Solo se pueden editar pedidos en estado enviado.' });

    // Inicializar si no existe
    if (!Array.isArray(pedido.productosagregados)) {
      pedido.productosagregados = [];
    }
if (pedido.productosagregados.length > 0) {
  // Si ya hay productos editados, agregar los nuevos a la lista existente
  pedido.productosagregados.push(...productosNuevos);
} else {
    pedido.productosagregados=productosNuevos;
    
}
    pedido.editado = true;
    pedido.markModified('productosEditados'); 

    await pedido.save();

    res.json({ message: 'Productos agregados correctamente', data: pedido });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al modificar el pedido.' });
  } finally {
    await clientConnection.close();
  }
});

router.get('/:dbName/ultimos-pedidos', async (req, res) => {
  try {
    const { dbName } = req.params;

    if (!dbName) {
      return res.status(400).json({ error: 'Falta el nombre de la base de datos (dbName).' });
    }

    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });
    const PedidoModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));
    console.log('Conectando a la base de datos:', databaseName);
    const pedidos = await PedidoModel.find({ estado: 'enviado', impreso: { $ne: true } }).limit(10);
    console.log('Pedidos encontrados:', pedidos); 
    await clientConnection.close();

    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos:', error.message);
    res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
});
router.patch('/:dbName/marcar-impreso/:id', async (req, res) => {
  try {
    const { dbName, id } = req.params;
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;

    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    const PedidoModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));

    const actualizado = await PedidoModel.findByIdAndUpdate(id, { impreso: true }, { new: true });

    await clientConnection.close();

    if (!actualizado) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    res.json({ message: 'Pedido marcado como impreso.', data: actualizado });
  } catch (error) {
    console.error('Error al actualizar pedido:', error.message);
    res.status(500).json({ error: 'Error al actualizar el pedido.' });
  }
});

 

router.get('/getOrdersByEstado', async (req, res) => {
  const { estado, dbName } = req.query;

  // Validar que los parámetros requeridos estén presentes
  if (!estado || !dbName) {
    return res.status(400).json({ error: 'Parámetros requeridos: estado, dbName' });
  }

  try {
    // Generar el nombre de la base de datos
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    // Crear un modelo dinámico para la colección `orders`
    const OrderModel = clientConnection.model(
      'orders',
      new mongoose.Schema({}, { strict: false }) // Esquema flexible
    );

    // Consultar los pedidos por estado y ordenarlos por fecha de creación
    const pedidos = await OrderModel.find({ estado }).sort({ createdAt: -1 }).lean();

    // Cerrar la conexión
    await clientConnection.close();

    // Responder con los pedidos obtenidos
    res.status(200).json({ message: 'Pedidos obtenidos exitosamente.', data: pedidos });
  } catch (error) {
    console.error('❌ Error al obtener pedidos por estado:', error.message);
    res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
});

router.patch('/updateOrderEstado/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, dbName } = req.body;

  // Validar que los parámetros requeridos estén presentes
  if (!estado || !dbName) {
    return res.status(400).json({ error: 'Parámetros requeridos: estado, dbName' });
  }

  try {
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    // Convertir el ID a ObjectId
    const objectId = new mongoose.Types.ObjectId(id);

    // Actualizar el estado del pedido
    const result = await clientConnection.collection('orders').updateOne(
      { _id: objectId },
      { $set: { estado } }
    );

    // Verificar si se realizó algún cambio
    if (result.modifiedCount === 0) {
      await clientConnection.close();
      return res.status(404).json({ error: 'Pedido no encontrado o sin cambios' });
    }

    // Cerrar la conexión
    await clientConnection.close();

    res.json({ message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar estado del pedido:', error.message);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
});
router.get('/orders', async (req, res) => {
  const { dbName } = req.query;
  if (!dbName) {
    return res.status(400).json({ error: 'El nombre de la base de datos (dbName) es obligatorio.' });
  }

  try {
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    const OrderModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));

    const pedidos = await OrderModel.find({})
      .sort({ estado: 1, horaCreacion: -1 }) // Ordenar por estado y luego por fecha de creación
      .lean();

    await clientConnection.close();
console.log("Pedidos obtenidos:", pedidos);
    res.status(200).json({ message: 'Pedidos obtenidos exitosamente.', data: pedidos });
  } catch (error) {
    console.error('Error al obtener pedidos:', error.message);
    res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
});
router.get('/orders/entregados', async (req, res) => {
  const { dbName } = req.query;

  if (!dbName) {
    return res.status(400).json({ error: 'El nombre de la base de datos (dbName) es obligatorio.' });
  }

  try {
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    const OrderModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));

    const pedidosEntregados = await OrderModel.find({ estado: 'entregado' })
      .sort({ horaCreacion: -1 }) // Ordenar por fecha de creación
      .lean();

    await clientConnection.close();

    res.status(200).json({ message: 'Pedidos entregados obtenidos exitosamente.', data: pedidosEntregados });
  } catch (error) {
    console.error('Error al obtener pedidos entregados:', error.message);
    res.status(500).json({ error: 'Error al obtener pedidos entregados.' });
  }
});
router.patch('/orders/:id/cancelar', async (req, res) => {
  const { id } = req.params;
  const { dbName } = req.body;

  if (!dbName) {
    return res.status(400).json({ error: 'El nombre de la base de datos (dbName) es obligatorio.' });
  }

  try {
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    const OrderModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));

    const pedidoCancelado = await OrderModel.findByIdAndUpdate(
      id,
      { estado: 'cancelado' },
      { new: true } // Retornar el documento actualizado
    );

    await clientConnection.close();

    if (!pedidoCancelado) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    res.status(200).json({ message: 'Pedido cancelado exitosamente.', data: pedidoCancelado });
  } catch (error) {
    console.error('Error al cancelar pedido:', error.message);
    res.status(500).json({ error: 'Error al cancelar pedido.' });
  }
});
router.patch('/orders/:id/baja', async (req, res) => {
  const { id } = req.params;
  const { dbName, motivo } = req.body;

  if (!dbName || !motivo) {
    return res.status(400).json({
      error: 'Se requieren dbName y motivo para dar de baja el pedido.'
    });
  }

  try {
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    const OrderModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));

    const pedidoActualizado = await OrderModel.findByIdAndUpdate(
      id,
      {
        estado: 'dado_de_baja',
        motivoBaja: motivo,
        fechaBaja: new Date()
      },
      { new: true }
    );

    await clientConnection.close();

    if (!pedidoActualizado) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    res.status(200).json({
      message: 'Pedido dado de baja correctamente.',
      data: pedidoActualizado
    });
  } catch (error) {
    console.error('Error al dar de baja pedido:', error.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.patch('/orders/:id/facturar', async (req, res) => {
  const { id } = req.params;
  const { dbName } = req.body;

  if (!dbName) {
    return res.status(400).json({ error: 'El nombre de la base de datos (dbName) es obligatorio.' });
  }

  try {
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    const OrderModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));

    const pedidoFacturado = await OrderModel.findByIdAndUpdate(
      id,
      { estado: 'facturado' },
      { new: true } // Retornar el documento actualizado
    );

    await clientConnection.close();

    if (!pedidoFacturado) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    res.status(200).json({ message: 'Pedido marcado como facturado exitosamente.', data: pedidoFacturado });
  } catch (error) {
    console.error('Error al facturar pedido:', error.message);
    res.status(500).json({ error: 'Error al facturar pedido.' });
  }
});
router.patch('/orders/:id/entregar', async (req, res) => {
  const { id } = req.params;
  const { dbName } = req.body;

  // Validar que los parámetros requeridos estén presentes
  if (!dbName) {
    return res.status(400).json({ error: 'El nombre de la base de datos (dbName) es obligatorio.' });
  }

  try {
    // Generar el nombre de la base de datos
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    // Crear un modelo dinámico para la colección `orders`
    const OrderModel = clientConnection.model('orders', new mongoose.Schema({}, { strict: false }));

    // Actualizar el estado del pedido a "entregado"
    const pedidoEntregado = await OrderModel.findByIdAndUpdate(
      id,
      { estado: 'entregado' },
      { new: true } // Retornar el documento actualizado
    );

    // Cerrar la conexión
    await clientConnection.close();

    // Verificar si el pedido fue encontrado y actualizado
    if (!pedidoEntregado) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }

    res.status(200).json({ message: 'Pedido marcado como entregado exitosamente.', data: pedidoEntregado });
  } catch (error) {
    console.error('Error al marcar pedido como entregado:', error.message);
    res.status(500).json({ error: 'Error al marcar pedido como entregado.' });
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

router.get('/clientes', async (req, res) => {
  const { dbName } = req.query;

  // Validar que el parámetro dbName esté presente
  if (!dbName) {
    return res.status(400).json({ error: 'El nombre de la base de datos (dbName) es obligatorio.' });
  }

  try {
    // Generar el nombre de la base de datos
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;

    // Conectar a la base de datos específica
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    // Crear un modelo dinámico para la colección `clientes`
    const ClienteModel = clientConnection.model('clientes', new mongoose.Schema({}, { strict: false }));

    // Obtener todos los clientes
    const clientes = await ClienteModel.find({}).lean();

    // Cerrar la conexión
    await clientConnection.close();

    // Responder con los clientes obtenidos
    res.status(200).json({ message: 'Clientes obtenidos exitosamente.', data: clientes });
  } catch (error) {
    console.error('Error al obtener clientes:', error.message);
    res.status(500).json({ error: 'Error al obtener clientes.' });
  }
});



router.delete('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { dbName } = req.query;

  if (!dbName || !id) {
    return res.status(400).json({ error: 'El nombre de la base de datos (dbName) y el id del cliente son obligatorios.' });
  }

  try {
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    const ClienteModel = clientConnection.model('clientes', new mongoose.Schema({}, { strict: false }));

    const deleted = await ClienteModel.findByIdAndDelete(id);

    await clientConnection.close();

    if (!deleted) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    res.status(200).json({ message: 'Cliente eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error.message);
    res.status(500).json({ error: 'Error al eliminar cliente.' });
  }
});

router.get('/productos/list', async (req, res) => {
  const { dbName } = req.query;

  if (!dbName) {
    return res.status(400).json({ error: 'El nombre de la base de datos (dbName) es obligatorio.' });
  }

  try {
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    // Modelos dinámicos
    const ProductoModel = clientConnection.model('productos', new mongoose.Schema({}, { strict: false }));
    const CategoriaModel = clientConnection.model('categorias', new mongoose.Schema({}, { strict: false }));

    // Traer productos y categorías
    const productos = await ProductoModel.find({}, {
      _id: 1,
      nombre: 1,
      precio: 1,
      descripcion: 1,
      categoryIds: 1
    }).lean();

    const categorias = await CategoriaModel.find({}, { _id: 1, name: 1 }).lean();

    // Crear un mapa de categorías para acceso rápido
    const categoriasMap = {};
    categorias.forEach(cat => {
      categoriasMap[cat._id.toString()] = cat.name;
    });

    // Agregar nombres de categorías a cada producto
    const productosConCategorias = productos.map(prod => ({
      ...prod,
      categorias: Array.isArray(prod.categoryIds)
        ? prod.categoryIds.map(catId => categoriasMap[catId.toString()] || null).filter(Boolean)
        : []
    }));

    await clientConnection.close();

    res.status(200).json({ message: 'Productos obtenidos exitosamente.', data: productosConCategorias });
  } catch (error) {
    console.error('Error al obtener productos:', error.message);
    res.status(500).json({ error: 'Error al obtener productos.' });
  }
});

module.exports = router;