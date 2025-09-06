import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const StripeCheckout = ({ onClose }) => {
  const { cart, getTotalPrice } = useCart();
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStripeCheckout = async () => {
    if (!currentUser) {
      toast.error('Debes iniciar sesión para realizar el pago');
      return;
    }

    if (cart.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }

    setLoading(true);

    try {
      // Mostrar indicador de carga
      toast.loading('🔄 Preparando pago seguro...', { id: 'stripe-loading' });

      // Actualizar precios basado en cantidad individual por producto
      const cartWithUpdatedPrices = cart.map(item => {
        const wholesaleQuantity = item.wholesaleQuantity || 4;
        const isWholesale = item.quantity >= wholesaleQuantity && item.wholesalePrice;
        const unitPrice = isWholesale ? item.wholesalePrice : item.price;
        
        return {
          id: item.id,
          name: `${item.name} ${isWholesale ? '(Precio Mayoreo)' : ''}`,
          quantity: item.quantity,
          unitPrice: parseFloat(unitPrice),
          totalPrice: item.quantity * parseFloat(unitPrice),
          priceType: isWholesale ? 'wholesale' : 'individual',
          images: item.images || [item.image] || []
        };
      });

      // Calcular el total actualizado
      const total = cartWithUpdatedPrices.reduce((sum, item) => sum + item.totalPrice, 0);

      // Crear sesión de checkout con Stripe
      const response = await fetch('https://catalogo-clientes-0ido.onrender.com/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartWithUpdatedPrices,
          orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userInfo: userProfile
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la sesión de checkout');
      }

      const { url } = await response.json();
      
      // Mostrar redirección
      toast.success('🚀 Redirigiendo a pasarela de pagos...', { id: 'stripe-loading' });
      
      // Redirigir al checkout de Stripe
      window.location.href = url;

    } catch (error) {
      console.error('❌ Error al procesar el pago:', error);
      toast.error(`${error.message || 'Error al procesar el pago'}`, { id: 'stripe-loading' });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppCheckout = () => {
    const cartItems = cart.map(item => 
      `${item.name} - Cantidad: ${item.quantity} - Precio: $${(item.wholesalePrice && item.quantity >= 4 ? item.wholesalePrice : item.price).toLocaleString()}`
    ).join('\n');
    
    const total = getTotalPrice();
    const message = `¡Hola! Me interesa realizar el siguiente pedido:\n\n${cartItems}\n\nTotal: $${total.toLocaleString()}`;
    
    window.open(`https://wa.me/525627274791?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <>
      <div className="stripe-checkout-container">
        <div className="checkout-options">
          <button 
            className="checkout-btn whatsapp-checkout" 
            onClick={handleWhatsAppCheckout}
          >
            <i className="fab fa-whatsapp"></i> 
            Ordenar por WhatsApp
          </button>
          
          <button 
            className="btn-stripe" 
            onClick={handleStripeCheckout}
            disabled={!currentUser || loading}
          >
            <div className="stripe-button-content">
              <div className="stripe-icon">
                <i className="fas fa-credit-card"></i>
              </div>
              <div className="stripe-text">
                <div className="stripe-title">Pagar con</div>
                <div className="stripe-brand">Tarjeta</div>
              </div>
              <div className="stripe-secure">
                <i className="fas fa-shield-alt"></i>
              </div>
            </div>
          </button>
        </div>
        
        {!currentUser && (
          <div className="checkout-login-notice">
            <p>Inicia sesión para pagar con tarjeta</p>
          </div>
        )}
      </div>

    </>
  );
};

export default StripeCheckout;
