import React, { createContext, useContext, useState, useEffect } from 'react'
import { 
  getFirestore, 
  collection, 
  getDocs, 
  orderBy, 
  query 
} from 'firebase/firestore'
import { db } from '../config/firebase'

const ProductsContext = createContext()

export const useProducts = () => {
  const context = useContext(ProductsContext)
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider')
  }
  return context
}

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [categories, setCategories] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    sort: '',
    priceRange: { min: 0, max: 10000 },
    categories: [],
    productTypes: [],
    colors: []
  })

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [products, filters])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const productsRef = collection(db, 'products')
      const q = query(productsRef, orderBy('name'))
      const snapshot = await getDocs(q)
      
      const productsData = []
      const categoriesMap = new Map()
      
      snapshot.forEach(doc => {
        const product = { id: doc.id, ...doc.data() }
        productsData.push(product)
        
        // Build categories map
        if (product.category) {
          const category = product.category.toLowerCase()
          if (categoriesMap.has(category)) {
            categoriesMap.set(category, categoriesMap.get(category) + 1)
          } else {
            categoriesMap.set(category, 1)
          }
        }
      })
      
      setProducts(productsData)
      setCategories(categoriesMap)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...products]
    console.log('Aplicando filtros:', filters)
    console.log('Productos antes de filtrar:', products.length)

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm)
      )
    }

    // Price range filter
    filtered = filtered.filter(product => {
      const price = product.wholesalePrice && product.quantity >= 4 
        ? product.wholesalePrice 
        : product.price
      return price >= filters.priceRange.min && price <= filters.priceRange.max
    })

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(product =>
        filters.categories.includes(product.category?.toLowerCase())
      )
    }

    // Product type filter
    if (filters.productTypes.length > 0) {
      filtered = filtered.filter(product => {
        if (filters.productTypes.includes('individual') && product.price) return true
        if (filters.productTypes.includes('wholesale') && product.wholesalePrice) return true
        return false
      })
    }

    // Color filter
    if (filters.colors.length > 0) {
      filtered = filtered.filter(product =>
        product.colors && product.colors.some(color =>
          filters.colors.includes(color.toLowerCase())
        )
      )
    }

    // Sort
    if (filters.sort) {
      switch (filters.sort) {
        case 'name-asc':
          filtered.sort((a, b) => a.name.localeCompare(b.name))
          break
        case 'name-desc':
          filtered.sort((a, b) => b.name.localeCompare(a.name))
          break
        case 'price-asc':
          filtered.sort((a, b) => {
            const priceA = a.wholesalePrice && a.quantity >= 4 ? a.wholesalePrice : a.price
            const priceB = b.wholesalePrice && b.quantity >= 4 ? b.wholesalePrice : b.price
            return priceA - priceB
          })
          break
        case 'price-desc':
          filtered.sort((a, b) => {
            const priceA = a.wholesalePrice && a.quantity >= 4 ? a.wholesalePrice : a.price
            const priceB = b.wholesalePrice && b.quantity >= 4 ? b.wholesalePrice : b.price
            return priceB - priceA
          })
          break
        default:
          break
      }
    }

    console.log('Productos después de filtrar:', filtered.length)
    setFilteredProducts(filtered)
  }

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      sort: '',
      priceRange: { min: 0, max: 10000 },
      categories: [],
      productTypes: [],
      colors: []
    })
  }

  const getCategoryIcon = (categoryName) => {
    const categoryIcons = {
      'tecnología': '🤖',
      'tecnologia': '🤖',
      'technology': '🤖',
      'tech': '🤖',
      'electrónicos': '📱',
      'electrónica': '📱',
      'electronicos': '📱',
      'electronics': '📱',
      'papelería': '✏️',
      'papeleria': '✏️',
      'stationery': '✏️',
      'oficina': '📋',
      'office': '📋',
      'hogar': '🏠',
      'home': '🏠',
      'casa': '🏠',
      'cocina': '🍳',
      'kitchen': '🍳',
      'baño': '🚿',
      'bathroom': '🚿',
      'ropa': '👕',
      'clothing': '👕',
      'vestimenta': '👕',
      'zapatos': '👟',
      'shoes': '👟',
      'calzado': '👟',
      'deportes': '⚽',
      'sports': '⚽',
      'fitness': '💪',
      'salud': '💊',
      'health': '💊',
      'belleza': '💄',
      'beauty': '💄',
      'cosmética': '💄',
      'cosmetica': '💄',
      'juguetes': '🧸',
      'toys': '🧸',
      'niños': '👶',
      'kids': '👶',
      'bebé': '🍼',
      'baby': '🍼',
      'mascotas': '🐕',
      'pets': '🐕',
      'animales': '🐕',
      'jardín': '🌱',
      'garden': '🌱',
      'plantas': '🌿',
      'plants': '🌿',
      'herramientas': '🔧',
      'tools': '🔧',
      'construcción': '🔨',
      'construccion': '🔨',
      'construction': '🔨',
      'automóvil': '🚗',
      'automovil': '🚗',
      'auto': '🚗',
      'car': '🚗',
      'linea blanca': '🧺🧼👕',
      'comida': '🍽️',
      'libros': '📚',
      'books': '📚',
      'música': '🎵',
      'musica': '🎵',
      'music': '🎵',
      'películas': '🎬',
      'peliculas': '🎬',
      'movies': '🎬',
      'arte': '🎨',
      'art': '🎨',
      'manualidades': '✂️',
      'crafts': '✂️',
      'joyería': '💍',
      'joyeria': '💍',
      'jewelry': '💍',
      'relojes': '⌚',
      'watches': '⌚',
      'accesorios': '👜',
      'accessories': '👜',
      'bolsos': '👜',
      'bags': '👜',
      'viajes': '✈️',
      'travel': '✈️',
      'maletas': '🧳',
      'luggage': '🧳',
      'camping': '⛺',
      'outdoor': '🏕️',
      'pesca': '🎣',
      'fishing': '🎣',
      'caza': '🏹',
      'hunting': '🏹',
      'default': '📦',
      'vinoS': '🍷'
    }

    const normalizedCategory = categoryName?.toLowerCase().trim()
    
    if (categoryIcons[normalizedCategory]) {
      return categoryIcons[normalizedCategory]
    }
    
    for (const [key, icon] of Object.entries(categoryIcons)) {
      if (normalizedCategory?.includes(key) || key.includes(normalizedCategory)) {
        return icon
      }
    }
    
    return categoryIcons.default
  }

  const value = {
    products,
    filteredProducts,
    categories,
    loading,
    filters,
    updateFilters,
    clearFilters,
    getCategoryIcon
  }

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  )
}
