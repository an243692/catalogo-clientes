import React from 'react';
import { useParams } from 'react-router-dom';
import { useProducts } from '../contexts/ProductsContext';
import ProductModal from '../components/ProductModal';

const ProductDetail = () => {
  const { id } = useParams();
  const { products } = useProducts();
  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <h1>Producto no encontrado</h1>
          <p>El producto que buscas no existe.</p>
          <a href="/" className="btn-primary">Volver al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="container">
        <div className="product-detail-content">
          <div className="product-images">
            <img src={product.image || '/placeholder-product.jpg'} alt={product.name} />
          </div>
          <div className="product-info">
            <h1>{product.name}</h1>
            <p className="product-brand">{product.brand || 'SOFT DUCK'}</p>
            <p className="product-description">{product.description}</p>
            <div className="product-price">
              <span className="price">${product.price.toLocaleString()}</span>
              {product.wholesalePrice && (
                <span className="wholesale-price">
                  Precio mayoreo (4+): ${product.wholesalePrice.toLocaleString()}
                </span>
              )}
            </div>
            <div className="product-actions">
              <button className="btn-primary">Agregar al carrito</button>
              <button className="btn-secondary">Comprar ahora</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
