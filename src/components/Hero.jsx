import React from 'react';

const Hero = () => {
  const scrollToProducts = () => {
    const productsSection = document.querySelector('.products-section');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/525627274791?text=¡Hola!%20Me%20interesa%20conocer%20más%20sobre%20sus%20productos%20de%20SOFT%20DUCK', '_blank');
  };

  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            Descubre productos de <span className="title-highlight">calidad premium</span>
          </h1>
          <p className="hero-subtitle">
            Encuentra exactamente lo que necesitas con la mejor calidad y precios competitivos
          </p>
          
          <div className="payment-badges">
            <div className="payment-badge">
              <i className="fas fa-credit-card"></i>
              <span>Pago Seguro</span>
            </div>
            <div className="payment-badge">
              <i className="fas fa-shipping-fast"></i>
              <span>Envío Rápido</span>
            </div>
          </div>

          <div className="hero-actions">
            <button className="hero-cta primary" onClick={scrollToProducts}>
              <i className="fas fa-search"></i>
              <span>Explorar Catálogo</span>
            </button>
            <button className="hero-cta secondary" onClick={openWhatsApp}>
              <i className="fab fa-whatsapp"></i>
              <span>Contactar</span>
            </button>
          </div>
        </div>
        <div className="hero-logo">
          <div className="logo-container">
            <div className="logo-circle">
              <img src="/softduck.png" alt="SOFT DUCK" className="hero-logo-image" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;