require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const mercadopago = require('mercadopago');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Configurar límites de tasa
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 solicitudes por ventana por IP
});

// Debug: Ver qué variables de entorno están disponibles
console.log('=== DEBUG: Variables de entorno disponibles ===');
console.log('FIREBASE_CREDENTIALS existe:', !!process.env.FIREBASE_CREDENTIALS);
console.log('FIREBASE_CREDENTIALS_BASE64 existe:', !!process.env.FIREBASE_CREDENTIALS_BASE64);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('==============================================');

// Configurar credenciales de Firebase
let serviceAccount;
try {
  if (process.env.FIREBASE_CREDENTIALS) {
    // Para Render - usar variable de entorno
    console.log('Variable FIREBASE_CREDENTIALS encontrada');
    console.log('Longitud de FIREBASE_CREDENTIALS:', process.env.FIREBASE_CREDENTIALS.length);
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    console.log('Credenciales parseadas correctamente desde variable de entorno');
  } else {
    // Para desarrollo local - usar archivo
    console.log('Variable FIREBASE_CREDENTIALS no encontrada, intentando archivo local');
    const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
    if (fs.existsSync(credentialsPath)) {
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      serviceAccount = JSON.parse(credentialsContent);
      console.log('Usando credenciales de Firebase desde archivo local');
    } else {
      throw new Error('Archivo firebase-credentials.json no encontrado');
    }
  }
} catch (error) {
  console.error('Error al cargar credenciales de Firebase:', error.message);
  console.error('Asegúrate de que FIREBASE_CREDENTIALS esté configurado en Render o que el archivo firebase-credentials.json exista localmente');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());
app.use(limiter);
app.use(bodyParser.json({ limit: '10kb' })); // Limitar tamaño del payload
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Validar variables de entorno críticas
const requiredEnvVars = [
  'MERCADOPAGO_ACCESS_TOKEN',
  'FIREBASE_CREDENTIALS'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Variable de entorno ${envVar} no configurada`);
    process.exit(1);
  }
}

// Inicializa Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://catalogo-b6e67-default-rtdb.firebaseio.com"
});

// Configura tu Access Token de Mercado Pago
const client = new mercadopago.MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

// Endpoint para crear preferencia
app.post('/crear-preferencia', async (req, res) => {
  try {
    const { items, orderId, payer, statement_descriptor } = req.body;
    console.log('🛒 Creando preferencia para pedido:', orderId);
    
    // Validaciones mejoradas
    if (!items?.length || !payer?.email || !orderId) {
      return res.status(400).json({ 
        error: 'Datos incompletos',
        required: ['items', 'payer.email', 'orderId']
      });
    }

    // Validar montos y cantidades
    for (const item of items) {
      if (!item.title || !item.quantity || !item.unit_price) {
        return res.status(400).json({ 
          error: 'Datos de item inválidos',
          item
        });
      }
      
      if (item.unit_price <= 0 || item.quantity <= 0) {
        return res.status(400).json({ 
          error: 'Precio o cantidad debe ser mayor a 0',
          item
        });
      }
    }

    const preference = {
      items: items.map(item => ({
        id: item.id || `item_${Date.now()}_${Math.random()}`,
        title: item.title,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        description: item.description || `Producto de SOFT DUCK - ${item.title}`,
        currency_id: 'MXN'
      })),
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name
      },
      payment_methods: {
        excluded_payment_types: [
          {
            id: "ticket"
          }
        ],
        installments: 12
      },
      back_urls: {
        success: "https://catalogo-b6e67.web.app/success",
        failure: "https://catalogo-b6e67.web.app/failure",
        pending: "https://catalogo-b6e67.web.app/pending"
      },
      auto_return: "approved",
      external_reference: orderId,
      notification_url: "https://catalogo-clientes-0ido.onrender.com/mercadopago/webhook"
    };

    console.log('⚙️ Configuración de preferencia:', JSON.stringify(preference, null, 2));
    
    try {
        const preferenceClient = new mercadopago.Preference(client);
        const response = await preferenceClient.create({ body: preference });
        console.log('✅ Preferencia creada exitosamente:', response.id);
        
        // Guardar la preferencia en Firebase para seguimiento
        await admin.database().ref(`preferences/${orderId}`).set({
            preferenceId: response.id,
            createdAt: Date.now(),
            items,
            payer: {
                email: payer.email,
                identification: payer.identification
            }
        });

        res.json({ 
            id: response.id,
            init_point: response.init_point
        });
    } catch (error) {
        console.error('❌ Error al crear preferencia:', error);
        console.error('Detalles del error:', error.message);
        res.status(500).json({ 
            error: 'Error al crear preferencia de pago',
            details: error.message
        });
    }
  } catch (error) {
    console.error('❌ Error al crear preferencia:', error.message);
    if (error.response?.data) {
      console.error('🔍 Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || {}
    });
  }
});

// Endpoint GET para verificar que el webhook existe
app.get('/mercadopago/webhook', (req, res) => {
  console.log('🔍 GET request al webhook recibido');
  res.status(200).json({
    message: 'Webhook endpoint disponible',
    timestamp: new Date().toISOString(),
    method: 'GET'
  });
});

// Endpoint para recibir notificaciones de Mercado Pago
app.post('/mercadopago/webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook POST recibido:', JSON.stringify(req.body, null, 2));
    console.log('📋 Headers recibidos:', JSON.stringify(req.headers, null, 2));
    
    const { type, data, resource, topic } = req.body;
    console.log('📝 Tipo de notificación:', type);
    console.log('📊 Datos recibidos:', data);
    console.log('🔗 Resource:', resource);
    console.log('📌 Topic:', topic);
    
    // Solo procesar pagos de nuestra aplicación (no de Mercado Libre)
    if (type === 'payment' && data && data.id) {
      const paymentId = data.id;
      console.log('💰 ID del pago:', paymentId);
      
      // Verificar si es un pago de prueba (123456)
      if (paymentId === '123456') {
        console.log('🧪 Pago de prueba detectado, ignorando...');
        res.status(200).send('OK - Test payment ignored');
        return;
      }
      
      try {
        console.log('🔍 Consultando detalles del pago en Mercado Pago...');
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
        console.log('📄 Detalles del pago:', JSON.stringify(payment, null, 2));
        
        const orderId = payment.external_reference;
        console.log('🆔 ID del pedido (external_reference):', orderId);

        if (orderId && orderId.startsWith('test_') || orderId.startsWith('order_')) {
          console.log('🔄 Actualizando pedido en Firebase...');
          // ACTUALIZAR EL PEDIDO EN FIREBASE
          await admin.database().ref(`orders/${orderId}`).update({
            status: payment.status,
            paymentId: paymentId,
            completedAt: Date.now(),
            paymentMethod: payment.payment_method_id
          });

          console.log('✅ Pedido actualizado en Firebase:', orderId, 'Status:', payment.status);
        } else {
          console.log('⚠️ Pago sin external_reference válido:', paymentId, 'OrderId:', orderId);
          console.log('ℹ️ Este pago probablemente es de Mercado Libre, no de nuestra aplicación');
        }
      } catch (mpError) {
        console.error('❌ Error al consultar pago en Mercado Pago:', mpError.message);
        console.error('🔍 Detalles del error:', mpError.response?.data);
        // No fallamos el webhook por errores de consulta
      }
    } else if (topic === 'merchant_order') {
      console.log('🛒 Notificación de Mercado Libre recibida, ignorando...');
    } else {
      console.log('ℹ️ Tipo de notificación no manejado:', type || topic);
    }
    
    console.log('✅ Webhook procesado exitosamente');
    res.status(200).send('OK');
  } catch (error) {
    console.error('💥 Error en webhook:', error);
    console.error('🔍 Stack trace:', error.stack);
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

// Endpoint de prueba para simular webhook
app.post('/test-webhook', async (req, res) => {
  try {
    console.log('🧪 Simulando webhook de prueba...');
    
    // Simular un pago exitoso
    const testPaymentData = {
      type: 'payment',
      data: {
        id: '123456789'
      }
    };
    
    // Simular directamente el procesamiento del webhook
    console.log('🔔 Webhook POST recibido:', JSON.stringify(testPaymentData, null, 2));
    
    const { type, data } = testPaymentData;
    console.log('📝 Tipo de notificación:', type);
    console.log('📊 Datos recibidos:', data);
    
    if (type === 'payment') {
      const paymentId = data.id;
      console.log('💰 ID del pago:', paymentId);
      
      // Verificar si es un pago de prueba (123456)
      if (paymentId === '123456') {
        console.log('🧪 Pago de prueba detectado, ignorando...');
        res.json({
          success: true,
          message: 'Pago de prueba detectado y procesado correctamente',
          paymentId: paymentId,
          status: 'ignored'
        });
        return;
      }
      
      // Para el test, simulamos un pago exitoso
      res.json({
        success: true,
        message: 'Webhook de prueba ejecutado correctamente',
        paymentId: paymentId,
        status: 'test_processed'
      });
    } else {
      res.json({
        success: true,
        message: 'Tipo de notificación no manejado en prueba',
        type: type
      });
    }
    
  } catch (error) {
    console.error('Error en webhook de prueba:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoints de redirección para pagos
app.get('/success', (req, res) => {
  console.log('✅ Pago exitoso - Redirección recibida');
  console.log('📋 Query params:', req.query);
  res.json({
    status: 'success',
    message: 'Pago procesado exitosamente',
    query: req.query
  });
});

app.get('/failure', (req, res) => {
  console.log('❌ Pago fallido - Redirección recibida');
  console.log('📋 Query params:', req.query);
  res.json({
    status: 'failure',
    message: 'Pago fallido',
    query: req.query
  });
});

app.get('/pending', (req, res) => {
  console.log('⏳ Pago pendiente - Redirección recibida');
  console.log('📋 Query params:', req.query);
  res.json({
    status: 'pending',
    message: 'Pago pendiente de confirmación',
    query: req.query
  });
});

// Endpoint para ver logs del webhook
app.get('/webhook-logs', (req, res) => {
  res.json({
    message: 'Logs del webhook',
    timestamp: new Date().toISOString(),
    webhookUrl: 'https://catalogo-clientes-0ido.onrender.com/mercadopago/webhook',
    instructions: [
      '1. Ve a tu Dashboard de Mercado Pago',
      '2. En Notificaciones → Webhooks',
      '3. Agrega la URL del webhook',
      '4. Selecciona eventos: payment y merchant_order'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
