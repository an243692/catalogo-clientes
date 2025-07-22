const mercadopago = require('mercadopago');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Configura tu Access Token de Mercado Pago (versión 1.5.16)
mercadopago.configure({
  access_token: 'APP_USR-5645991319401265-072122-42f4292585595942a2f27f863d68dab3-2555387158'
});

app.post('/crear-preferencia', async (req, res) => {
  try {
    const { items } = req.body; // [{ title, quantity, unit_price }]
    const preference = {
      items,
      // Puedes agregar más opciones aquí (payer, back_urls, etc.)
    };
    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Servidor MercadoPago en puerto 3001'));
