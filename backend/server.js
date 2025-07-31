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
    credential: admin.credential.cert(firebaseCredentials),
    databaseURL: "https://catalogo-b6e67-default-rtdb.firebaseio.com"
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

// Middleware condicional para body parsing
app.use((req, res, next) => {
  if (req.originalUrl === '/stripe/webhook') {
    // Para webhook, usar raw body
    bodyParser.raw({type: 'application/json'})(req, res, next);
  } else {
    // Para otros endpoints, usar JSON con límite
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar el webhook de Stripe
app.post('/stripe/webhook', async (req, res) => {
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
        if (!orderId) {
          throw new Error('No se encontró el ID del pedido en los metadatos');
        }

        // Obtener referencia al pedido
        const orderRef = admin.database().ref(`orders/${orderId.replace('order_', '')}`);
        
        // Actualizar el estado del pedido
        await orderRef.update({
          status: 'completed',
          paymentId: session.id,
          paymentStatus: session.payment_status,
          updatedAt: admin.database.ServerValue.TIMESTAMP,
          paymentDetails: {
            amount: session.amount_total / 100, // Convertir de centavos a pesos
            currency: session.currency,
            paymentMethod: session.payment_method_types[0],
            customerEmail: session.customer_email
          }
        });

        console.log('✅ Pedido actualizado en Firebase:', orderId);
        break;

      case 'checkout.session.expired':
        console.log('⌛ Sesión expirada:', event.data.object.id);
        const expiredOrderId = event.data.object.metadata.orderId;
        if (expiredOrderId) {
          const expiredOrderRef = admin.database().ref(`orders/${expiredOrderId.replace('order_', '')}`);
          await expiredOrderRef.update({
            status: 'expired',
            updatedAt: admin.database.ServerValue.TIMESTAMP
          });
          console.log('❌ Pedido marcado como expirado:', expiredOrderId);
        }
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    res.json({received: true});
  } catch (err) {
    console.error('Error al procesar webhook:', err);
    // No devolver error 500 para evitar que Stripe reintente
    res.json({received: true, error: err.message});
  }
});

// Endpoint para crear sesión de checkout
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, orderId, userInfo } = req.body;

    const lineItems = items.map(item => {
      // Asegurarse de que el precio sea un número válido
      const price = parseFloat(item.unitPrice) || 0;
      if (price <= 0) {
        throw new Error(`Precio inválido para el producto ${item.name}`);
      }

      return {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: item.name,
            description: `Producto de SOFT DUCK - ${item.name}`,
            images: item.images && item.images[0] && item.images[0].startsWith('http') ? [item.images[0]] : []
          },
          unit_amount: Math.round(price * 100), // Convertir a centavos
        },
        quantity: item.quantity
      };
    });

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
