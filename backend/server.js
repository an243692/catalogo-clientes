  const express = require('express');
  const bodyParser = require('body-parser');
  const cors = require('cors');
  const axios = require('axios');
  const mercadopago = require('mercadopago');
  const admin = require('firebase-admin');
  
  // Configurar credenciales de Firebase
  let serviceAccount;
  try {
    if (process.env.FIREBASE_CREDENTIALS) {
      // Para Render - usar variable de entorno
      serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
      console.log('Usando credenciales de Firebase desde variable de entorno');
    } else {
      // Para desarrollo local - usar archivo
      serviceAccount = require('./firebase-credentials.json');
      console.log('Usando credenciales de Firebase desde archivo local');
    }
  } catch (error) {
    console.error('Error al cargar credenciales de Firebase:', error.message);
    process.exit(1);
  }

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
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5645991319401265-072122-42f4292585595942a2f27f863d68dab3-2555387158'
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
              Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5645991319401265-072122-42f4292585595942a2f27f863d68dab3-2555387158'}`
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
    res.json({
      message: 'Servidor backend funcionando',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Endpoint de prueba para verificar configuración
  app.get('/test', (req, res) => {
    res.json({
      firebase: !!serviceAccount,
      mercadopago: !!(process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-5645991319401265-072122-42f4292585595942a2f27f863d68dab3-2555387158'),
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
  }); 
