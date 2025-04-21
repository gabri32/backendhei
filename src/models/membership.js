
const mongoose = require('mongoose');
const lSMembershipSchema = new mongoose.Schema({
  plan_name: String,
  plan_type:Number,
  description: String,
  includes: [String],
  chats_included: Number,
  precio_mensual_cop: Number,
  minutos_incluidos: Number,
  precio_por_minuto: Number,
  precio_total_cop: Number,
  additional: Boolean,
  sedes:Number,
  disponible: { type: Boolean, default: true } // Add the 'disponible' field
});

// Create the LSMembership model
const LSMembership = mongoose.model('lsmembership', lSMembershipSchema);
module.exports = LSMembership;