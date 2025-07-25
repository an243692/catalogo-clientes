const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const mercadopago = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

// Configura tu Access Token de Mercado Pago
mercadopago.configure({
  access_token: 'APP_USR-5645991319401265-072122-42f4292585595942a2f27f863d68dab3-2555387158'
});

// Endpoint para crear preferencia
app.post('/crear-preferencia', async (req, res) => {
  try {
    const { items } = req.body; // [{ title, quantity, unit_price }]
    const preference = { items };
    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para recibir notificaciones de Mercado Pago
app.post('/mercadopago/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment') {
      const paymentId = data.id;
      // Aquí podrías consultar a Mercado Pago para obtener detalles del pago
      // const mpResponse = await axios.get(
      //   `https://api.mercadopago.com/v1/payments/${paymentId}`,
      //   {
      //     headers: {
      //       Authorization: `Bearer APP_USR-5645991319401265-072122-42f4292585595942a2f27f863d68dab3-2555387158`
      //     }
      //   }
      // );
      // const payment = mpResponse.data;
      console.log('Pago recibido:', paymentId);
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook de Mercado Pago:', error);
    res.status(500).send('Error');
  }
});

app.get('/', (req, res) => {
  res.send('Servidor backend funcionando');
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
}); 