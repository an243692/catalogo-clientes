import React from 'react';

const CartModal = ({ cart, setCart, onClose, onCheckout, onStripePayment, currentUser, userProfile }) => {
    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    const increaseQuantity = (productId) => {
        setCart(prev => prev.map(item => 
            item.id === productId 
                ? { ...item, quantity: item.quantity + 1 }
                : item
        ));
    };

    const decreaseQuantity = (productId) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                if (item.quantity > 1) {
                    return { ...item, quantity: item.quantity - 1 };
                } else {
                    return null; // Will be filtered out
                }
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
            setCart([]);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content cart-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Carrito de Compras</h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="cart-content">
                    {cart.length === 0 ? (
                        <div className="empty-cart">
                            <i className="fas fa-shopping-cart"></i>
                            <h3>Carrito Vacío</h3>
                            <p>Agrega productos desde el catálogo para comenzar tu experiencia de compra.</p>
                        </div>
                    ) : (
                        <>
                            <div className="cart-items">
                                {cart.map(item => (
                                    <div key={item.id} className="cart-item">
                                        <div className="cart-item-info">
                                            <div className="cart-item-name">{item.name}</div>
                                            <div className="cart-item-price-info">
                                                <div className="cart-item-unit-price">
                                                    ${item.unitPrice.toFixed(2)} c/u ({item.priceType === 'wholesale' ? 'Mayoreo' : 'Individual'})
                                                </div>
                                                <div className="cart-item-total-price">
                                                    Subtotal: ${item.totalPrice.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="cart-item-controls">
                                            <button onClick={() => decreaseQuantity(item.id)}>-</button>
                                            <span className="cart-item-quantity">{item.quantity}</span>
                                            <button onClick={() => increaseQuantity(item.id)}>+</button>
                                        </div>
                                        
                                        <button 
                                            className="remove-item"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            <i className="fas fa-trash-can"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="cart-summary">
                                <div className="cart-total">
                                    <span>Total ({totalQuantity} productos):</span>
                                    <span className="total-amount">${total.toFixed(2)}</span>
                                </div>
                                
                                <div className="cart-actions">
                                    <button className="clear-cart-btn" onClick={clearCart}>
                                        <i className="fas fa-trash"></i>
                                        Vaciar Carrito
                                    </button>
                                    
                                    {currentUser && userProfile ? (
                                        <div className="checkout-options">
                                            <button 
                                                className="checkout-btn whatsapp"
                                                onClick={onCheckout}
                                            >
                                                <i className="fab fa-whatsapp"></i>
                                                Pedir por WhatsApp
                                            </button>
                                            
                                            <button 
                                                className="checkout-btn stripe"
                                                onClick={onStripePayment}
                                            >
                                                <i className="fas fa-credit-card"></i>
                                                Pagar con Tarjeta
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            className="checkout-btn disabled"
                                            disabled
                                        >
                                            <i className="fas fa-lock"></i>
                                            Inicia sesión para continuar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CartModal;