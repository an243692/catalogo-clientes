import React, { useState } from 'react'
import { useProducts } from '../contexts/ProductsContext'

const FiltersSidebar = ({ filters, onFilterChange, onClearFilters, showFilters, onCloseFilters }) => {
  const { categories } = useProducts()
  const [expandedSections, setExpandedSections] = useState({
    sort: false,
    price: false,
    category: true,
    productType: false,
    color: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handlePriceChange = (type, value) => {
    onFilterChange({
      priceRange: {
        ...filters.priceRange,
        [type]: parseInt(value)
      }
    })
  }

  const handleCategoryChange = (category, checked) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter(c => c !== category)
    onFilterChange({ categories: newCategories })
  }

  const handleProductTypeChange = (type, checked) => {
    const newTypes = checked
      ? [...filters.productTypes, type]
      : filters.productTypes.filter(t => t !== type)
    onFilterChange({ productTypes: newTypes })
  }

  const handleColorChange = (color) => {
    const newColors = filters.colors.includes(color)
      ? filters.colors.filter(c => c !== color)
      : [...filters.colors, color]
    onFilterChange({ colors: newColors })
  }

  const colors = [
    { name: 'negro', value: '#000' },
    { name: 'blanco', value: '#fff' },
    { name: 'rojo', value: '#ff0000' },
    { name: 'azul', value: '#0000ff' },
    { name: 'verde', value: '#00ff00' },
    { name: 'amarillo', value: '#ffff00' }
  ]

  return (
    <>
      <aside className={`filters-sidebar ${showFilters ? 'open' : ''}`}>
        <div className="filters-header">
          <h3>Filtros</h3>
          <button className="clear-filters-btn" onClick={onClearFilters}>
            <i className="fas fa-times"></i> Limpiar Filtros
          </button>
        </div>
        
        {/* Sort By */}
        <div className="filter-section">
          <div 
            className="filter-section-header"
            onClick={() => toggleSection('sort')}
          >
            <h4>Ordenar Por</h4>
            <i className={`fas fa-chevron-${expandedSections.sort ? 'up' : 'down'} filter-toggle`}></i>
          </div>
          {expandedSections.sort && (
            <div className="filter-section-content">
              <select 
                className="filter-select"
                value={filters.sort}
                onChange={(e) => onFilterChange({ sort: e.target.value })}
              >
                <option value="">Recomendado</option>
                <option value="name-asc">Nombre A-Z</option>
                <option value="name-desc">Nombre Z-A</option>
                <option value="price-asc">Precio Menor a Mayor</option>
                <option value="price-desc">Precio Mayor a Menor</option>
              </select>
            </div>
          )}
        </div>

        {/* Price Range */}
        <div className="filter-section">
          <div 
            className="filter-section-header"
            onClick={() => toggleSection('price')}
          >
            <h4>Precio</h4>
            <i className={`fas fa-chevron-${expandedSections.price ? 'up' : 'down'} filter-toggle`}></i>
          </div>
          {expandedSections.price && (
            <div className="filter-section-content">
              <div className="price-range">
                <input 
                  type="range" 
                  min="0" 
                  max="10000" 
                  value={filters.priceRange.min}
                  className="price-slider"
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                />
                <input 
                  type="range" 
                  min="0" 
                  max="10000" 
                  value={filters.priceRange.max}
                  className="price-slider"
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                />
                <div className="price-display">
                  <span>${filters.priceRange.min.toLocaleString()}</span> - 
                  <span>${filters.priceRange.max.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category */}
        <div className="filter-section">
          <div 
            className="filter-section-header"
            onClick={() => toggleSection('category')}
          >
            <h4>Categoría</h4>
            <i className={`fas fa-chevron-${expandedSections.category ? 'up' : 'down'} filter-toggle`}></i>
          </div>
          {expandedSections.category && (
            <div className="filter-section-content">
              <div className="category-filters">
                {Array.from(categories.entries()).map(([category, count]) => (
                  <label key={category} className="category-filter-item">
                    <input 
                      type="checkbox" 
                      checked={filters.categories.includes(category)}
                      onChange={(e) => handleCategoryChange(category, e.target.checked)}
                    />
                    <span>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                      <span className="category-count">({count})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Type */}
        <div className="filter-section">
          <div 
            className="filter-section-header"
            onClick={() => toggleSection('productType')}
          >
            <h4>Tipo De Producto</h4>
            <i className={`fas fa-chevron-${expandedSections.productType ? 'up' : 'down'} filter-toggle`}></i>
          </div>
          {expandedSections.productType && (
            <div className="filter-section-content">
              <div className="checkbox-filters">
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={filters.productTypes.includes('individual')}
                    onChange={(e) => handleProductTypeChange('individual', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Individual
                </label>
                <label className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={filters.productTypes.includes('wholesale')}
                    onChange={(e) => handleProductTypeChange('wholesale', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Mayoreo
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Color */}
        <div className="filter-section">
          <div 
            className="filter-section-header"
            onClick={() => toggleSection('color')}
          >
            <h4>Color</h4>
            <i className={`fas fa-chevron-${expandedSections.color ? 'up' : 'down'} filter-toggle`}></i>
          </div>
          {expandedSections.color && (
            <div className="filter-section-content">
              <div className="color-filters">
                {colors.map(color => (
                  <div 
                    key={color.name}
                    className={`color-option ${filters.colors.includes(color.name) ? 'selected' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => handleColorChange(color.name)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default FiltersSidebar
