const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const getTokenSiigo = async (config) => {
  console.log("config", config);
  // Verificar si el token ya existe y no ha expirado
  if (!config._token || Date.now() >= config._expiration) {
    const response = await fetch("https://api.siigo.com/auth", {
      method: "POST",
      body: JSON.stringify({
        userName: config.siigo_userName,
        access_key: config.siigo_access_key
      }),
      headers: {
        "Content-Type": "application/json",
        "Partner-Id": config.siigo_partner_id
      }
    });
    const data = await response.json();
    console.log(data)
    config._token = data.access_token;
    config._expiration = Date.now() + (data.expires_in - 60000); // con 1 minuto de margen
  }
  return config._token;
};

// Crear orden con token y config
const createOrder = async (body, config) => {
  const token = await getTokenSiigo(config);
  const response = await fetch("https://api.siigo.com/v1/invoices", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
      "Partner-Id": config.siigo_partner_id
    }
  });
  const data = await response.json();
  return data;
};
module.exports = {
  createOrder
};
