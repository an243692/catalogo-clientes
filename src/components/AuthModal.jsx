import React, { useState } from 'react';

const AuthModal = ({ authTab, setAuthTab, authForm, setAuthForm, onLogin, onRegister, onClose }) => {
    const [showPassword, setShowPassword] = useState({ login: false, register: false });

    const handleInputChange = (form, field, value) => {
        setAuthForm(prev => ({
            ...prev,
            [form]: {
                ...prev[form],
                [field]: value
            }
        }));
    };

    const togglePasswordVisibility = (form) => {
        setShowPassword(prev => ({
            ...prev,
            [form]: !prev[form]
        }));
    };

    const handleSubmit = (e, formType) => {
        e.preventDefault();
        if (formType === 'login') {
            onLogin();
        } else {
            onRegister();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Iniciar Sesión / Registrarse</h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="auth-tabs">
                    <button 
                        className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                        onClick={() => setAuthTab('login')}
                    >
                        Iniciar Sesión
                    </button>
                    <button 
                        className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                        onClick={() => setAuthTab('register')}
                    >
                        Registrarse
                    </button>
                </div>

                {/* Login Form */}
                {authTab === 'login' && (
                    <form className="auth-form active" onSubmit={(e) => handleSubmit(e, 'login')}>
                        <div className="form-group">
                            <label htmlFor="loginEmail">Email</label>
                            <input
                                type="email"
                                id="loginEmail"
                                value={authForm.login.email}
                                onChange={(e) => handleInputChange('login', 'email', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="loginPassword">Contraseña</label>
                            <div className="password-input">
                                <input
                                    type={showPassword.login ? 'text' : 'password'}
                                    id="loginPassword"
                                    value={authForm.login.password}
                                    onChange={(e) => handleInputChange('login', 'password', e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('login')}
                                >
                                    <i className={`fas fa-${showPassword.login ? 'eye-slash' : 'eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="submit-btn">
                            Iniciar Sesión
                        </button>
                    </form>
                )}

                {/* Register Form */}
                {authTab === 'register' && (
                    <form className="auth-form active" onSubmit={(e) => handleSubmit(e, 'register')}>
                        <div className="form-group">
                            <label htmlFor="registerName">Nombre Completo</label>
                            <input
                                type="text"
                                id="registerName"
                                value={authForm.register.fullName}
                                onChange={(e) => handleInputChange('register', 'fullName', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="registerPhone">Teléfono</label>
                            <input
                                type="tel"
                                id="registerPhone"
                                value={authForm.register.phone}
                                onChange={(e) => handleInputChange('register', 'phone', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="registerEmail">Email</label>
                            <input
                                type="email"
                                id="registerEmail"
                                value={authForm.register.email}
                                onChange={(e) => handleInputChange('register', 'email', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="registerLocation">Ubicación</label>
                            <input
                                type="text"
                                id="registerLocation"
                                value={authForm.register.location}
                                onChange={(e) => handleInputChange('register', 'location', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="registerPassword">Contraseña</label>
                            <div className="password-input">
                                <input
                                    type={showPassword.register ? 'text' : 'password'}
                                    id="registerPassword"
                                    value={authForm.register.password}
                                    onChange={(e) => handleInputChange('register', 'password', e.target.value)}
                                    required
                                    minLength="6"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('register')}
                                >
                                    <i className={`fas fa-${showPassword.register ? 'eye-slash' : 'eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="submit-btn">
                            Registrarse
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AuthModal;