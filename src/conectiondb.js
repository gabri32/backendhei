require('dotenv').config();
const mongoose = require('mongoose');

const connectToDatabase = async () => {
  try {
    const uri = process.env.HEII_MONGO_URI;
    const dbName = process.env.HEII_MONGO_DB_NAME;

    if (!uri || !dbName) {
      throw new Error('Faltan variables de entorno para la conexión a la base de datos.');
    }

    await mongoose.connect(uri, {
      dbName,
    });

    console.log('Conexión exitosa a la base de datos');
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
    process.exit(1); // Finaliza el proceso si no se puede conectar
  }
};

module.exports = connectToDatabase;