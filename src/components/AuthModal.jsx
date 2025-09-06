import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    location: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      onClose();
    } catch (err) {
      setError('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(formData.email, formData.password, {
        name: formData.name,
        phone: formData.phone,
        location: formData.location
      });
      onClose();
    } catch (err) {
      setError('Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal show" onClick={onClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="auth-header">
          <h2>Bienvenido a SOFT DUCK</h2>
          <p>Únete a nuestra comunidad y disfruta de ofertas exclusivas</p>
        </div>
        
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Iniciar Sesión
          </button>
          <button 
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Registrarse
          </button>
        </div>
        
        {error && (
          <div className="error-message" style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        
        {/* Login Form */}
        <form 
          className={`auth-form ${activeTab === 'login' ? 'active' : ''}`}
          onSubmit={handleLogin}
        >
          <div className="form-group">
            <label htmlFor="loginEmail">Correo Electrónico</label>
            <div className="input-wrapper">
              <i className="fas fa-envelope"></i>
              <input 
                type="email" 
                id="loginEmail"
                name="email"
                placeholder="tu@email.com" 
                value={formData.email}
                onChange={handleInputChange}
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="loginPassword">Contraseña</label>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input 
                type={showPassword ? 'text' : 'password'}
                id="loginPassword"
                name="password"
                placeholder="Tu contraseña" 
                value={formData.password}
                onChange={handleInputChange}
                required 
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={togglePasswordVisibility}
              >
                <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
              </button>
            </div>
          </div>
          
          <button type="submit" className="auth-submit" disabled={loading}>
            <span>{loading ? 'Iniciando...' : 'Iniciar Sesión'}</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </form>
        
        {/* Register Form */}
        <form 
          className={`auth-form ${activeTab === 'register' ? 'active' : ''}`}
          onSubmit={handleRegister}
        >
          <div className="form-group">
            <label htmlFor="registerName">Nombre Completo</label>
            <div className="input-wrapper">
              <i className="fas fa-user"></i>
              <input 
                type="text" 
                id="registerName"
                name="name"
                placeholder="Tu nombre completo" 
                value={formData.name}
                onChange={handleInputChange}
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="registerPhone">Número de Teléfono</label>
            <div className="input-wrapper">
              <i className="fas fa-phone"></i>
              <input 
                type="tel" 
                id="registerPhone"
                name="phone"
                placeholder="Tu número de teléfono" 
                value={formData.phone}
                onChange={handleInputChange}
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="registerEmail">Correo Electrónico</label>
            <div className="input-wrapper">
              <i className="fas fa-envelope"></i>
              <input 
                type="email" 
                id="registerEmail"
                name="email"
                placeholder="tu@email.com" 
                value={formData.email}
                onChange={handleInputChange}
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="registerPassword">Contraseña</label>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input 
                type={showPassword ? 'text' : 'password'}
                id="registerPassword"
                name="password"
                placeholder="Crea una contraseña" 
                value={formData.password}
                onChange={handleInputChange}
                required 
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={togglePasswordVisibility}
              >
                <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="registerLocation">Ubicación</label>
            <div className="input-wrapper">
              <i className="fas fa-map-marker-alt"></i>
              <input 
                type="text" 
                id="registerLocation"
                name="location"
                placeholder="Tu ciudad o ubicación" 
                value={formData.location}
                onChange={handleInputChange}
                required 
              />
            </div>
          </div>
          
          <button type="submit" className="auth-submit" disabled={loading}>
            <span>{loading ? 'Creando...' : 'Crear Cuenta'}</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;