import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';

const ProductModal = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

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

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setCurrentImageIndex(0);
    }
  }, [product]);

  if (!product || !isOpen) return null;

  const images = product.images || [product.image].filter(Boolean);
  const hasMultipleImages = images.length > 1;

  const getCurrentPrice = () => {
    return product.wholesalePrice && quantity >= 4 
      ? product.wholesalePrice 
      : product.individualPrice || product.price;
  };

  const getStockStatus = () => {
    if (product.stock === 0) return { status: 'out-of-stock', text: 'Agotado' };
    if (product.stock <= 5) return { status: 'low-stock', text: 'Pocas unidades' };
    return { status: 'in-stock', text: 'Disponible' };
  };

  const stockInfo = getStockStatus();

  const handleAddToCart = () => {
    addToCart(product, quantity);
    onClose();
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={`product-modal ${isOpen ? 'show' : ''}`} onClick={onClose}>
      <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="product-modal-body">
          <div className="product-modal-image">
            <div className="modal-image-carousel">
              <div className="modal-carousel-container">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={product.name}
                    className={index === currentImageIndex ? 'active' : ''}
                    style={{ display: index === currentImageIndex ? 'block' : 'none' }}
                  />
                ))}
              </div>
              
              {hasMultipleImages && (
                <div className="modal-carousel-indicators">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className={`carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="product-modal-info">
            <div className="product-breadcrumb">
              <span>Inicio</span>
              <i className="fas fa-chevron-right"></i>
              <span>{product.category || 'Categoría'}</span>
              <i className="fas fa-chevron-right"></i>
              <span>{product.name}</span>
            </div>
            
            <h1 className="modal-product-name">{product.name}</h1>
            
            <div className="modal-product-brand">
              Marca: <span>{product.brand || 'SOFT DUCK'}</span>
            </div>
            
            <div className="modal-product-sku">
              SKU: <span>{product.sku || product.id}</span>
            </div>
            
            <div className={`modal-product-stock ${stockInfo.status}`}>
              <i className="fas fa-check-circle"></i>
              {stockInfo.text}
            </div>
            
            <div className="modal-product-description">
              {product.description || 'Descripción del producto no disponible.'}
            </div>
            
            <div className="modal-product-prices">
              <div className="modal-price-item individual-price">
                <span className="modal-price-label">Precio Individual</span>
                <span className="modal-price-value">
                  ${(product.individualPrice || product.price || 0).toLocaleString()}
                </span>
              </div>
              {product.wholesalePrice && (
                <div className="modal-price-item wholesale-price">
                  <span className="modal-price-label">
                    Precio Mayoreo <span>(4+)</span>
                  </span>
                  <span className="modal-price-value">
                    ${product.wholesalePrice.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="modal-quantity-section">
              <label>Cantidad</label>
              <div className="modal-quantity-controls">
                <button 
                  className="quantity-btn" 
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input 
                  type="number" 
                  className="quantity-input" 
                  value={quantity}
                  min="1"
                  max={product.stock}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                />
                <button 
                  className="quantity-btn" 
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="modal-action-buttons">
              <button 
                className="modal-add-cart"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <i className="fas fa-cart-plus"></i>
                Agregar al carrito
              </button>
              <button className="modal-view-cart" onClick={() => {
                // Abrir modal del carrito usando el contexto
                onClose();
              }}>
                <i className="fas fa-shopping-cart"></i>
                Ver carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;