const productSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String, required: true },
  precio: { type: Number, required: true },
  tipo: {
    type: String,
    enum: ['plato', 'bebida', 'adicional', 'combo'],
    required: true
  },
  ingredientes: [{ type: String }],
  disponible: { type: Boolean, default: true },
  imagen: { type: Buffer },
  permiteAdiciones: { type: Boolean, default: false }
});
