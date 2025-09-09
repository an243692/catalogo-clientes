import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Cancel = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    // Redirigir al inicio después de 3 segundos si no hay usuario
    if (!currentUser) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentUser, navigate]);

  return (
    <div className="cancel-page">
      <div className="cancel-container">
        <div className="cancel-icon">
          <i className="fas fa-times-circle"></i>
        </div>
        <h1>Pago Cancelado</h1>
        <p>Tu pago ha sido cancelado.</p>
        <p>No se ha realizado ningún cargo.</p>
        <div className="cancel-actions">
          <button 
            className="btn-primary"
            onClick={() => navigate('/')}
          >
            Volver al Inicio
          </button>
          {currentUser && (
            <button 
              className="btn-secondary"
              onClick={() => navigate('/cart')}
            >
              Ver Mi Carrito
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cancel;
