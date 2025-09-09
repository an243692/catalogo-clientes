import React from 'react';

const HistoryModal = ({ orderHistory, onClose }) => {
    const formatDate = (timestamp) => {
        if (!timestamp) return 'Fecha no disponible';
        return new Date(timestamp).toLocaleString('es-ES');
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'completed':
                return 'Completado';
            case 'pending':
                return 'Pendiente';
            case 'cancelRequested':
                return 'Cancelación Solicitada';
            case 'cancelled':
                return 'Cancelado';
            default:
                return 'En Curso';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'completed':
                return 'completed';
            case 'pending':
                return 'pending';
            case 'cancelRequested':
                return 'cancel-requested';
            case 'cancelled':
                return 'cancelled';
            default:
                return 'pending';
        }
    };

    const getPaymentMethodText = (paymentMethod) => {
        switch (paymentMethod) {
            case 'card':
            case 'stripe':
                return 'Tarjeta';
            case 'whatsapp':
                return 'WhatsApp';
            case 'cash':
                return 'Efectivo';
            default:
                return 'No especificado';
        }
    };

    const getPaymentMethodClass = (paymentMethod) => {
        switch (paymentMethod) {
            case 'card':
            case 'stripe':
                return 'card';
            case 'whatsapp':
                return 'whatsapp';
            case 'cash':
                return 'cash';
            default:
                return 'unknown';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Historial de Pedidos</h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="history-content">
                    {orderHistory.length === 0 ? (
                        <div className="empty-history">
                            <i className="fas fa-shopping-bag"></i>
                            <h3>Sin Pedidos</h3>
                            <p>Aún no has realizado ningún pedido. ¡Es hora de empezar!</p>
                        </div>
                    ) : (
                        <div className="history-items">
                            {orderHistory.map(order => (
                                <div key={order.id} className="history-item">
                                    <div className="history-item-header">
                                        <div className="order-id">
                                            Pedido #{order.id || order.orderId || 'N/A'}
                                        </div>
                                        <div className="order-date">
                                            {formatDate(order.timestamp || order.createdAt)}
                                        </div>
                                        <div className={`order-status ${getStatusClass(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </div>
                                    </div>

                                    <div className="history-item-content">
                                        <div className="order-info">
                                            <div className="info-row">
                                                <span className="label">Cliente:</span>
                                                <span className="value">
                                                    {order.userInfo?.fullName || order.userInfo?.name || 'No especificado'}
                                                </span>
                                            </div>

                                            <div className="info-row">
                                                <span className="label">Email:</span>
                                                <span className="value">
                                                    {order.userInfo?.email || order.userEmail || order.email || 'No especificado'}
                                                </span>
                                            </div>

                                            <div className="info-row">
                                                <span className="label">Método de Pago:</span>
                                                <span className={`payment-method ${getPaymentMethodClass(order.paymentMethod)}`}>
                                                    {getPaymentMethodText(order.paymentMethod)}
                                                </span>
                                            </div>

                                            {order.deliveryInfo && (
                                                <div className="info-row">
                                                    <span className="label">Entrega:</span>
                                                    <span className="value">
                                                        {order.deliveryInfo.type === 'pickup' 
                                                            ? `Recoger en: ${order.deliveryInfo.store}`
                                                            : `Envío a: ${order.deliveryInfo.street}, ${order.deliveryInfo.city}`
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {order.items && order.items.length > 0 && (
                                            <div className="order-items">
                                                <h4>Productos:</h4>
                                                <ul className="items-list">
                                                    {order.items.map((item, index) => (
                                                        <li key={index} className="item">
                                                            <div className="item-name">{item.name}</div>
                                                            <div className="item-details">
                                                                <span>Cantidad: {item.quantity}</span>
                                                                <span>Precio: ${item.unitPrice?.toFixed(2) || '0.00'} c/u</span>
                                                                <span>Subtotal: ${item.totalPrice?.toFixed(2) || '0.00'}</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="order-total">
                                            <span className="total-label">Total:</span>
                                            <span className="total-amount">
                                                ${(order.total || order.totalAmount || 0).toFixed(2)}
                                            </span>
                                        </div>

                                        {order.paymentDetails && (
                                            <div className="payment-details">
                                                <h4>Detalles del Pago:</h4>
                                                <div className="payment-info">
                                                    <div className="info-row">
                                                        <span className="label">Estado del Pago:</span>
                                                        <span className={`payment-status ${order.paymentDetails.paymentStatus}`}>
                                                            {order.paymentDetails.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                                                        </span>
                                                    </div>
                                                    {order.paymentDetails.paymentId && (
                                                        <div className="info-row">
                                                            <span className="label">ID de Pago:</span>
                                                            <span className="value">{order.paymentDetails.paymentId}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;