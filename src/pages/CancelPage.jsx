import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CancelPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Limpiar información de pedido pendiente al cancelar
    const cleanup = () => {
      localStorage.removeItem('pendingOrderSession');
      localStorage.removeItem('pendingOrderId');
      localStorage.removeItem('pendingOrderTimestamp');
      localStorage.removeItem('sessionInfo');
      localStorage.removeItem('redirectingToStripe');
      localStorage.removeItem('stripeRedirectTime');
      localStorage.removeItem('pageAwayTime');
      localStorage.removeItem('pageClosing');
      console.log('🧹 Información de pedido pendiente limpiada tras cancelación');
    };

    cleanup();
  }, []);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleTryAgain = () => {
    navigate('/');
    // Aquí podrías abrir el modal del carrito para intentar de nuevo
  };

  return (
    <div className="cancel-page">
      <div className="cancel-container">
        <div className="cancel-icon">
          <i className="fas fa-times-circle"></i>
        </div>
        
        <h1>Pago Cancelado</h1>
        
        <div className="cancel-message">
          <p>Tu pago ha sido cancelado.</p>
          <p>No se ha realizado ningún cargo a tu tarjeta.</p>
          <p>Puedes intentar realizar el pago nuevamente cuando estés listo.</p>
        </div>

        <div className="cancel-actions">
          <button className="btn-primary" onClick={handleGoHome}>
            <i className="fas fa-home"></i>
            Volver al Inicio
          </button>
          
          <button className="btn-secondary" onClick={handleTryAgain}>
            <i className="fas fa-redo"></i>
            Intentar de Nuevo
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelPage;
