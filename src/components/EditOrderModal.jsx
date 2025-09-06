import React, { useState, useEffect } from 'react'
import { useProducts } from '../contexts/ProductsContext'
import { useOrders } from '../contexts/OrdersContext'
import toast from 'react-hot-toast'

const EditOrderModal = ({ order, isOpen, onClose }) => {
  const { products } = useProducts()
  const { updateOrderStatus } = useOrders()
  const [activeTab, setActiveTab] = useState('currentItems')
  const [editingOrderItems, setEditingOrderItems] = useState([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [filteredCatalogProducts, setFilteredCatalogProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && order) {
      setEditingOrderItems(order.items || [])
    } else {
      setEditingOrderItems([])
      setCatalogSearch('')
    }
  }, [isOpen, order])

  useEffect(() => {
    // Filter catalog products based on search
    if (catalogSearch) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        product.description?.toLowerCase().includes(catalogSearch.toLowerCase())
      )
      setFilteredCatalogProducts(filtered)
    } else {
      setFilteredCatalogProducts(products.slice(0, 20)) // Show first 20 products
    }
  }, [catalogSearch, products])


  const handleRemoveItem = (itemId) => {
    setEditingOrderItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handleUpdateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId)
      return
    }
    
    setEditingOrderItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    )
  }

  const handleAddFromCatalog = (product) => {
    const existingItem = editingOrderItems.find(item => item.id === product.id)
    
    if (existingItem) {
      handleUpdateQuantity(product.id, existingItem.quantity + 1)
    } else {
      setEditingOrderItems(prev => [...prev, { ...product, quantity: 1 }])
    }
  }

  const calculateNewTotal = () => {
    return editingOrderItems.reduce((total, item) => {
      const price = item.wholesalePrice && item.quantity >= 4 
        ? item.wholesalePrice 
        : item.price
      return total + (price * item.quantity)
    }, 0)
  }

  const handleSaveChanges = async () => {
    if (!order) return

    setLoading(true)
    try {
      // Aquí se actualizaría la orden en Firebase
      // Por ahora, solo mostramos un mensaje de éxito
      toast.success('Pedido actualizado exitosamente')
      onClose()
    } catch (error) {
      console.error('Error al actualizar pedido:', error)
      toast.error('Error al actualizar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="edit-order-modal show" onClick={onClose}>
      <div className="edit-order-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-order-header">
          <h2><i className="fas fa-pen-to-square"></i> Editar Pedido</h2>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="edit-order-tabs">
          <button 
            className={`edit-tab ${activeTab === 'currentItems' ? 'active' : ''}`}
            onClick={() => setActiveTab('currentItems')}
          >
            Productos Actuales
          </button>
          <button 
            className={`edit-tab ${activeTab === 'addProducts' ? 'active' : ''}`}
            onClick={() => setActiveTab('addProducts')}
          >
            Agregar del Catálogo
          </button>
        </div>
        
        {activeTab === 'currentItems' && (
          <div className="edit-tab-content active">
            <div className="current-order-items">
              {editingOrderItems.length === 0 ? (
                <div className="empty-state">
                  <p>No hay productos en este pedido</p>
                </div>
              ) : (
                editingOrderItems.map(item => (
                  <EditOrderItem 
                    key={item.id} 
                    item={item} 
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                  />
                ))
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'addProducts' && (
          <div className="edit-tab-content active">
            <div className="catalog-search">
              <input 
                type="text" 
                placeholder="Buscar productos..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>
            <div className="catalog-products">
              {filteredCatalogProducts.map(product => (
                <CatalogProduct 
                  key={product.id} 
                  product={product} 
                  onAdd={handleAddFromCatalog}
                />
              ))}
            </div>
          </div>
        )}
        
        <div className="edit-order-summary">
          <div className="edit-total">
            <strong>Nuevo Total: ${calculateNewTotal().toLocaleString()}</strong>
          </div>
          <div className="edit-actions">
            <button className="cancel-edit" onClick={handleCancelEdit}>
              Cancelar
            </button>
            <button className="save-edit" onClick={handleSaveChanges} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const EditOrderItem = ({ item, onUpdateQuantity, onRemove }) => {
  const getCurrentPrice = () => {
    return item.wholesalePrice && item.quantity >= 4 
      ? item.wholesalePrice 
      : item.price
  }

  return (
    <div className="catalog-product">
      <div className="catalog-product-info">
        <div className="catalog-product-name">{item.name}</div>
        <div className="catalog-product-price">
          ${getCurrentPrice().toLocaleString()} c/u
        </div>
      </div>
      <div className="catalog-product-controls">
        <button 
          className="quantity-btn"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          -
        </button>
        <span className="quantity-display">{item.quantity}</span>
        <button 
          className="quantity-btn"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          +
        </button>
        <button 
          className="remove-btn"
          onClick={() => onRemove(item.id)}
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>
    </div>
  )
}

const CatalogProduct = ({ product, onAdd }) => {
  const getCurrentPrice = () => {
    return product.wholesalePrice && product.quantity >= 4 
      ? product.wholesalePrice 
      : product.price
  }

  return (
    <div className="catalog-product">
      <div className="catalog-product-info">
        <div className="catalog-product-name">{product.name}</div>
        <div className="catalog-product-price">
          ${getCurrentPrice().toLocaleString()}
        </div>
      </div>
      <button 
        className="add-to-edit-btn"
        onClick={() => onAdd(product)}
      >
        <i className="fas fa-plus"></i>
        Agregar
      </button>
    </div>
  )
}

export default EditOrderModal
