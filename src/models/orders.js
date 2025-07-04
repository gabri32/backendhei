// models/Pedido.js o Pedido.ts si usas TypeScript con Mongoose
const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  cantidad: { type: Number, required: true },
  precioUnitario: { type: Number, required: true },
  idSigo: { type: String, required: true },
  esCombo: { type: Boolean, default: false },
  adiciones: [{
    nombre: String,
    precio: Number,
    idSigo: String,
  }],
  itemsCombo: [{
    nombre: String,
    precio: Number,
    idSigo: String,
  }],
});


const pedidoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['en_local', 'para_llevar', 'a_domicilio'],
    required: true,
  },
  estado: {
    type: String,
    enum: ['creado', 'enviado', 'preparado', 'entregado', 'facturado', 'cancelado','dado_de_baja'],
    default: 'creado',
  },
  mesa: { type: String, required: function() { return this.tipo === 'en_local'; } },
  direccion: { type: String, required: function() { return this.tipo === 'a_domicilio'; } },
  telefono: { type: String, required: function() { return this.tipo === 'a_domicilio'; } },
  productos: { type: [productoSchema], required: true },
   productosagregados: { type: [productoSchema], required: true },
   editado: { type: Boolean, default: false },
  creadoPor: { type: String, required: true },
  horaCreacion: { type: Date, default: Date.now },
observaciones: { type: String },
  impreso: { type: Boolean, default: false },
  horaImpresion: { type: Date },
});


const pedido = mongoose.model('pedido', pedidoSchema);
module.exports = pedido;
