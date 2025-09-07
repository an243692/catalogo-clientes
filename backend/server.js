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

// Servir archivos estáticos del admin
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Ruta para el panel de administración
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/admin.html'));
});

// Endpoint de prueba para webhook
app.get('/stripe/webhook-test', (req, res) => {
  console.log('🧪 Test webhook endpoint llamado');
  res.json({ 
    message: 'Webhook endpoint funcionando', 
    timestamp: new Date().toISOString(),
    webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
  });
});

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
        console.log('⏰ Sesión de checkout expirada:', event.data.object.id);
        const expiredOrderId = event.data.object.metadata.orderId;
       
        if (expiredOrderId) {
          const expiredOrderRef = admin.database().ref(`orders/${expiredOrderId.replace('order_', '')}`);
         
          try {
            // Leer el estado actual del pedido
            const orderSnapshot = await expiredOrderRef.once('value');
            const orderData = orderSnapshot.val();
           
            if (orderData) {
              if (orderData.status === 'pending') {
                // Eliminar completamente el pedido si sigue pendiente
                await expiredOrderRef.remove();
                console.log('🗑️ Pedido pendiente eliminado por expiración de Stripe:', expiredOrderId);
              } else {
                console.log(`📋 Pedido ${expiredOrderId} ya no está pendiente (estado: ${orderData.status})`);
              }
            } else {
              console.log(`🔍 Pedido ${expiredOrderId} ya no existe en Firebase`);
            }
          } catch (error) {
            console.error(`❌ Error al procesar expiración de ${expiredOrderId}:`, error);
          }
        }
        break;

      // Agregar manejo para cancelaciones desde Stripe
      case 'payment_intent.canceled':
        console.log('❌ PaymentIntent cancelado:', event.data.object.id);
        // Stripe maneja esto automáticamente, pero podemos agregar lógica adicional si es necesario
        break;
       
      case 'checkout.session.async_payment_failed':
        console.log('❌ Pago asíncrono fallido:', event.data.object.id);
        const failedOrderId = event.data.object.metadata?.orderId;
        if (failedOrderId) {
          const failedOrderRef = admin.database().ref(`orders/${failedOrderId.replace('order_', '')}`);
          const snapshot = await failedOrderRef.once('value');
          if (snapshot.exists() && snapshot.val().status === 'pending') {
            await failedOrderRef.remove();
            console.log('🗑️ Pedido eliminado por fallo de pago asíncrono:', failedOrderId);
          }
        }
        break;

      default:
        console.log(`📋 Evento de Stripe no manejado: ${event.type}`);
    }

    res.json({received: true, processed: true});
  } catch (err) {
    console.error('❌ Error al procesar webhook de Stripe:', err);
    // Enviar respuesta exitosa para evitar reintentos innecesarios de Stripe
    res.json({received: true, error: err.message, processed: false});
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
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos desde ahora (mínimo requerido por Stripe)
      metadata: {
        orderId: orderId,
        userEmail: userInfo.email,
        timestamp: Date.now().toString(),
        totalAmount: items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toString()
      },
      customer_email: userInfo.email,
      billing_address_collection: 'required', // Solicitar dirección de facturación
      phone_number_collection: {
        enabled: true
      }
    });
   
    console.log('✅ Sesión de Stripe creada exitosamente:', {
      sessionId: session.id,
      orderId: orderId,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
      duration: '30 minutos'
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error al crear sesión de checkout:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
  console.log(`🔗 Admin disponible en: http://localhost:${PORT}/admin`);
  console.log(`🔗 Webhook disponible en: http://localhost:${PORT}/stripe/webhook`);
  console.log(`🔗 Test endpoint disponible en: http://localhost:${PORT}/stripe/webhook-test`);
});
