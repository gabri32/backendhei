const express = require('express');
const   router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurantes');
const Role = require('../models/roles');
const employeeSchema = require('../models/employees'); // Importar el esquema de empleados
const categoriaSchema = require('../models/categoria');
require('dotenv').config();
const Joi = require('joi');
const sanitize = require('mongo-sanitize');
const multer = require('multer');
const upload = multer(); 
const uri = process.env.HEII_MONGO_URI;
const dbName = process.env.HEII_MONGO_DB_NAME;
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const LSMembership = require('../models/membership');



module.exports = router;