import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import toast from 'react-hot-toast';

const StripeCheckout = ({ onClose }) => {
  const { cart, getTotalPrice } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { loadOrders } = useOrders();
  const [loading, setLoading] = useState(false);

  const handleStripeCheckout = async () => {
    console.log('🔍 handleStripeCheckout iniciado');
    console.log('🔍 currentUser:', currentUser);
    console.log('🔍 userProfile:', userProfile);
    console.log('🔍 currentUser?.email:', currentUser?.email);
    console.log('🔍 currentUser?.uid:', currentUser?.uid);
    console.log('🔍 currentUser?.displayName:', currentUser?.displayName);
    
    if (!currentUser) {
      console.log('❌ No hay currentUser');
      toast.error('Debes iniciar sesión para realizar el pago');
      return;
    }

    if (!currentUser.email || !currentUser.uid) {
      console.log('❌ currentUser incompleto:', { email: currentUser.email, uid: currentUser.uid });
      toast.error('Información de usuario incompleta. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (cart.length === 0) {
      console.log('❌ Carrito vacío');
      toast.error('Tu carrito está vacío');
      return;
    }

    console.log('✅ Usuario autenticado y carrito con productos');
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
      if (!currentUser || !currentUser.email) {
        throw new Error('Usuario no autenticado correctamente');
      }
      
      const userInfoToSend = {
        email: currentUser.email,
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email.split('@')[0],
        fullName: currentUser.displayName || currentUser.email.split('@')[0],
        phone: userProfile?.phone || '',
        location: userProfile?.location || '',
        ...userProfile // Agregar cualquier información adicional del perfil
      };
      
      // Validar que userInfoToSend tenga la información mínima requerida
      if (!userInfoToSend.email || !userInfoToSend.uid) {
        console.error('❌ userInfoToSend incompleto:', userInfoToSend);
        throw new Error('Información de usuario incompleta. Por favor, inicia sesión nuevamente.');
      }

      // Validación adicional antes de enviar
      console.log('🔍 Validación final - userInfoToSend:', userInfoToSend);
      console.log('🔍 Validación final - userInfoToSend.email:', userInfoToSend.email);
      console.log('🔍 Validación final - userInfoToSend.uid:', userInfoToSend.uid);
      
      console.log('🔍 DEBUG - userProfile:', userProfile);
      console.log('🔍 DEBUG - currentUser:', currentUser);
      console.log('🔍 DEBUG - currentUser.email:', currentUser?.email);
      console.log('🔍 DEBUG - currentUser.uid:', currentUser?.uid);
      console.log('🔍 DEBUG - currentUser.displayName:', currentUser?.displayName);
      console.log('🔍 DEBUG - userInfoToSend:', userInfoToSend);
      console.log('🔍 DEBUG - userInfoToSend.email:', userInfoToSend.email);
      console.log('🔍 DEBUG - userInfoToSend.uid:', userInfoToSend.uid);
      
      const requestBody = {
        items: cartWithUpdatedPrices,
        orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userInfo: userInfoToSend
      };
      
      console.log('🔍 DEBUG - Request body:', requestBody);
      
      const response = await fetch('https://catalogo-clientes-0ido.onrender.com/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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

  const handleWhatsAppCheckout = async () => {
    console.log('🔍 handleWhatsAppCheckout iniciado');
    
    if (!currentUser) {
      toast.error('Debes iniciar sesión para realizar el pedido');
      return;
    }

    console.log('🔍 Usuario autenticado:', currentUser.email);
    console.log('🔍 Carrito:', cart);

    try {
      // Crear el pedido en la base de datos antes de enviar por WhatsApp
      const orderData = {
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.wholesalePrice && item.quantity >= 4 ? item.wholesalePrice : item.price,
          priceType: item.wholesalePrice && item.quantity >= 4 ? 'wholesale' : 'individual',
          image: item.image
        })),
        total: getTotalPrice(),
        paymentMethod: 'whatsapp',
        status: 'pending',
        userInfo: {
          email: currentUser.email,
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email.split('@')[0],
          ...userProfile
        }
      };

      // Registrar el pedido en Realtime Database
      const response = await fetch('https://catalogo-clientes-0ido.onrender.com/api/create-whatsapp-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderData,
          userEmail: currentUser.email,
          userId: currentUser.uid
        })
      });

      if (response.ok) {
        toast.success('✅ Pedido registrado correctamente');
        console.log('✅ Pedido registrado, recargando historial...');
        // Recargar la lista de pedidos para que aparezca en el historial
        try {
          await loadOrders();
          console.log('✅ Historial recargado');
        } catch (loadError) {
          console.error('❌ Error al recargar historial:', loadError);
        }
      } else {
        console.error('❌ Error al registrar pedido:', response.status, response.statusText);
      }

      // Crear mensaje para WhatsApp
      const cartItems = cart.map(item => 
        `${item.name} - Cantidad: ${item.quantity} - Precio: $${(item.wholesalePrice && item.quantity >= 4 ? item.wholesalePrice : item.price).toLocaleString()}`
      ).join('\n');
      
      const total = getTotalPrice();
      const userInfo = {
        email: currentUser.email,
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email.split('@')[0],
        ...userProfile
      };
      const message = `¡Hola! Me interesa realizar el siguiente pedido:\n\n${cartItems}\n\nTotal: $${total.toLocaleString()}\n\nUsuario: ${userInfo.name || userInfo.email}`;
      
      console.log('🔍 Mensaje de WhatsApp:', message);
      console.log('🔍 URL de WhatsApp:', `https://wa.me/525627274791?text=${encodeURIComponent(message)}`);
      
      // Intentar abrir WhatsApp
      const whatsappUrl = `https://wa.me/525627274791?text=${encodeURIComponent(message)}`;
      
      console.log('🔍 Intentando abrir WhatsApp...');
      
      try {
        // Primero intentar con window.open
        const newWindow = window.open(whatsappUrl, '_blank');
        
        // Si no se abre (bloqueador de pop-ups), usar window.location
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          console.log('⚠️ Pop-up bloqueado, redirigiendo directamente...');
          window.location.href = whatsappUrl;
        } else {
          console.log('✅ WhatsApp abierto en nueva ventana');
        }
      } catch (error) {
        console.error('❌ Error al abrir WhatsApp:', error);
        // Fallback: redirigir directamente
        window.location.href = whatsappUrl;
      }
      
    } catch (error) {
      console.error('Error al registrar pedido por WhatsApp:', error);
      toast.error('Error al registrar el pedido, pero puedes continuar por WhatsApp');
      
      // Continuar con WhatsApp aunque falle el registro
      const cartItems = cart.map(item => 
        `${item.name} - Cantidad: ${item.quantity} - Precio: $${(item.wholesalePrice && item.quantity >= 4 ? item.wholesalePrice : item.price).toLocaleString()}`
      ).join('\n');
      
      const total = getTotalPrice();
      const message = `¡Hola! Me interesa realizar el siguiente pedido:\n\n${cartItems}\n\nTotal: $${total.toLocaleString()}`;
      
      console.log('🔍 Fallback - Mensaje de WhatsApp:', message);
      const whatsappUrl = `https://wa.me/525627274791?text=${encodeURIComponent(message)}`;
      
      try {
        const newWindow = window.open(whatsappUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          window.location.href = whatsappUrl;
        }
      } catch (error) {
        window.location.href = whatsappUrl;
      }
    }
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
