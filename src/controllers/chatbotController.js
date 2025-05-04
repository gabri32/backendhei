const mongoose = require('mongoose');
const getPromptModel = require('../models/prompt'); 
const axios = require('axios');
// Caché de prompts por nombre de base
const promptsCache = {};

// Lista flexible de frases de confirmación
const frasesConfirmacion = [
  "sí",
  "por favor",
  "sí, por favor",
  "confirmo",
  "adelante",
  "hazlo",
  "eso quiero",
  "lo quiero",
  "quiero eso",
  "está bien",
  "sí quiero eso",
  "pídelo",
  "haz el pedido",
  "ok, hazlo",
  "realiza el pedido",
  "sí, eso es todo",
  "si pidelo"
];

// Detecta si el mensaje contiene una frase de confirmación
function detectarConfirmacion(texto) {
  const normalizado = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '');
  return frasesConfirmacion.some(frase => normalizado.includes(frase));
}

// Genera prompt estructurado desde el documento Mongo
function generarPromptDesdeDocumento(doc) {
  const categorias = doc.categorias
    .filter(c => c.active)
    .map(cat => ({
      id: cat._id,
      nombre: cat.name
    }));

  const productos = doc.productos
    .filter(p => p.active)
    .map(p => ({
      id: p._id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      categorias: p.categoryIds,
      subcategorias: p.subcategoryIds
    }));

  const parametros = doc.parametros?.map(p => p.titulo) || [];

  return `
Eres un asistente ${doc.tono || 'amigable'} de un restaurante. Tu tarea es mostrar productos, responder dudas sobre ellos, tomar pedidos, confirmar, y guiar al usuario amablemente.

📦 Categorías disponibles (JSON):
${JSON.stringify(categorias, null, 2)}

🍽️ Productos disponibles (JSON):
${JSON.stringify(productos, null, 2)}

✅ Frase de confirmación del pedido:
"${doc.frasesConfirmacion}"

🔄 Frase de corrección del pedido:
"${doc.instruccionesCorreccion}"

📌 Al tomar un pedido, solicita estos datos extra: ${parametros.join(', ') || 'ninguno'}.

🚫 No respondas temas fuera del menú. Si el usuario menciona algo no listado, indica que no está disponible. No inventes productos ni cambies precios.
`.trim();
}

const chatBotHandler = async (req, res) => {
  const { mensaje, mensajeUsuario, dbName, userId, sessionId, carrito } = req.body;

  if (!mensaje || !mensajeUsuario || !dbName || (!userId && !sessionId)) {
    return res.status(400).json({
      error: "Faltan campos requeridos: mensaje, mensajeUsuario, dbName, userId o sessionId."
    });
  }

  try {
    if (!promptsCache[dbName]) {
      console.log("Conectando a la base de datos dinámica:", dbName);
      const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
      const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
        dbName: databaseName,
      });
  
      const Prompt = getPromptModel(clientConnection);
      const promptDoc = await Prompt.findOne({});
      if (!promptDoc) return res.status(500).json({ error: "No se encontró un prompt en la base de datos." });

      promptsCache[dbName] = {
        promptDoc,
        promptTexto: generarPromptDesdeDocumento(promptDoc)
      };
    }

    const { promptDoc, promptTexto } = promptsCache[dbName];
    const esConfirmacion = detectarConfirmacion(mensajeUsuario);

    let mensajeResumen = null;

    if (Array.isArray(carrito) && carrito.length > 0 && esConfirmacion) {
      mensajeResumen = generarResumen(carrito, promptDoc.frasesConfirmacion);
    }

    const mensajes = [
      { role: 'system', content: promptTexto },
      { role: 'user', content: mensajeUsuario }
    ];

    if (mensajeResumen) {
      mensajes.push({ role: 'assistant', content: mensajeResumen });
    }

    const respuesta = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: mensajes
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ respuesta: respuesta.data.choices[0].message.content });
  } catch (error) {
    console.error('Error en el chatbot:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error procesando tu mensaje.' });
  }
};
const createChatbot = async (req, res) => {
  try {
    console.log("entraaaaaaaaa",req.body)   
    const {
      nombreAsistente,
      categorias,
      frasesConfirmacion,
      instruccionesCorreccion,
      parametros,
      productos,
      redesSociales,
      tono,
      dbName,
    } = req.body;


    if (!nombreAsistente) {
      return res.status(400).json({ error: 'El nombre del asistente es obligatorio.' });
    }

    // Conectar a la base de datos dinámica
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    // Crear el modelo para la colección `prompts`
    const Prompt = clientConnection.model(
      'Prompt',
      new mongoose.Schema({
        categorias: Array,
        frasesConfirmacion: String,
        instruccionesCorreccion: String,
        parametros: Array,
        productos: Array,
        redesSociales: Object,
        tono: String,
        createdAt: { type: Date, default: Date.now },
      }),
      'prompt'
    );

    // Crear el documento con los datos recibidos
    const newPrompt = new Prompt({
      categorias,
      frasesConfirmacion,
      instruccionesCorreccion,
      parametros,
      productos,
      redesSociales,
      tono,
    });

    // Guardar el documento en la base de datos
    const result = await newPrompt.save();

    // Cerrar la conexión
    await clientConnection.close();

    res.status(201).json({ message: 'Chatbot creado exitosamente.', data: result });
  } catch (error) {
    console.error('Error al crear el chatbot:', error.message);
    res.status(500).json({ error: 'Error al crear el chatbot' });
  }
};

module.exports = { chatBotHandler, createChatbot };


