require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configurar límites de tasa
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 solicitudes por ventana por IP
});

// Debug: Ver qué variables de entorno están disponibles
console.log('=== DEBUG: Variables de entorno disponibles ===');
console.log('FIREBASE_CREDENTIALS existe:', !!process.env.FIREBASE_CREDENTIALS);
console.log('STRIPE_SECRET_KEY existe:', !!process.env.STRIPE_SECRET_KEY);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('==============================================');

// Inicializar Firebase Admin
let firebaseCredentials;
if (process.env.FIREBASE_CREDENTIALS) {
  console.log('Variable FIREBASE_CREDENTIALS encontrada');
  console.log('Longitud de FIREBASE_CREDENTIALS:', process.env.FIREBASE_CREDENTIALS.length);
  try {
    firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    console.log('Credenciales parseadas correctamente desde variable de entorno');
  } catch (error) {
    console.error('Error al parsear FIREBASE_CREDENTIALS:', error);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials)
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy de manera más segura
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

// Middleware de seguridad
app.use(helmet());
app.use(cors());
app.use(limiter);

// Configurar el webhook de Stripe
app.post('/stripe/webhook', bodyParser.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️ Error de webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('💰 Pago completado:', session.id);
        
        // Actualizar el pedido en Firebase
        const orderId = session.metadata.orderId;
        const orderRef = admin.database().ref(`orders/${orderId}`);
        
        await orderRef.update({
          status: 'paid',
          paymentId: session.id,
          paymentStatus: session.payment_status,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        });

        // Enviar notificación al admin (implementar después)
        break;

      case 'checkout.session.expired':
        console.log('⌛ Sesión expirada:', event.data.object.id);
        // Actualizar el estado del pedido a expirado
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    res.json({received: true});
  } catch (err) {
    console.error('Error al procesar webhook:', err);
    res.status(500).send('Error al procesar webhook');
  }
});

// Endpoint para crear sesión de checkout
app.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { items, orderId, userInfo } = req.body;

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'mxn',
        product_data: {
          name: item.name,
          description: `Producto de SOFT DUCK - ${item.name}`,
          // Solo usar la primera imagen si existe y es una URL válida
          images: item.images && item.images[0] && item.images[0].startsWith('http') ? [item.images[0]] : []
        },
        unit_amount: Math.round(item.unitPrice * 100), // Usar unitPrice en lugar de price
      },
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        orderId: orderId,
        userEmail: userInfo.email
      },
      customer_email: userInfo.email
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error al crear sesión de checkout:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
