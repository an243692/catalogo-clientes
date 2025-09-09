import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      // Aquí podrías hacer una llamada al backend para verificar el estado del pago
      console.log('✅ Pago exitoso - Session ID:', sessionId);
      
      // Simular carga de datos de la sesión
      setTimeout(() => {
        setSessionData({
          sessionId: sessionId,
          status: 'completed',
          message: 'Tu pedido ha sido procesado correctamente.'
        });
        setLoading(false);
      }, 2000);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleViewOrders = () => {
    navigate('/');
    // Aquí podrías abrir el modal de historial
  };

  if (loading) {
    return (
      <div className="success-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        
        <h1>¡Pago Exitoso!</h1>
        
        <div className="success-message">
          <p>Tu pedido ha sido procesado correctamente.</p>
          <p>Recibirás un correo de confirmación en breve.</p>
        </div>

        {sessionData && (
          <div className="session-info">
            <p><strong>ID de Sesión:</strong> {sessionData.sessionId}</p>
            <p><strong>Estado:</strong> {sessionData.status}</p>
          </div>
        )}

        <div className="success-actions">
          <button className="btn-primary" onClick={handleGoHome}>
            <i className="fas fa-home"></i>
            Volver al Inicio
          </button>
          
          <button className="btn-secondary" onClick={handleViewOrders}>
            <i className="fas fa-list"></i>
            Ver Mis Pedidos
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
