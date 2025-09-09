import React from 'react';

const WhatsAppFloat = () => {
  const openWhatsApp = () => {
    window.open('https://wa.me/525627274791?text=¡Hola!%20Me%20interesa%20conocer%20más%20sobre%20sus%20productos%20de%20SOFT%20DUCK', '_blank');
  };

  return (
    <div className="whatsapp-float">
      <a 
        href="https://wa.me/525627274791?text=¡Hola!%20Me%20interesa%20conocer%20más%20sobre%20sus%20productos%20de%20SOFT%20DUCK" 
        className="whatsapp-button" 
        target="_blank" 
        rel="noopener noreferrer" 
        title="Contactar por WhatsApp"
        onClick={openWhatsApp}
      >
        <i className="fab fa-whatsapp"></i>
      </a>
    </div>
  );
};

export default WhatsAppFloat;