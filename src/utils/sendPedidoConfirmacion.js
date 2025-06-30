const nodemailer = require('nodemailer');

const sendPedidoConfirmacion = async (email, pedido) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const productosHTML = pedido.productos.map(p =>
      `<li>${p.cantidad} × ${p.nombre} (${p.precioUnitario.toFixed(2)}  $)</li>`
    ).join('');

    const total = pedido.productos.reduce(
      (acc, p) => acc + p.cantidad * p.precioUnitario,
      0
    );

    await transporter.sendMail({
      from: `"Tu Restaurante" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Confirmación de tu pedido a domicilio',
      text: `Hola,

Gracias por tu pedido. Estos son los detalles:

Dirección: ${pedido.direccion}
Teléfono: ${pedido.telefono}

Productos:
${pedido.productos.map(p => `${p.cantidad} x ${p.nombre} (${p.precioUnitario.toFixed(2)}  $)`).join('\n')}

Total: ${total.toFixed(2)}  $

En breve te lo entregaremos.

Gracias por confiar en nosotros.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4CAF50;">Confirmación de tu pedido a domicilio</h2>
          <p>Hola,</p>
          <p>Gracias por tu pedido. Aquí tienes el resumen:</p>
          <p><strong>Dirección:</strong> ${pedido.direccion}</p>
          <p><strong>Teléfono:</strong> ${pedido.telefono}</p>
          <p><strong>Productos:</strong></p>
          <ul>${productosHTML}</ul>
          <p><strong>Total:</strong> ${total.toFixed(2)}  $</p>
          <br>
          <p>En breve te lo entregaremos. ¡Gracias por confiar en nosotros!</p>
          <hr>
          <footer style="font-size: 12px; color: #777;">
            © ${new Date().getFullYear()} Tu Restaurante. Todos los derechos reservados.
          </footer>
        </div>
      `,
    });

    console.log('Correo de confirmación enviado a:', email);
  } catch (error) {
    console.error('Error al enviar el correo de confirmación:', error);
  }
};

module.exports = sendPedidoConfirmacion ;
