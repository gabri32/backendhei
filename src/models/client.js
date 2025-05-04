const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  telefono: {
    type: String,
    required: true
  },
  direccion: {
    type: String
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  // Si quieres registrar edad, ciudad, etc., puedes añadir aquí
  fecha_registro: {
    type: Date,
    default: Date.now
  }
});

module.exports = clientSchema;
