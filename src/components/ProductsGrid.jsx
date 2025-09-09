import React, { useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { useProducts } from '../contexts/ProductsContext'

const ProductsGrid = ({ products, loading, onOpenModal }) => {
  const { addToCart } = useCart()
  const { getCategoryIcon } = useProducts()

  const handleAddToCart = (product, quantity = 1) => {
    addToCart(product, quantity)
  }

  const openProductModal = (product) => {
    if (onOpenModal) {
      onOpenModal(product);
    }
  }

  if (loading) {
    return (
      <div className="products-grid">
        <div className="loading">
          <div className="loading-spinner"></div>
          <h3>Cargando productos</h3>
          <p>Preparando nuestro catálogo para ti...</p>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="products-grid">
        <div className="empty-state">
          <h3>No se encontraron productos</h3>
          <p>Intenta ajustar los filtros para encontrar lo que buscas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="products-grid">
      {products.map(product => (
        <ProductCard 
          key={product.id} 
          product={product} 
          onAddToCart={handleAddToCart}
          onOpenModal={openProductModal}
          getCategoryIcon={getCategoryIcon}
        />
      ))}
    </div>
  )
}

const ProductCard = ({ product, onAddToCart, onOpenModal, getCategoryIcon }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const images = product.images || [product.image].filter(Boolean)
  const hasMultipleImages = images.length > 1

  const getCurrentPrice = () => {
    return product.wholesalePrice && product.quantity >= 4 
      ? product.wholesalePrice 
      : product.price
  }

  const getStockStatus = () => {
    if (product.stock === 0) return { status: 'out-of-stock', text: 'Agotado' }
    if (product.stock <= 5) return { status: 'low-stock', text: 'Pocas unidades' }
    return { status: 'in-stock', text: 'Disponible' }
  }

  const stockInfo = getStockStatus()

  return (
    <div 
      className="product-card"
      onClick={() => onOpenModal(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Section */}
      <div className="product-image-section">
        <div className="image-carousel">
          <div className="carousel-container">
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={product.name}
                className={`carousel-image ${index === currentImageIndex ? 'active' : ''}`}
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
              />
            ))}
          </div>
          
          {hasMultipleImages && (
            <>
              <div className="carousel-indicators">
                {images.map((_, index) => (
                  <div
                    key={index}
                    className={`carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
              <div className="image-count">
                {currentImageIndex + 1}/{images.length}
              </div>
            </>
          )}
        </div>

        {/* Product Actions */}
        <div className="product-actions">
          <button 
            className="product-action-btn" 
            title="Ver detalles"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(product);
            }}
          >
            <i className="fas fa-eye"></i>
          </button>
          <button 
            className="product-action-btn" 
            title="Agregar a favoritos"
            onClick={(e) => e.stopPropagation()}
          >
            <i className="fas fa-heart"></i>
          </button>
        </div>
      </div>

      {/* Product Content */}
      <div className="product-content">
        {product.promotion && (
          <div className="product-promotion">{product.promotion}</div>
        )}
        
        <div className="product-brand">{product.brand || 'SOFT DUCK'}</div>
        <div className="product-name">
          {product.name}
        </div>
        
        <div className="product-price-section">
          <div className="product-price">
            ${getCurrentPrice().toLocaleString()}
            {product.wholesalePrice && product.quantity >= 4 && (
              <span className="product-price original">
                ${product.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        
        <div className={`product-stock ${stockInfo.status}`}>
          {stockInfo.text}
        </div>
        
        <button 
          className="add-to-cart"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          disabled={product.stock === 0}
        >
          <i className="fas fa-cart-plus"></i>
          {product.stock === 0 ? 'Agotado' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  )
}

export default ProductsGrid
