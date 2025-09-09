import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { cart, getTotalPrice, clearCart } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { createOrder } = useOrders();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    email: currentUser?.email || '',
    phone: userProfile?.phone || '',
    address: userProfile?.location || ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Crear PaymentIntent en el backend
      const response = await fetch('https://catalogo-backend.onrender.com/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(getTotalPrice() * 100), // Convertir a centavos
          currency: 'mxn',
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.wholesalePrice && item.quantity >= 4 ? item.wholesalePrice : item.price,
            quantity: item.quantity,
            image: item.image || item.images?.[0]
          })),
          customerInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address
          }
        }),
      });

      const { clientSecret } = await response.json();

      // Confirmar el pago
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: {
              line1: formData.address
            }
          },
        },
      });

      if (error) {
        toast.error(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        // Crear la orden en la base de datos
        const orderData = {
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.wholesalePrice && item.quantity >= 4 ? item.wholesalePrice : item.price,
            quantity: item.quantity,
            image: item.image || item.images?.[0]
          })),
          total: getTotalPrice(),
          paymentMethod: 'stripe',
          paymentIntentId: paymentIntent.id,
          deliveryInfo: {
            type: 'pickup', // Por defecto pickup
            name: formData.name,
            phone: formData.phone,
            address: formData.address
          }
        };

        await createOrder(orderData);
        clearCart();
        toast.success('¡Pago exitoso! Tu pedido ha sido procesado.');
        onSuccess();
      }
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      toast.error('Error al procesar el pago. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="payment-header">
        <h3>Información de Pago</h3>
        <p>Completa los datos para procesar tu pedido</p>
      </div>

      <div className="form-section">
        <h4>Información de Contacto</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Tu nombre completo"
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              placeholder="Tu número de teléfono"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Correo Electrónico</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            placeholder="tu@email.com"
          />
        </div>
        <div className="form-group">
          <label>Dirección</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            required
            placeholder="Tu dirección completa"
          />
        </div>
      </div>

      <div className="form-section">
        <h4>Información de la Tarjeta</h4>
        <div className="card-element-container">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <div className="payment-summary">
        <div className="summary-row">
          <span>Total del Pedido:</span>
          <span className="total-amount">${getTotalPrice().toLocaleString()}</span>
        </div>
      </div>

      <div className="payment-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="pay-btn"
          disabled={!stripe || loading}
        >
          {loading ? 'Procesando...' : `Pagar $${getTotalPrice().toLocaleString()}`}
        </button>
      </div>
    </form>
  );
};

const StripePaymentModal = ({ isOpen, onClose }) => {
  const { cart } = useCart();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSuccess = () => {
    onClose();
  };

  if (!isOpen || cart.length === 0) return null;

  return (
    <div className="stripe-payment-modal show" onClick={onClose}>
      <div className="stripe-payment-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        <div className="payment-modal-header">
          <h2>Pagar con Tarjeta</h2>
          <div className="payment-methods">
            <img src="https://js.stripe.com/v3/fingerprinted/img/visa-4d825405ec0c5b2a8b65c61b3e76210c.svg" alt="Visa" />
            <img src="https://js.stripe.com/v3/fingerprinted/img/mastercard-4d825405ec0c5b2a8b65c61b3e76210c.svg" alt="Mastercard" />
            <img src="https://js.stripe.com/v3/fingerprinted/img/amex-4d825405ec0c5b2a8b65c61b3e76210c.svg" alt="American Express" />
          </div>
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm onClose={onClose} onSuccess={handleSuccess} />
        </Elements>
      </div>
    </div>
  );
};

export default StripePaymentModal;
