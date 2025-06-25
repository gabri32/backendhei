// models/SiigoConfig.js
const mongoose = require('mongoose');

const siigoConfigSchema = new mongoose.Schema({
  restaurante: { type: String, required: true },
  document_id: Number,
  customer_default_identification: String,
  seller_id: Number,
  cost_center_id: Number,
  payment_method_id: Number
}, { collection: 'sigo_config' });

module.exports = siigoConfigSchema;
