import React, { useState, useEffect } from 'react';

const ProductModal = ({ product, quantity, setQuantity, onClose, onAddToCart }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [autoSlideInterval, setAutoSlideInterval] = useState(null);

    const images = product.images || [product.imageUrl];
    const individualPrice = product.price || product.individualPrice || 0;
    const wholesalePrice = product.wholesalePrice || individualPrice * 0.8;
    const wholesaleQuantity = product.wholesaleQuantity || 4;
    const stock = product.stock || 0;

    useEffect(() => {
        if (images.length > 1) {
            const interval = setInterval(() => {
                setCurrentImageIndex(prev => (prev + 1) % images.length);
            }, 4000);
            setAutoSlideInterval(interval);
        }

        return () => {
            if (autoSlideInterval) {
                clearInterval(autoSlideInterval);
            }
        };
    }, [images.length]);

    const goToImage = (index) => {
        setCurrentImageIndex(index);
    };

    const handleQuantityChange = (newQuantity) => {
        if (newQuantity >= 1 && newQuantity <= stock) {
            setQuantity(newQuantity);
        }
    };

    const handleAddToCart = () => {
        if (stock > 0) {
            onAddToCart(quantity);
        }
    };

    const formatDescription = (description) => {
        if (!description) return '';
        
        if (description.includes('<') && description.includes('>')) {
            return description;
        }
        
        const items = description
            .split(/[.,;-]/)
            .map(item => item.trim())
            .filter(item => item.length > 0);
        
        if (items.length <= 1) {
            return `<p>${description}</p>`;
        }
        
        return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
    };

    const getStockStatusClass = (stock) => {
        if (stock === 0) return 'out-of-stock';
        if (stock <= 5) return 'low-stock';
        return 'in-stock';
    };

    const getStockStatusText = (stock) => {
        if (stock === 0) return 'Sin Stock';
        if (stock <= 5) return `Stock Bajo (${stock})`;
        return `En Stock (${stock})`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content product-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="breadcrumb">
                        <span className="breadcrumb-category">{product.category}</span>
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-product">{product.name}</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="product-modal-content">
                    <div className="product-images">
                        <div className="image-carousel">
                            <div className="carousel-container">
                                {images.map((imageUrl, index) => (
                                    <img
                                        key={index}
                                        src={imageUrl}
                                        alt={product.name}
                                        className={`carousel-image ${index === currentImageIndex ? 'active' : ''}`}
                                        onError={(e) => {
                                            e.target.src = 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop';
                                        }}
                                    />
                                ))}
                            </div>
                            
                            {images.length > 1 && (
                                <div className="carousel-indicators">
                                    {images.map((_, index) => (
                                        <div
                                            key={index}
                                            className={`carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                                            onClick={() => goToImage(index)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="product-details">
                        <div className="product-header">
                            <div className="product-brand">SOFT DUCK</div>
                            <h1 className="product-name">{product.name}</h1>
                            <div className="product-sku">SKU: {product.id}</div>
                        </div>

                        <div className={`product-stock ${getStockStatusClass(stock)}`}>
                            {getStockStatusText(stock)}
                        </div>

                        <div className="product-description">
                            <h3>Descripción</h3>
                            <div 
                                className="description-content"
                                dangerouslySetInnerHTML={{ __html: formatDescription(product.description) }}
                            />
                        </div>

                        <div className="product-pricing">
                            <div className="price-section">
                                <div className="price-item">
                                    <span className="price-label">Precio Individual:</span>
                                    <span className="price-value">${individualPrice.toFixed(2)}</span>
                                </div>
                                <div className="price-item">
                                    <span className="price-label">Precio Mayoreo ({wholesaleQuantity}+):</span>
                                    <span className="price-value">${wholesalePrice.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="quantity-section">
                            <label htmlFor="quantity">Cantidad:</label>
                            <div className="quantity-controls">
                                <button 
                                    className="quantity-btn"
                                    onClick={() => handleQuantityChange(quantity - 1)}
                                    disabled={quantity <= 1}
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    id="quantity"
                                    value={quantity}
                                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                                    min="1"
                                    max={stock}
                                    className="quantity-input"
                                />
                                <button 
                                    className="quantity-btn"
                                    onClick={() => handleQuantityChange(quantity + 1)}
                                    disabled={quantity >= stock}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="product-actions">
                            <button 
                                className={`add-to-cart-btn ${stock === 0 ? 'disabled' : ''}`}
                                onClick={handleAddToCart}
                                disabled={stock === 0}
                            >
                                <i className={`fas fa-${stock === 0 ? 'times-circle' : 'cart-plus'}`}></i>
                                {stock === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
                            </button>
                            
                            <button 
                                className="view-cart-btn"
                                onClick={() => {
                                    onClose();
                                    // Aquí podrías abrir el modal del carrito
                                }}
                            >
                                <i className="fas fa-shopping-cart"></i>
                                Ver Carrito
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;