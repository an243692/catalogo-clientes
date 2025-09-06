import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Contexts
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { ProductsProvider } from './contexts/ProductsContext'
import { OrdersProvider } from './contexts/OrdersContext'

// Components
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'

function App() {
  return (
    <Router>
      <AuthProvider>
        <ProductsProvider>
          <CartProvider>
            <OrdersProvider>
              <div className="app">
                <Header />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="*" element={<Home />} />
                </Routes>
                <Footer />
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </div>
            </OrdersProvider>
          </CartProvider>
        </ProductsProvider>
      </AuthProvider>
    </Router>
  )
}

export default App