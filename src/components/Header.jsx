import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useProducts } from '../contexts/ProductsContext'
import AuthModal from './AuthModal'
import CartModal from './CartModal'
import HistoryModal from './HistoryModal'

const Header = () => {
  const { currentUser, userProfile, logout } = useAuth()
  const { getCartItemsCount, isCartOpen, setIsCartOpen } = useCart()
  const { updateFilters } = useProducts()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    updateFilters({ search: searchTerm })
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="nav-brand">
          <img src="/softduck.png" alt="SOFT DUCK" className="logo-image" />
          <div className="brand-text">
            <span className="brand-name">SOFT DUCK</span>
            <span className="brand-tagline">Catálogo Premium</span>
          </div>
        </div>
        
        {/* Centered Search Bar */}
        <div className="search-section">
          <form className="search-container" onSubmit={handleSearch}>
            <i className="fas fa-search search-icon"></i>
            <input 
              type="text" 
              placeholder="¿Qué estás buscando?" 
              className="search-input-main"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
        </div>
        
        {/* Contact Info */}
        <div className="header-contact">
          <div className="contact-info">
            <i className="fas fa-phone"></i>
            <span>5627274791</span>
          </div>
        </div>
        
        {/* Auth Section */}
        <div className="nav-links">
          {!currentUser ? (
            <div id="authSection">
              <button 
                className="auth-btn"
                onClick={() => setShowAuthModal(true)}
              >
                <i className="fas fa-user-circle"></i>
                <span className="btn-text">Iniciar Sesión</span>
              </button>
            </div>
          ) : (
            <div id="userSection">
              <div className="user-info">
                <i className="fas fa-user-check"></i>
                <span>{userProfile?.name || userProfile?.email || currentUser?.email || 'Usuario'}</span>
              </div>
              <button 
                className="nav-btn"
                onClick={() => {
                  console.log('🔍 Botón de historial clickeado');
                  setShowHistoryModal(true);
                }}
              >
                <i className="fas fa-clock-rotate-left"></i>
                <span className="btn-text">Historial</span>
              </button>
              <button className="nav-btn logout" onClick={handleLogout}>
                <i className="fas fa-right-from-bracket"></i>
                <span className="btn-text">Salir</span>
              </button>
            </div>
          )}
          
          <button 
            className="cart-btn"
            onClick={() => setIsCartOpen(true)}
          >
            <i className="fas fa-shopping-cart"></i>
            <span className="cart-count">{getCartItemsCount()}</span>
          </button>
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      
      <CartModal 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
      
      <HistoryModal 
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
    </header>
  )
}

export default Header
