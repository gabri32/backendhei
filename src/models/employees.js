const mongoose = require('mongoose');

// Esquema para los empleados
const employeeSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  edad: { type: Number, required: true },
  telefono: { type: String, required: true },
  direccion: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  cargo: {
    nombre: { type: String, required: true },
    descripcion: { type: String, required: false }
  },
  permisos: {
    type: [String],
    default: []
  }
});

// Exportar el esquema
module.exports = employeeSchema;
