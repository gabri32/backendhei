const mongoose = require('mongoose');

// Esquema para los cargos
const roleSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true }, // Nombre del cargo
  descripcion: { type: String, required: false }, // Descripción del cargo
  disponible: { type: Boolean, default: true } // Indica si el cargo está activo
});

// Exportar solo el esquema
module.exports = roleSchema;