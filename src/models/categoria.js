const mongoose = require('mongoose');

const subcategoriaSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true }
}, { _id: false });

const categoriaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
  subcategorias: { type: [subcategoriaSchema], default: [] },
  esBebida: { type: Boolean, default: false },
  esPlatoPrincipal: { type: Boolean, default: false },
  esAdicional: { type: Boolean, default: false }
});

module.exports = categoriaSchema;
