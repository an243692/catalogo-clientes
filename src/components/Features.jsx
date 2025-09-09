import React, { useEffect, useRef } from 'react';

const Features = () => {
  const carouselRef = useRef(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    // Crear elementos duplicados para el scroll infinito
    const originalContent = carousel.innerHTML;
    carousel.innerHTML = originalContent + originalContent;

    // Configurar animación
    const scrollSpeed = 1; // píxeles por frame
    let scrollPosition = 0;
    const maxScroll = carousel.scrollWidth / 2;

    const animate = () => {
      scrollPosition += scrollSpeed;
      if (scrollPosition >= maxScroll) {
        scrollPosition = 0;
      }
      carousel.scrollLeft = scrollPosition;
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      // Cleanup si es necesario
    };
  }, []);

  const features = [
    {
      icon: 'fas fa-credit-card',
      title: 'Pagos Seguros',
      description: 'Tarjetas de crédito/débito'
    },
    {
      icon: 'fab fa-stripe stripe-icon',
      title: 'Stripe Payments',
      description: 'Procesamiento seguro'
    },
    {
      icon: 'fas fa-shipping-fast',
      title: 'Envíos Gratis',
      description: 'En pedidos seleccionados'
    },
    {
      icon: 'fab fa-whatsapp whatsapp-icon',
      title: 'Pedidos WhatsApp',
      description: 'Atención personalizada'
    },
    {
      icon: 'fas fa-shield-alt',
      title: 'Compra Segura',
      description: 'SSL certificado'
    },
    {
      icon: 'fas fa-truck',
      title: 'Entregas Rápidas',
      description: '24-48 horas'
    }
  ];

  return (
    <section className="features-section">
      <div className="features-container">
        <div className="features-carousel" ref={carouselRef}>
          {features.map((feature, index) => (
            <div key={index} className="feature-item">
              <div className="feature-icon">
                <i className={feature.icon}></i>
              </div>
              <div className="feature-text">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;