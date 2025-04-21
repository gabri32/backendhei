require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.HEII_MONGO_URI;
const dbName = process.env.HEII_MONGO_DB_NAME;
const express = require('express');
const router = express.Router();
const LSMembership = require('../models/membership');


// Corrected route definition
router.post('/registerMembershipBulk', async (req, res) => {
  try {
    // Ensure the database connection is established
    await mongoose.connect(uri, { dbName: dbName });
    console.log('Conexión exitosa a MongoDB');

    const dataToInsert = req.body;

    if (!Array.isArray(dataToInsert) || dataToInsert.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de planes para la creación masiva.' });
    }

    // Perform the bulk create operation
    const result = await LSMembership.insertMany(dataToInsert);

    res.status(201).json({ message: 'Membresías registradas exitosamente.', data: result });
  } catch (error) {
    console.error('Error al registrar las membresías:', error.message);
    res.status(500).json({ error: 'Error al registrar las membresías' });
  } finally {
    // Close the database connection
    // if (mongoose.connection.readyState === 1) {
    //   await mongoose.disconnect();
    //   console.log('Desconexión de MongoDB');
    // }
  }
});



router.get('/getMemberships', async (req, res) => {
    try{
        await mongoose.connect(uri, { dbName: dbName });
        const result = await LSMembership.find({});
        res.status(200).json({ message: 'Membresías obtenidas exitosamente.', data: result });
    }catch (error) {
        console.error('Error al obtener las membresías:', error.message);
        res.status(500).json({ error: 'Error al obtener las membresías' });
    }
    finally {
        // Close the database connection
        // if (mongoose.connection.readyState === 1) {
        //     await mongoose.disconnect();
        //     console.log('Desconexión de MongoDB');
        // }
    }
})
module.exports = router;