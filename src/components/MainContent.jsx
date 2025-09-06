import React, { useState, useEffect } from 'react';
import { useProducts } from '../contexts/ProductsContext';
import FiltersSidebar from './FiltersSidebar';
import ProductsGrid from './ProductsGrid';
import ProductModal from './ProductModal';

const MainContent = () => {
  const { filteredProducts, loading, filters, updateFilters, clearFilters } = useProducts();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);



  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  return (
    <section className="main-content">
      <div className={`filters-overlay ${showFilters ? 'show' : ''}`}
           onClick={() => setShowFilters(false)}></div>
      
      <div className="main-content-container">
        <FiltersSidebar 
          filters={filters}
          onFilterChange={updateFilters}
          onClearFilters={clearFilters}
          showFilters={showFilters}
          onCloseFilters={() => setShowFilters(false)}
        />
        
        <main className="products-main">
          <button 
            className="filters-toggle" 
            onClick={toggleFilters}
            style={{ display: window.innerWidth <= 768 ? 'block' : 'none' }}
          >
            <i className="fas fa-filter"></i>
          </button>
          
          <div className="products-header">
            <div className="breadcrumb">
              <span>MARCAS</span>
              <i className="fas fa-chevron-right"></i>
              <span id="currentBrand">SOFT DUCK</span>
            </div>
            <h1 className="brand-title">SOFT DUCK</h1>
            <div className="products-count">
              <span>{filteredProducts.length} Artículos</span>
            </div>
          </div>
          
          <ProductsGrid 
            products={filteredProducts}
            loading={loading}
            onOpenModal={openProductModal}
          />
        </main>
      </div>
      
      <ProductModal 
        product={selectedProduct}
        isOpen={showProductModal}
        onClose={closeProductModal}
      />
    </section>
  );
};

export default MainContent;