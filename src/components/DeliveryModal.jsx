import React, { useState } from 'react';

const DeliveryModal = ({ deliveryInfo, setDeliveryInfo, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        type: 'pickup',
        store: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        instructions: ''
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (formData.type === 'pickup' && !formData.store) {
            alert('Por favor selecciona una tienda');
            return;
        }
        
        if (formData.type === 'delivery') {
            const { street, city, state, zip } = formData;
            if (!street || !city || !state || !zip) {
                alert('Por favor completa todos los campos de la dirección');
                return;
            }
        }
        
        onSubmit(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content delivery-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Información de Entrega</h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form className="delivery-form" onSubmit={handleSubmit}>
                    <div className="delivery-type">
                        <h3>Tipo de Entrega</h3>
                        <div className="radio-group">
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="deliveryType"
                                    value="pickup"
                                    checked={formData.type === 'pickup'}
                                    onChange={(e) => handleInputChange('type', e.target.value)}
                                />
                                <span className="radio-label">
                                    <i className="fas fa-store"></i>
                                    Recoger en Tienda
                                </span>
                            </label>
                            
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="deliveryType"
                                    value="delivery"
                                    checked={formData.type === 'delivery'}
                                    onChange={(e) => handleInputChange('type', e.target.value)}
                                />
                                <span className="radio-label">
                                    <i className="fas fa-truck"></i>
                                    Envío a Domicilio
                                </span>
                            </label>
                        </div>
                    </div>

                    {formData.type === 'pickup' && (
                        <div className="pickup-fields">
                            <div className="form-group">
                                <label htmlFor="pickupStore">Tienda</label>
                                <select
                                    id="pickupStore"
                                    value={formData.store}
                                    onChange={(e) => handleInputChange('store', e.target.value)}
                                    required
                                >
                                    <option value="">Selecciona una tienda</option>
                                    <option value="Tienda Centro">Tienda Centro</option>
                                    <option value="Tienda Norte">Tienda Norte</option>
                                    <option value="Tienda Sur">Tienda Sur</option>
                                    <option value="Tienda Este">Tienda Este</option>
                                    <option value="Tienda Oeste">Tienda Oeste</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {formData.type === 'delivery' && (
                        <div className="delivery-fields">
                            <div className="form-group">
                                <label htmlFor="deliveryStreet">Calle y Número</label>
                                <input
                                    type="text"
                                    id="deliveryStreet"
                                    value={formData.street}
                                    onChange={(e) => handleInputChange('street', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="deliveryCity">Ciudad</label>
                                    <input
                                        type="text"
                                        id="deliveryCity"
                                        value={formData.city}
                                        onChange={(e) => handleInputChange('city', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="deliveryState">Estado</label>
                                    <input
                                        type="text"
                                        id="deliveryState"
                                        value={formData.state}
                                        onChange={(e) => handleInputChange('state', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="deliveryZip">Código Postal</label>
                                <input
                                    type="text"
                                    id="deliveryZip"
                                    value={formData.zip}
                                    onChange={(e) => handleInputChange('zip', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="deliveryInstructions">Instrucciones de Entrega (Opcional)</label>
                                <textarea
                                    id="deliveryInstructions"
                                    value={formData.instructions}
                                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                                    rows="3"
                                    placeholder="Ej: Llamar antes de llegar, dejar en portería, etc."
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="submit-btn">
                            <i className="fas fa-check"></i>
                            Continuar con el Pedido
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DeliveryModal;