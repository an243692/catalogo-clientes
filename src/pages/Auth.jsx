import React from 'react';
import AuthModal from '../components/AuthModal';

const Auth = () => {
  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-content">
          <h1>Autenticación</h1>
          <p>Inicia sesión o regístrate para continuar</p>
          <AuthModal isOpen={true} onClose={() => window.history.back()} />
        </div>
      </div>
    </div>
  );
};

export default Auth;
