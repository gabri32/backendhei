const mongoose = require('mongoose');

// Esquema para los cargos
const roleSchema = new mongoose.Schema({
  
  nombre: { type: String, required: true, unique: true },
  descripcion: { type: String, required: false },
  disponible: { type: Boolean, default: true }
});

// Exportar solo el esquema
module.exports = roleSchema;