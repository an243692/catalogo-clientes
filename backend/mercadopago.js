const mercadopago = require('mercadopago');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Configura tu Access Token de Mercado Pago
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.error('⚠️ MERCADOPAGO_ACCESS_TOKEN no está configurado en las variables de entorno');
}

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

app.post('/crear-preferencia', async (req, res) => {
  try {
    const { items, payer } = req.body;
    
    // Validación mejorada de datos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items inválidos' });
    }

    if (!payer || !payer.email) {
      return res.status(400).json({ error: 'Información del comprador incompleta' });
    }

    const preference = {
      items: items.map(item => ({
        ...item,
        currency_id: 'ARS', // Asegura la moneda correcta
        category_id: item.category_id || 'others'
      })),
      payer: {
        ...payer,
        identification: payer.identification || {
          type: 'DNI',
          number: payer.dni || ''
        }
      },
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" } // Excluye pagos en efectivo si no los necesitas
        ],
        installments: 12 // Máximo número de cuotas
      },
      binary_mode: true, // Solo acepta pagos aprobados o rechazados
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ 
      id: response.body.id,
      init_point: response.body.init_point
    });
  } catch (error) {
    console.error('Error al crear preferencia:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || {}
    });
  }
});

app.listen(3001, () => console.log('Servidor MercadoPago en puerto 3001'));
