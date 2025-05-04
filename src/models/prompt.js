const mongoose = require('mongoose');

const PromptSchema = new mongoose.Schema({
  categorias: [],
  frasesConfirmacion: String,
  instruccionesCorreccion: String,
  parametros: [String],
  productos: [],
  redesSociales: {
    instagram: String,
    facebook: String,
    twitter: String,
  },
  tono: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = (connection) => {
  return connection.model('Prompt', PromptSchema, 'prompt');
};
