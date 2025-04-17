const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String, required: true },
  precio: { type: Number, required: true },
  tipo: {
    type: String,
    enum: ['plato', 'bebida', 'adicional', 'combo'], // Tipos permitidos
    required: true
  },
  ingredientes: [{ type: String }], // Opcional: Lista de ingredientes (para platos o combos)
  disponible: { type: Boolean, default: true }, // Indica si el producto está disponible
  imagen: { type: Buffer } // Imagen del producto (opcional)
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;