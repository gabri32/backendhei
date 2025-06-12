const mongoose = require('mongoose');
const getPromptModel = require('../models/prompt');
const axios = require('axios');

const promptsCache = [];

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
esta en productos disponibles ahi puede filtrar por categorias
🍽️ *Productos disponibles:*

. solo menciona nombre y precio en cop. El sistema los mostrará automáticamente  .

✅ Frase de confirmación del pedido:
"${doc.frasesConfirmacion}"

🔄 Frase de corrección del pedido:
"${doc.instruccionesCorreccion}"

📌 Al tomar un pedido, solicita estos datos extra: ${parametros.join(', ') || 'ninguno'}.

🧠 RESPONDE ASÍ:
- Si el usuario pide algo específico, responde con algo como: “Sí, tenemos hamburguesas deliciosas 🍔, mira:”
- Si el usuario quiere ver todo, responde: “¡Perfecto! Aquí tienes todo el menú 👇”
- Solo da el nombre y el valor del producto el usuario puede pedir por categorias o solo el producto. El sistema mostrará los productos automáticamente.

🚫 No respondas temas fuera del menú. No inventes productos ni cambies precios.
`.trim();
}

function generarPromptExtraccionProductos(productos) {
  const listado = productos
    .filter(p => p.active)
    .map(p => `- ${p.nombre}`)
    .join('\n');

  return `
Eres un asistente que debe ayudar a identificar los productos mencionados en un mensaje de un cliente. A continuación te doy el listado completo de productos disponibles:

${listado}
Dado un mensaje de usuario, extrae los nombres de los productos mencionados EXACTAMENTE como aparecen en el listado anterior. Si el usuario menciona productos que no están en la lista, ignóralos. Devuélvelos como un arreglo de texto JSON con solo los nombres de los productos encontrados, sin explicar nada si el usuario solicita el menu completo manda todo el menu o si pide una categoria tambien lo puede hacer.
Ejemplo de formato de respuesta: ["Hamburguesa clásica", "Gaseosa 400ml"]
`.trim();
}

function detectarCategoriaSolicitada(mensajeUsuario, categorias) {
  const texto = mensajeUsuario
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/gi, '');

  for (const cat of categorias) {
    const nombre = cat.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/gi, '');

    if (texto.includes(nombre)) {
      return cat.name;
    }
  }

  return null;
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

    const respuestaIA = await axios.post(
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

    const textoCompleto = respuestaIA.data.choices[0].message.content;

    const textoUsuarioNormalizado = mensajeUsuario
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/gi, '');

    const frasesTodoElMenu = [
      "todo el menú", "todo lo que tienes", "muéstrame todo",
      "que tienes", "ver menú", "mostrar productos", "ver todo"
    ];
    const quiereTodo = frasesTodoElMenu.some(frase =>
      textoUsuarioNormalizado.includes(frase.replace(/[^a-z0-9 ]/gi, ''))
    );

    if (quiereTodo) {
      return res.json({
        respuesta: "¡Perfecto! Aquí tienes todo el menú 👇",
        productosSugeridos: productos.map(p => p._id)
      });
    }

    const categoriaSolicitada = detectarCategoriaSolicitada(mensajeUsuario, promptDoc.categorias || []);

    if (categoriaSolicitada) {
      const productosFiltrados = productos
        .filter(p => p.categoria?.toLowerCase() === categoriaSolicitada.toLowerCase())
        .map(p => p._id);

      return res.json({
        respuesta: `¡Claro! Aquí tienes todos los productos de la categoría *${categoriaSolicitada}* 👇`,
        productosSugeridos: productosFiltrados
      });
    }

    const promptExtraccion = generarPromptExtraccionProductos(productos);
    const extraccion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: promptExtraccion },
          { role: 'user', content: mensajeUsuario }
        ],
        temperature: 0
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let productosDetectados = [];
    try {
      productosDetectados = JSON.parse(extraccion.data.choices[0].message.content);
    } catch (err) {
      console.warn("Error parseando productos extraídos:", err.message);
    }

    const productosSugeridos = productos
      .filter(p => productosDetectados.includes(p.nombre))
      .map(p => p._id);

    return res.json({
      respuesta: textoCompleto,
      productosSugeridos
    });

  } catch (error) {
    console.error('Error en el chatbot:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error procesando tu mensaje.' });
  }
};

module.exports = { chatBotHandler };






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
