import { useState, useEffect } from 'react';

// Cargar Stripe dinámicamente
const loadStripe = () => {
  return new Promise((resolve) => {
    if (window.Stripe) {
      resolve(window.Stripe);
    } else {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => resolve(window.Stripe);
      document.head.appendChild(script);
    }
  });
};

export const useStripe = () => {
  const [stripe, setStripe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const Stripe = await loadStripe();
        const stripeInstance = Stripe('pk_live_51Rq2HiLIzlkBZfRyuBjZyqBRGjalQWU5Cpwzaqt358SF0UGsMpSSpRhSXHtrLwi7Jc4VAjGEWGEwMG1hgjFeK8XY00899yMKQu');
        setStripe(stripeInstance);
      } catch (err) {
        setError('Error al cargar Stripe');
        console.error('Error loading Stripe:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeStripe();
  }, []);

  const createCheckoutSession = async (cartItems, userInfo, deliveryInfo) => {
    if (!stripe) {
      throw new Error('Stripe no está cargado');
    }

    try {
      // Aquí se haría la llamada al backend para crear la sesión de checkout
      // Por ahora, simulamos la respuesta
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartItems,
          userInfo,
          deliveryInfo
        }),
      });

      const session = await response.json();

      // Redirigir a Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      throw err;
    }
  };

  const handlePaymentSuccess = (sessionId) => {
    // Manejar el éxito del pago
    console.log('Payment successful:', sessionId);
    
    // Limpiar el carrito
    localStorage.removeItem('cart');
    
    // Redirigir a página de éxito
    window.location.href = '/success';
  };

  const handlePaymentCancel = () => {
    // Manejar la cancelación del pago
    console.log('Payment cancelled');
    
    // Limpiar pedidos pendientes
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (userProfile.email) {
      // Aquí se llamaría a la función de limpieza
      console.log('Cleaning up pending orders for:', userProfile.email);
    }
    
    // Redirigir a página de cancelación
    window.location.href = '/cancel';
  };

  return {
    stripe,
    loading,
    error,
    createCheckoutSession,
    handlePaymentSuccess,
    handlePaymentCancel
  };
};

export default useStripe;
