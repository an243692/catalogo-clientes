import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import EditOrderModal from './EditOrderModal';

const HistoryModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { orders, loading, cancelOrder } = useOrders();
  const [editingOrder, setEditingOrder] = useState(null);

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


  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return { text: 'Completado', class: 'completed' };
      case 'pending':
        return { text: 'Pendiente', class: 'pending' };
      case 'cancelled':
        return { text: 'Cancelado', class: 'cancelled' };
      case 'cancel-requested':
        return { text: 'Cancelación solicitada', class: 'cancel-requested' };
      default:
        return { text: 'Desconocido', class: 'pending' };
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('¿Estás seguro de que quieres cancelar esta orden?')) {
      try {
        await cancelOrder(orderId);
      } catch (error) {
        console.error('Error al cancelar orden:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="history-modal show" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2><i className="fas fa-clock-rotate-left"></i> Historial de Pedidos</h2>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="history-items">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <h3>Cargando historial</h3>
              <p>Obteniendo tus pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-shopping-bag"></i>
              <h3>No tienes pedidos aún</h3>
              <p>Realiza tu primera compra para ver tu historial aquí</p>
            </div>
          ) : (
            orders.map(order => {
              const statusInfo = getStatusInfo(order.status);
              return (
                <div key={order.id} className="history-item">
                  <div className="history-item-header">
                    <div className="history-item-date">
                      Pedido #{order.id} - {new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleDateString()}
                    </div>
                    <div className={`history-item-status ${statusInfo.class}`}>
                      {statusInfo.text}
                    </div>
                  </div>
                  
                  <div className="history-item-content">
                    <div className="history-item-details">
                      <p><strong>Productos:</strong></p>
                      {order.items.map((item, index) => (
                        <p key={index}>
                          • {item.name} - Cantidad: {item.quantity} - ${item.price.toLocaleString()}
                        </p>
                      ))}
                      <p><strong>Tipo de entrega:</strong> {order.deliveryType === 'pickup' ? 'Recoger en tienda' : 'Envío a domicilio'}</p>
                      <p><strong>Dirección:</strong> {order.deliveryInfo}</p>
                    </div>
                    
                    <div className="history-item-total">
                      Total: ${order.total.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="history-item-actions">
                    {order.status === 'pending' && (
                      <>
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleEditOrder(order)}
                        >
                          <i className="fas fa-pen-to-square"></i>
                          Editar
                        </button>
                        <button 
                          className="action-btn cancel-btn"
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          <i className="fas fa-times"></i>
                          Cancelar
                        </button>
                      </>
                    )}
                    {order.status === 'completed' && (
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEditOrder(order)}
                      >
                        <i className="fas fa-redo"></i>
                        Reordenar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <EditOrderModal 
        order={editingOrder}
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
      />
    </div>
  );
};

export default HistoryModal;