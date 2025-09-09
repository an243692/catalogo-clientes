import React from 'react';
import { useCart } from '../contexts/CartContext';
import CartModal from '../components/CartModal';

const Cart = () => {
  const { cart, getTotalPrice, getTotalItems } = useCart();

  return (
    <div className="cart-page">
      <div className="container">
        <h1>Mi Carrito</h1>
        {cart.length === 0 ? (
          <div className="empty-cart">
            <i className="fas fa-shopping-cart"></i>
            <h2>Tu carrito está vacío</h2>
            <p>Agrega algunos productos para comenzar</p>
            <a href="/" className="btn-primary">Continuar Comprando</a>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    <img src={item.image || '/placeholder-product.jpg'} alt={item.name} />
                  </div>
                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    <p>Precio: ${item.price.toLocaleString()}</p>
                    <p>Cantidad: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <h3>Resumen del Pedido</h3>
              <p>Total de productos: {getTotalItems()}</p>
              <p>Total: ${getTotalPrice().toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
