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
${productos}

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
console.log("🛒 Carrito recibido:", carrito);

  try {
    if (!promptsCache[dbName]) {
      console.log("Conectando a la base de datos dinámica:", dbName);
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
    const esConfirmacion = detectarConfirmacion(mensajeUsuario);

    let mensajeResumen = null;
    let redirigirACarrito = false;

    if (Array.isArray(carrito) && carrito.length > 0 && esConfirmacion) {
      mensajeResumen = generarResumen(carrito, promptDoc.frasesConfirmacion);
      redirigirACarrito = true;
    }

    // ✅ Función para formatear carrito para el frontend
    function formatearCarritoParaFrontend(carrito) {
      return carrito.map(p => ({
        itemId: p.itemId || p.id || p._id,
        nombre: p.nombre,
        precio: p.precio,
        imagen: p.imagen || null,
        numberItems: p.numberItems || 1
      }));
    }

    // ✅ Si el usuario ya confirmó y hay productos, devolvemos respuesta sin llamar a OpenAI
    if (redirigirACarrito) {
      return res.json({
        respuesta: "Perfecto, tu pedido está confirmado. Presiona el botón para finalizar 🛒",
        redirigirACarrito: true,
        carrito: formatearCarritoParaFrontend(carrito)
      });
    }

    // 🧠 Si no es confirmación, continúa con OpenAI
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
// Detectar productos mencionados en la respuesta
const textoRespuesta = respuesta.data.choices[0].message.content;
const productos = promptDoc.productos || [];
const nombres = productos.map(p => p.nombre.toLowerCase());
const productosSugeridos = productos
  .filter(p => {
    const nombre = p.nombre.toLowerCase();
    const textoNormalizado = textoRespuesta.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/gi, "");
    return textoNormalizado.includes(nombre.replace(/\s+/g, ''));
  })
  .map(p => p._id);

   return res.json({
  respuesta: textoRespuesta,
  redirigirACarrito: false,
  productosSugeridos
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

    // Limpiar imageUrl de categorias y imagen de productos
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

    // Normalizar y loggear el nombre de la base de datos
    const databaseName = `location_${dbName.toLowerCase().replace(/\s+/g, '_')}`;
    console.log("🟢 Conectando a base de datos:", databaseName);

    clientConnection = await mongoose.createConnection(process.env.HEII_MONGO_URI, {
      dbName: databaseName,
    });

    // Crear el modelo para la colección `prompts`
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

    // Crear el documento con los datos recibidos (sin imágenes)
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

    // Guardar el documento en la base de datos
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


