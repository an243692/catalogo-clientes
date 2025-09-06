import React from 'react'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-logo">
            <img src="/softduck.png" alt="SOFT DUCK" className="footer-logo-img" />
            <h3>SOFT DUCK</h3>
          </div>
          <p>Tu tienda de confianza con productos premium y experiencia excepcional</p>
          <div className="payment-methods">
            <div className="payment-method">
              <i className="fas fa-credit-card"></i>
              <span>Visa & Mastercard</span>
            </div>
            <div className="payment-method">
              <i className="fas fa-university"></i>
              <span>Tarjetas de Débito</span>
            </div>
            <div className="payment-method">
              <i className="fab fa-stripe"></i>
              <span>Pagos Seguros con Stripe</span>
            </div>
            <div className="payment-method">
              <i className="fas fa-mobile-alt"></i>
              <span>Pagos Móviles</span>
            </div>
            <div className="payment-method">
              <i className="fab fa-whatsapp"></i>
              <span>Pedidos por WhatsApp</span>
            </div>
          </div>
        </div>
        
        <div className="footer-section">
          <h4><i className="fas fa-link"></i> Enlaces Rápidos</h4>
          <ul>
            <li><a href="#"><i className="fas fa-home"></i> Inicio</a></li>
            <li><a href="#"><i className="fas fa-box"></i> Productos</a></li>
            <li><a href="#"><i className="fas fa-phone"></i> Contacto</a></li>
            <li><a href="#"><i className="fas fa-shield-alt"></i> Política de Privacidad</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4><i className="fas fa-headset"></i> Contacto</h4>
          <div className="contact-item">
            <i className="fas fa-phone"></i>
            <span>+52 56 2727 4791</span>
          </div>
          <div className="contact-item">
            <i className="fas fa-envelope"></i>
            <span>vhjocar@gmail.com</span>
          </div>
          <div className="contact-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>Las Cruces No 40, Col. Centro</span>
          </div>
          <div className="social-links">
            <a href="#" className="social-link"><i className="fab fa-facebook"></i></a>
            <a href="#" className="social-link"><i className="fab fa-instagram"></i></a>
            <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>© 2025 SOFT DUCK. Todos los derechos reservados.</p>
          <div className="security-badges">
            <div className="security-badge">
              <i className="fas fa-shield-alt"></i>
              <span>Pagos Seguros</span>
            </div>
            <div className="security-badge">
              <i className="fas fa-lock"></i>
              <span>SSL Certificado</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
