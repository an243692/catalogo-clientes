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

// Ruta específica para el admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/admin.html'));
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

    // Crear el pedido inmediatamente en la base de datos
    try {
      console.log('🔍 userInfo recibido:', userInfo);
      console.log('🔍 userInfo.email:', userInfo.email);
      console.log('🔍 userInfo.userEmail:', userInfo.userEmail);
      console.log('🔍 userInfo.uid:', userInfo.uid);
      console.log('🔍 userInfo.userId:', userInfo.userId);
      
      const orderData = {
        orderId: orderId,
        sessionId: session.id,
        userEmail: userInfo.email || userInfo.userEmail || 'unknown@email.com',
        userId: userInfo.uid || userInfo.userId || 'unknown',
        totalAmount: items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: items,
        userInfo: userInfo,
        // Agregar campos adicionales para compatibilidad
        email: userInfo.email || userInfo.userEmail || 'unknown@email.com',
        timestamp: Date.now()
      };
      
      console.log('📋 orderData a guardar:', orderData);

      // Guardar en Realtime Database
      const db = admin.database();
      const ordersRef = db.ref('orders');
      const newOrderRef = ordersRef.push();
      await newOrderRef.set(orderData);

      console.log('✅ Pedido de Stripe creado en Realtime Database:', newOrderRef.key);
      
      // También guardar en Firestore para compatibilidad
      const firestore = admin.firestore();
      await firestore.collection('orders').add(orderData);
      
      console.log('✅ Pedido de Stripe también guardado en Firestore');
      
    } catch (orderError) {
      console.error('❌ Error al crear pedido de Stripe:', orderError);
      // Continuar con la creación de la sesión aunque falle el registro del pedido
    }
    
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

// Endpoint para crear PaymentIntent (para Stripe Elements)
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'mxn', items, customerInfo } = req.body;

    // Validar datos requeridos
    if (!amount || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Datos de pago inválidos' });
    }

    // Crear PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe espera el monto en centavos
      currency: currency,
      metadata: {
        items: JSON.stringify(items),
        customerInfo: JSON.stringify(customerInfo),
        timestamp: Date.now().toString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ PaymentIntent creado exitosamente:', {
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: currency
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error al crear PaymentIntent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook para manejar eventos de Stripe
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      handleSuccessfulPayment(session);
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Función para manejar pagos exitosos
async function handleSuccessfulPayment(session) {
  try {
    console.log('✅ Pago exitoso recibido:', session.id);
    
    const { orderId, userEmail, totalAmount } = session.metadata;
    
    // Buscar el pedido existente por sessionId o orderId
    const db = admin.database();
    const ordersRef = db.ref('orders');
    
    let orderToUpdate = null;
    let orderKey = null;
    
    // Buscar por sessionId primero
    const sessionQuery = await ordersRef.orderByChild('sessionId').equalTo(session.id).once('value');
    if (sessionQuery.exists()) {
      sessionQuery.forEach((childSnapshot) => {
        orderToUpdate = childSnapshot.val();
        orderKey = childSnapshot.key;
      });
    } else {
      // Buscar por orderId si no se encuentra por sessionId
      const orderQuery = await ordersRef.orderByChild('orderId').equalTo(orderId).once('value');
      if (orderQuery.exists()) {
        orderQuery.forEach((childSnapshot) => {
          orderToUpdate = childSnapshot.val();
          orderKey = childSnapshot.key;
        });
      }
    }
    
    if (orderToUpdate && orderKey) {
      // Actualizar el pedido existente
      const updateData = {
        ...orderToUpdate,
        status: 'completed',
        paymentStatus: 'paid',
        updatedAt: new Date().toISOString(),
        customerDetails: {
          email: session.customer_email,
          name: session.customer_details?.name,
          phone: session.customer_details?.phone
        }
      };
      
      await ordersRef.child(orderKey).update(updateData);
      console.log('✅ Pedido actualizado en Realtime Database:', orderKey);
      
      // También actualizar en Firestore
      const firestore = admin.firestore();
      const firestoreQuery = await firestore.collection('orders')
        .where('sessionId', '==', session.id)
        .get();
      
      if (!firestoreQuery.empty) {
        const firestoreDoc = firestoreQuery.docs[0];
        await firestoreDoc.ref.update({
          status: 'completed',
          paymentStatus: 'paid',
          updatedAt: new Date().toISOString(),
          customerDetails: {
            email: session.customer_email,
            name: session.customer_details?.name,
            phone: session.customer_details?.phone
          }
        });
        console.log('✅ Pedido actualizado en Firestore:', firestoreDoc.id);
      }
      
    } else {
      // Si no se encuentra el pedido, crear uno nuevo
      const orderData = {
        orderId: orderId,
        sessionId: session.id,
        userEmail: userEmail,
        totalAmount: parseFloat(totalAmount),
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: session.display_items || [],
        customerDetails: {
          email: session.customer_email,
          name: session.customer_details?.name,
          phone: session.customer_details?.phone
        }
      };

      const newOrderRef = ordersRef.push();
      await newOrderRef.set(orderData);
      console.log('✅ Nuevo pedido creado en Realtime Database:', newOrderRef.key);
      
      // También guardar en Firestore
      const firestore = admin.firestore();
      await firestore.collection('orders').add(orderData);
      console.log('✅ Nuevo pedido también guardado en Firestore');
    }
    
  } catch (error) {
    console.error('❌ Error al procesar pago exitoso:', error);
  }
}

// Endpoint para crear pedidos por WhatsApp
app.post('/api/create-whatsapp-order', async (req, res) => {
  try {
    const { items, total, userEmail, userId, userInfo } = req.body;
    
    console.log('🔍 WhatsApp order data recibido:', { items, total, userEmail, userId, userInfo });
    
    const orderData = {
      orderId: `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userEmail: userEmail || userInfo?.email || 'unknown@email.com',
      userId: userId || userInfo?.userId || 'unknown',
      items: items,
      total: total,
      paymentMethod: 'whatsapp',
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userInfo: userInfo,
      // Agregar campos adicionales para compatibilidad
      email: userEmail || userInfo?.email || 'unknown@email.com',
      timestamp: Date.now()
    };
    
    console.log('📋 WhatsApp orderData a guardar:', orderData);

    // Guardar en Realtime Database
    const db = admin.database();
    const ordersRef = db.ref('orders');
    const newOrderRef = ordersRef.push();
    await newOrderRef.set(orderData);

    console.log('✅ Pedido por WhatsApp guardado en Realtime Database:', newOrderRef.key);
    
    // También guardar en Firestore para compatibilidad
    const firestore = admin.firestore();
    await firestore.collection('orders').add(orderData);
    
    console.log('✅ Pedido por WhatsApp también guardado en Firestore');
    
    res.json({ 
      success: true, 
      orderId: newOrderRef.key,
      message: 'Pedido registrado correctamente' 
    });
    
  } catch (error) {
    console.error('❌ Error al crear pedido por WhatsApp:', error);
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
});

// Endpoint para obtener pedidos de un usuario
app.get('/api/orders/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    console.log('🔍 Buscando pedidos para:', userEmail);
    
    const db = admin.database();
    const ordersRef = db.ref('orders');
    
    // Obtener todos los pedidos para buscar manualmente
    const allSnapshot = await ordersRef.once('value');
    console.log('🔍 DEBUG - Todos los pedidos en la base de datos:');
    
    const orders = [];
    
    if (allSnapshot.exists()) {
      allSnapshot.forEach((childSnapshot) => {
        const orderData = childSnapshot.val();
        console.log(`  - ${childSnapshot.key}: userEmail="${orderData?.userEmail}", email="${orderData?.email}", userInfo.email="${orderData?.userInfo?.email}"`);
        
        // Buscar por diferentes campos de email
        let isUserOrder = false;
        
        // 1. Buscar por userEmail (pedidos nuevos)
        if (orderData?.userEmail === userEmail) {
          isUserOrder = true;
        }
        
        // 2. Buscar por email directo (pedidos antiguos)
        if (orderData?.email === userEmail) {
          isUserOrder = true;
        }
        
        // 3. Buscar por userInfo.email (pedidos con estructura userInfo)
        if (orderData?.userInfo?.email === userEmail) {
          isUserOrder = true;
        }
        
        // 4. Buscar por userId si coincide con el usuario actual
        if (orderData?.userId && orderData?.userInfo?.uid === orderData?.userId) {
          // Verificar si el userId corresponde al email
          if (orderData?.userInfo?.email === userEmail) {
            isUserOrder = true;
          }
        }
        
        if (isUserOrder) {
          orders.push({
            id: childSnapshot.key,
            ...orderData
          });
        }
      });
    } else {
      console.log('  - No hay pedidos en la base de datos');
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    orders.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp || 0);
      const dateB = new Date(b.createdAt || b.timestamp || 0);
      return dateB - dateA;
    });
    
    console.log(`✅ Encontrados ${orders.length} pedidos para ${userEmail}`);
    res.json(orders);
  } catch (error) {
    console.error('❌ Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
