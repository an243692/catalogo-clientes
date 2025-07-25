const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const mercadopago = require('mercadopago');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-credentials.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

// Inicializa Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://catalogo-b6e67-default-rtdb.firebaseio.com"
});

// Configura tu Access Token de Mercado Pago
mercadopago.configure({
  access_token: 'TU_ACCESS_TOKEN'
});

// Endpoint para crear preferencia
app.post('/crear-preferencia', async (req, res) => {
  try {
    const { items, orderId } = req.body; // orderId es el ID del pedido en Firebase
    const preference = {
      items,
      notification_url: 'https://catalogo-clientes-0ido.onrender.com/mercadopago/webhook',
      external_reference: orderId
    };
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
      
      // CONSULTAR DETALLES DEL PAGO EN MERCADO PAGO
      const mpResponse = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer APP_USR-5645991319401265-072122-42f4292585595942a2f27f863d68dab3-2555387158`
          }
        }
      );
      const payment = mpResponse.data;
      const orderId = payment.external_reference;

      // ACTUALIZAR EL PEDIDO EN FIREBASE
      await admin.database().ref(`orders/${orderId}`).update({
        status: payment.status,
        paymentId: paymentId,
        completedAt: Date.now(),
        paymentMethod: payment.payment_method_id
      });

      console.log('Pedido actualizado en Firebase:', orderId);
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).send('Error');
  }
});

app.get('/', (req, res) => {
  res.send('Servidor backend funcionando');
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
}); 
