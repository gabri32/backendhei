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
🍔 Hamburguesas
KING MASTER – 150 Grs de doble smash de Angus, doble queso cheddar, tocineta ahumada, pepperoni madurado, queso campesino, cebolla caramelizada, salsa magic, crunch de plátano, pan de papa, vegetales frescos. $37.900

JACK MASTER – Ganadora de Burgerland 2022. $35.900

QUEEN MASTER – Ganadora del Burger Master 2024. $37.897

MAGIC MASTER – Carne Angus rellena de queso mozzarella, cebolla caramelizada, queso americano, vegetales frescos, salsa magic. $35.900

WATSON – 125 Gr de Angus, tocineta, aros de cebolla, queso mozzarella, queso americano, lechuga, tomate. $30.900

JACK PREMIUM – Angus, pepperoni, salsa de queso, mozzarella, americano, tocineta. $30.900

HAWAI – Angus, piña calada, tocineta, doble mozzarella, jamón ahumado, lechuga, tomate. $30.900

CLÁSICA 125 GR – Angus, mozzarella, lechuga, tomate, cebolla, salsa de la casa. $23.900

CLÁSICA 200 GR – Angus, mozzarella, lechuga, tomate, cebolla, salsa de la casa. $29.900

CLÁSICA 250 GR – $33.900

CLÁSICA 400 GR – $43.900

SUPER HUGH – Doble Angus, doble mozzarella y americano, tocineta, aros de cebolla, vegetales. $44.900

COSTILLA – Costilla BBQ, queso mozzarella, lechuga, tomate. $30.900

JACK VEGGIE – Portobello, zucchini, berenjena, cremoso de aguacate, cebolla caramelizada. $28.900

TEXMEX – Angus con pimienta roja, aguacate, queso americano, nachos, lechuga, tomate. $30.900

POLLO – Pollo, salsa especial, queso mozzarella, lechuga, tomate. $30.900

Limonada Cerezada – Limonada con sabor a cereza. $13.900

🍟 Entradas
CHICKEN TENDERS – Tiras de pollo apanadas en carantanta, lechuga, salsa de tomate, tocineta, papas. $27.900

PICADA – Papas fritas, tocineta, pollo, doritos, guacamole, costilla BBQ, chorizo, maduro, Angus. $39.900

Piña calada – Adición tropical. $4.000

🧀 Adiciones
Papas a la francesa – $6.000

Papas rústicas – $7.900

Queso americano – $3.000

Queso mozzarella – $2.000

Tocineta – $3.000

Pepinillos – $4.000

Jalapeños – $3.000

Aros de cebolla – $4.000

Pepperoni – $4.000

Carne Angus 125gr – $10.000

Carne 150gr – $12.000

Carne 200gr – $16.000

Filete de pollo – $9.000

Queso apanado – $8.000

Cebolla caramelizada – $2.500

Porción de costilla – $15.000

Adición de guacamole – $4.000

Pan – $2.000

HELADO – $6.000

Empaque para llevar – $2.000

🧃 Jugos
Limonada de Coco – $13.900

Jugo de Mango en Agua – $8.900

Jugo de Lulo en Agua – $8.900

Jugo de Maracuyá en Agua – $8.900

Jugo de Maracumango en Agua – $8.900

Jugo de Frutos Rojos en Agua – $8.900

Jugo de Mango en Leche – $9.900

Jugo de Lulo en Leche – $9.900

Jugo de Maracuyá en Leche – $9.900

Jugo de Maracumango en Leche – $9.900

Jugo de Frutos Rojos en Leche – $9.900

🥤 Gaseosas
LIMONADA – Limonada Natural. $7.900

Manzana Postobón – $5.000

Colombiana – $5.000

Uva Postobón – $5.000

Coca-Cola Zero – $6.000

Coca-Cola Original – $6.000

Schweppes Soda – $7.000

Agua Brisa – $5.000

🍵 Té
Fuze Tea Limón – $6.000

Fuze Tea Durazno – $6.000

🍺 Cervezas
Cerveza Corona – $7.000

Cerveza 3 Cordilleras – $8.000

Club Colombia Dorada – $6.000

Michelada – $3.000

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
