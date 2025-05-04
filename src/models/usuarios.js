const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  ref_cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'clientes',
    default: null
  },
  ref_empleado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'empleados',
    default: null
  },
  sucursal: {
    type: String,
    required: true // o si lo manejas dinámico por conexión, puede omitirse
  },
  fecha_creacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = userSchema;
