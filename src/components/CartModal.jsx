import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import StripeCheckout from './StripeCheckout';

const CartModal = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, updateQuantity, clearCart, getTotalPrice, getTotalItems } = useCart();
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

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

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="cart-modal show" onClick={onClose}>
      <div className="cart-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h2><i className="fas fa-shopping-bag"></i> Mi Carrito</h2>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <i className="fas fa-shopping-cart"></i>
              <h3>Tu carrito está vacío</h3>
              <p>Agrega algunos productos para comenzar</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-image">
                  <img src={item.image || '/placeholder-product.jpg'} alt={item.name} />
                </div>
                
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price-info">
                    <span>Precio: ${item.price.toLocaleString()}</span>
                    {item.wholesalePrice && item.quantity >= 4 && (
                      <span className="wholesale-price">
                        Precio mayoreo: ${item.wholesalePrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="cart-item-controls">
                  <button 
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span className="cart-item-quantity">{item.quantity}</span>
                  <button 
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button 
                    className="remove-item"
                    onClick={() => removeFromCart(item.id)}
                    title="Eliminar producto"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {cart.length > 0 && (
          <>
            <div className="cart-summary">
              <div className="cart-quantity-info">
                <span>{getTotalItems()} productos</span>
              </div>
              <div className="cart-total">
                <h3>Total del Pedido</h3>
                <div className="cart-total-amount">${getTotalPrice().toLocaleString()}</div>
              </div>
            </div>
            
            <div className="cart-actions">
              <button className="clear-cart" onClick={clearCart}>
                <i className="fas fa-trash-can"></i> Vaciar Carrito
              </button>
              <StripeCheckout onClose={onClose} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartModal;