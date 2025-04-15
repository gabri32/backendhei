const mongoose = require('mongoose');

const restauranteSchema = new mongoose.Schema({
  // Define los campos de la colección aquí
  name: String,
  location:{
    id: String,
    name: String,
    headerImageUrl: String,
    country: String,
    city: String,
    address: String,
    phone: String,
    locationUrl: String,
    businessHours: String,
  },
  owner: {
    name: String,
    email: String,
    phone: String,
    password: String,
    promt:String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    default: 'active'
  },
  databaseName: String,
  membership: {
    type: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    autoRenew: Boolean
  },
  config: {
    theme: String,
    language: String,
    currency: String
  }
  // Agrega más campos según tu esquema
}, { collection: 'restaurantes' }); // Asegúrate de usar el nombre exacto de la colección

const Restaurante = mongoose.model('Restaurante', restauranteSchema);

module.exports = Restaurante;