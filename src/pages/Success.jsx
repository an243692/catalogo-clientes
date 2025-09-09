import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Success = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { clearCart } = useCart();

  useEffect(() => {
    // Limpiar el carrito después de un pago exitoso
    clearCart();
    
    // Redirigir al inicio después de 3 segundos
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [clearCart, navigate]);

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        <h1>¡Pago Exitoso!</h1>
        <p>Tu pedido ha sido procesado correctamente.</p>
        <p>Recibirás un correo de confirmación en breve.</p>
        <div className="success-actions">
          <button 
            className="btn-primary"
            onClick={() => navigate('/')}
          >
            Volver al Inicio
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate('/history')}
          >
            Ver Mis Pedidos
          </button>
        </div>
      </div>
    </div>
  );
};

export default Success;
