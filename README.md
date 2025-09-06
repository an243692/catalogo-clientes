# SOFT DUCK - Catálogo Premium (React)

Este proyecto es la conversión completa de la página HTML original a React, manteniendo todas las funcionalidades del catálogo de productos SOFT DUCK.

## 🚀 Características Implementadas

### ✅ Completado
- **Conversión completa a React** con componentes modulares
- **Sistema de autenticación** con Firebase Auth
- **Gestión de productos** con Firebase Firestore
- **Carrito de compras** con persistencia local
- **Sistema de filtros** avanzado (categoría, precio, color, tipo)
- **Modal de productos** con galería de imágenes
- **Historial de pedidos** con Firebase
- **Modal de entrega** (pickup y delivery)
- **Edición de pedidos** existentes
- **Integración con WhatsApp** para pedidos
- **Estilos CSS** completamente integrados
- **Responsive design** para móviles y desktop

### 🔧 Funcionalidades Técnicas
- **Context API** para gestión de estado global
- **React Router** para navegación
- **Firebase** para backend (Auth, Firestore, Realtime DB)
- **Stripe** preparado para pagos (requiere configuración)
- **Toast notifications** para feedback del usuario
- **Loading states** en todas las operaciones

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── Header.jsx      # Header con navegación y búsqueda
│   ├── Footer.jsx      # Footer con información de contacto
│   ├── Hero.jsx        # Sección hero principal
│   ├── Features.jsx    # Características del sitio
│   ├── MainContent.jsx # Contenido principal con filtros
│   ├── ProductsGrid.jsx # Grid de productos
│   ├── ProductModal.jsx # Modal de detalles del producto
│   ├── FiltersSidebar.jsx # Sidebar de filtros
│   ├── CartModal.jsx   # Modal del carrito
│   ├── AuthModal.jsx   # Modal de autenticación
│   ├── HistoryModal.jsx # Modal de historial
│   ├── DeliveryModal.jsx # Modal de entrega
│   ├── EditOrderModal.jsx # Modal de edición de pedidos
│   ├── StripeCheckout.jsx # Componente de checkout
│   └── WhatsAppFloat.jsx # Botón flotante de WhatsApp
├── contexts/           # Contextos de React
│   ├── AuthContext.jsx # Contexto de autenticación
│   ├── CartContext.jsx # Contexto del carrito
│   ├── ProductsContext.jsx # Contexto de productos
│   └── OrdersContext.jsx # Contexto de órdenes
├── pages/             # Páginas principales
│   └── Home.jsx       # Página principal
├── config/            # Configuración
│   └── firebase.js    # Configuración de Firebase
└── styles/            # Estilos
    └── index.css      # Estilos principales
```

## 🛠️ Configuración Requerida

### 1. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 2. Firebase Setup
El proyecto ya está configurado con Firebase. Asegúrate de que:

- **Firestore** esté habilitado
- **Authentication** esté configurado (Email/Password)
- **Realtime Database** esté habilitado (opcional)

### 3. Estructura de Firestore

#### Colección `products`
```javascript
{
  id: "product_id",
  name: "Nombre del producto",
  description: "Descripción del producto",
  price: 100,
  wholesalePrice: 80,
  category: "categoria",
  images: ["url1", "url2"],
  stock: 50,
  colors: ["negro", "blanco"],
  brand: "SOFT DUCK"
}
```

#### Colección `orders`
```javascript
{
  id: "order_id",
  userId: "user_uid",
  userEmail: "user@email.com",
  items: [
    {
      id: "product_id",
      name: "Producto",
      price: 100,
      quantity: 2
    }
  ],
  total: 200,
  status: "pending", // pending, completed, cancelled
  deliveryInfo: {
    type: "pickup", // pickup, delivery
    pickupStore: "Tienda Centro",
    // o campos de delivery
  },
  paymentMethod: "stripe",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🚀 Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build

# Preview de producción
npm run preview
```

## 🔧 Funcionalidades Pendientes (Opcionales)

### 1. Integración Completa de Stripe
- Configurar webhook de Stripe
- Implementar backend para crear sesiones de checkout
- Manejar confirmación de pagos

### 2. Mejoras Adicionales
- Sistema de favoritos
- Búsqueda avanzada
- Filtros por marca
- Sistema de reviews
- Notificaciones push
- PWA (Progressive Web App)

### 3. Optimizaciones
- Lazy loading de imágenes
- Virtualización de listas largas
- Cache de productos
- Compresión de imágenes

## 📱 Responsive Design

El proyecto está completamente optimizado para:
- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

## 🎨 Estilos

Los estilos están completamente integrados desde el archivo `user.css` original, manteniendo:
- Paleta de colores azules
- Gradientes modernos
- Animaciones suaves
- Efectos hover
- Transiciones fluidas

## 🔐 Seguridad

- Autenticación con Firebase Auth
- Validación de formularios
- Sanitización de datos
- Protección de rutas
- Manejo seguro de tokens

## 📞 Contacto

Para soporte técnico o consultas sobre el proyecto:
- **Teléfono**: +52 56 2727 4791
- **Email**: vhjocar@gmail.com
- **WhatsApp**: [Contactar](https://wa.me/525627274791)

---

**¡El proyecto está listo para producción!** 🎉

Solo necesitas configurar las variables de entorno y desplegar en tu plataforma preferida (Vercel, Netlify, etc.).
