import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrdersContext';
import toast from 'react-hot-toast';

const DeliveryModal = ({ isOpen, onClose }) => {
  const { cart, getTotalPrice, clearCart } = useCart();
  const { createOrder } = useOrders();
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pickupStore: '',
    deliveryStreet: '',
    deliveryCity: '',
    deliveryState: '',
    deliveryZip: '',
    deliveryInstructions: ''
  });

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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }

    setLoading(true);

    try {
      const deliveryInfo = {
        type: deliveryType,
        ...formData
      };

      const orderData = {
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.wholesalePrice && item.quantity >= 4 ? item.wholesalePrice : item.price,
          quantity: item.quantity,
          image: item.image || item.images?.[0]
        })),
        total: getTotalPrice(),
        deliveryInfo,
        paymentMethod: 'stripe'
      };

      await createOrder(orderData);
      
      // Limpiar el carrito después de crear la orden
      clearCart();
      
      toast.success('¡Pedido creado exitosamente!');
      onClose();
      
    } catch (error) {
      console.error('Error al crear pedido:', error);
      toast.error('Error al crear el pedido. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="delivery-modal show" onClick={onClose}>
      <div className="delivery-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <h2><i className="fas fa-truck-fast"></i> Opciones de Entrega</h2>
        
        <form className="delivery-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo de Entrega</label>
            <div className="delivery-options">
              <label>
                <input 
                  type="radio" 
                  name="deliveryType" 
                  value="pickup" 
                  checked={deliveryType === 'pickup'}
                  onChange={(e) => setDeliveryType(e.target.value)}
                />
                <span className="radio-custom"></span> Recoger en Tienda
              </label>
              <label>
                <input 
                  type="radio" 
                  name="deliveryType" 
                  value="delivery"
                  checked={deliveryType === 'delivery'}
                  onChange={(e) => setDeliveryType(e.target.value)}
                />
                <span className="radio-custom"></span> Envío a Domicilio
              </label>
            </div>
          </div>
          
          {deliveryType === 'pickup' && (
            <div className="delivery-fields">
              <div className="form-group">
                <label htmlFor="pickupStore">Tienda para Recoger</label>
                <select 
                  id="pickupStore"
                  name="pickupStore"
                  value={formData.pickupStore}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecciona una tienda</option>
                  <option value="Tienda Centro">Tienda Las Cruces No 40, Col. Centro</option>
                </select>
              </div>
            </div>
          )}
          
          {deliveryType === 'delivery' && (
            <div className="delivery-fields">
              <div className="form-group">
                <label htmlFor="deliveryStreet">Calle</label>
                <input 
                  type="text" 
                  id="deliveryStreet"
                  name="deliveryStreet"
                  placeholder="Calle y número"
                  value={formData.deliveryStreet}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="deliveryCity">Ciudad</label>
                <input 
                  type="text" 
                  id="deliveryCity"
                  name="deliveryCity"
                  placeholder="Ciudad"
                  value={formData.deliveryCity}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="deliveryState">Estado</label>
                <input 
                  type="text" 
                  id="deliveryState"
                  name="deliveryState"
                  placeholder="Estado"
                  value={formData.deliveryState}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="deliveryZip">Código Postal</label>
                <input 
                  type="text" 
                  id="deliveryZip"
                  name="deliveryZip"
                  placeholder="Código postal"
                  value={formData.deliveryZip}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="deliveryInstructions">Instrucciones de Entrega</label>
                <textarea 
                  id="deliveryInstructions"
                  name="deliveryInstructions"
                  placeholder="Instrucciones adicionales (opcional)"
                  value={formData.deliveryInstructions}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}
          
          <button type="submit" className="delivery-submit" disabled={loading}>
            {loading ? 'Procesando...' : 'Confirmar Entrega'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeliveryModal;