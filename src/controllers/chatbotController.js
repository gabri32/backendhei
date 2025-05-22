const mongoose = require('mongoose');
const getPromptModel = require('../models/prompt');
const axios = require('axios');

const promptsCache = [];

const frasesConfirmacion = [
  "sí", "por favor", "sí, por favor", "confirmo", "adelante", "hazlo",
  "eso quiero", "lo quiero", "quiero eso", "está bien", "sí quiero eso",
  "pídelo", "haz el pedido", "ok, hazlo", "realiza el pedido", "sí, eso es todo", "si pidelo"
];

function detectarConfirmacion(texto) {
  const normalizado = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '');
  return frasesConfirmacion.some(frase => normalizado.includes(frase));
}

function generarPromptDesdeDocumento(doc) {
  const categorias = doc.categorias
    .filter(c => c.active)
    .map(cat => `- ${cat.name}`)
    .join('\n');

  const productos = doc.productos
    .filter(p => p.active)
    .map(p => {
      const precio = typeof p.precio === 'number' ? `$${p.precio.toFixed(0)}` : p.precio;
      return `🍽️ *${p.nombre}* - ${precio}\n_${p.descripcion}_`;
    })
    .join('\n\n');

  const parametros = doc.parametros?.map(p => p.titulo) || [];

 return `
Eres un asistente ${doc.tono || 'amigable'} de un restaurante. Tu tarea es mostrar productos, responder dudas sobre ellos, tomar pedidos, confirmar, y guiar al usuario amablemente.

📦 *Categorías disponibles:*
${categorias}

🍽️ *Productos disponibles:*
${productos.length} productos activos. No los menciones todos tú. El sistema los mostrará automáticamente.

✅ Frase de confirmación del pedido:
"${doc.frasesConfirmacion}"

🔄 Frase de corrección del pedido:
"${doc.instruccionesCorreccion}"

📌 Al tomar un pedido, solicita estos datos extra: ${parametros.join(', ') || 'ninguno'}.

🧠 RESPONDE ASÍ:
- Si el usuario pide algo específico, responde con algo como: “Sí, tenemos hamburguesas deliciosas 🍔, mira:”
- Si el usuario quiere ver todo, responde: “¡Perfecto! Aquí tienes todo el menú 👇”
- No escribas listas completas ni detalles de productos. El sistema mostrará los productos automáticamente.

🚫 No respondas temas fuera del menú. No inventes productos ni cambies precios.
`.trim();

}

const chatBotHandler = async (req, res) => {
  const { mensajeUsuario, dbName, userId, sessionId } = req.body;

  if (!mensajeUsuario || !dbName || (!userId && !sessionId)) {
    return res.status(400).json({
      error: "Faltan campos requeridos: mensajeUsuario, dbName, userId o sessionId."
    });
  }

  try {
    if (!promptsCache[dbName]) {
      const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
      const clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
        dbName: databaseName,
      });

      const Prompt = getPromptModel(clientConnection);
      const promptDoc = await Prompt.findOne({});
      if (!promptDoc) {
        return res.status(500).json({ error: "No se encontró un prompt en la base de datos." });
      }

      promptsCache[dbName] = {
        promptDoc,
        promptTexto: generarPromptDesdeDocumento(promptDoc)
      };
    }

    const { promptDoc, promptTexto } = promptsCache[dbName];
    const productos = promptDoc.productos || [];

    const mensajes = [
      { role: 'system', content: promptTexto },
      { role: 'user', content: mensajeUsuario }
    ];

    const respuesta = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1-nano',
        messages: mensajes
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const textoCompleto = respuesta.data.choices[0].message.content;

    // 🧠 Detectar productos desde el mensaje del usuario, no desde la IA
    const textoUsuarioNormalizado = mensajeUsuario
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/gi, '');

    // Detectar si el usuario quiere ver todo
    const frasesTodoElMenu = ["todo el menú", "todo lo que tienes", "muéstrame todo", "que tienes", "ver menú", "mostrar productos"];
    const quiereTodo = frasesTodoElMenu.some(frase =>
      textoUsuarioNormalizado.includes(frase.replace(/[^a-z0-9 ]/gi, ''))
    );

    let productosSugeridos = [];
// 🔍 Detectar frases tipo "quiero X con Y" o combos
const partesPedido = textoUsuarioNormalizado.split(/con|y|acompañado de|más/i).map(p => p.trim());


for (const parte of partesPedido) {
  for (const p of productos) {
    const nombreNormalizado = p.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');

    if (parte.includes(nombreNormalizado)) {
      productosSugeridos.push(p._id);
    }
  }
}

    if (quiereTodo) {
      productosSugeridos = productos.map(p => p._id);
    } else {
      for (const p of productos) {
        const nombreNormalizado = p.nombre
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '');

        if (textoUsuarioNormalizado.includes(nombreNormalizado)) {
          productosSugeridos.push(p._id);
        }
      }
    }

    const productosSugeridosUnicos = [...new Set(productosSugeridos)];

    return res.json({
      respuesta: textoCompleto,
      productosSugeridos: productosSugeridosUnicos
    });

  } catch (error) {
    console.error('Error en el chatbot:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error procesando tu mensaje.' });
  }
};




const createChatbot = async (req, res) => {
  let clientConnection;
  try {
    console.log("🟢 Datos recibidos en createChatbot:", req.body);

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

    const categoriasSinImagen = Array.isArray(categorias)
      ? categorias.map(cat => {
          const { imageUrl, ...rest } = cat;
          return rest;
        })
      : [];

    const productosSinImagen = Array.isArray(productos)
      ? productos.map(prod => {
          const { imagen, ...rest } = prod;
          return rest;
        })
      : [];

    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    console.log("🟢 Conectando a base de datos:", databaseName);

    clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    const Prompt = clientConnection.model(
      'prompt',
      new mongoose.Schema({
        nombreAsistente: String,
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

    const newPrompt = new Prompt({
      nombreAsistente,
      categorias: categoriasSinImagen,
      frasesConfirmacion,
      instruccionesCorreccion,
      parametros,
      productos: productosSinImagen,
      redesSociales,
      tono,
    });

    const result = await newPrompt.save();
    res.status(201).json({ message: 'Chatbot creado exitosamente.', data: result });

  } catch (error) {
    console.error('Error al crear el chatbot:', error.message);
    res.status(500).json({ error: 'Error al crear el chatbot' });
  } finally {
    if (clientConnection) await clientConnection.close();
  }
};

module.exports = { chatBotHandler, createChatbot };
