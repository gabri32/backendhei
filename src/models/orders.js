// models/Pedido.js o Pedido.ts si usas TypeScript con Mongoose
const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  cantidad: { type: Number, required: true },
  precioUnitario: { type: Number, required: true },
});

const pedidoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['en_local', 'para_llevar', 'a_domicilio'],
    required: true,
  },
  estado: {
    type: String,
    enum: ['creado', 'enviado', 'preparado', 'entregado', 'facturado', 'cancelado'],
    default: 'creado',
  },
  mesa: { type: String, required: function() { return this.tipo === 'en_local'; } },
  direccion: { type: String, required: function() { return this.tipo === 'a_domicilio'; } },
  telefono: { type: String, required: function() { return this.tipo === 'a_domicilio'; } },
  productos: { type: [productoSchema], required: true },
  creadoPor: { type: String, required: true },
  horaCreacion: { type: Date, default: Date.now },
});


const pedido = mongoose.model('pedido', pedidoSchema);
module.exports = pedido;
