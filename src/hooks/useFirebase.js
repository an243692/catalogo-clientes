import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  orderBy, 
  query,
  doc,
  updateDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  push,
  query as dbQuery,
  orderByChild,
  equalTo,
  update,
  remove
} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCLiPkISiuave91bqLg7WGKdqYrz376pCA",
  authDomain: "catalogo-b6e67.firebaseapp.com",
  projectId: "catalogo-b6e67",
  storageBucket: "catalogo-b6e67.firebasestorage.app",
  messagingSenderId: "832808330065",
  appId: "1:832808330065:web:80469d16bfb9a360e46970",
  measurementId: "G-3MZ71V4PPY",
  databaseURL: "https://catalogo-b6e67-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const realtimeDb = getDatabase(app);

export const useFirebase = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar productos desde Firestore
  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsRef = collection(db, 'products');
      const q = query(productsRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProducts(productsData);
    } catch (err) {
      setError('Error al cargar productos');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Crear pedido en Realtime Database
  const createOrder = async (orderData) => {
    try {
      const ordersRef = ref(realtimeDb, 'orders');
      const newOrderRef = push(ordersRef);
      await set(newOrderRef, {
        ...orderData,
        timestamp: Date.now(),
        status: 'pending'
      });
      return newOrderRef.key;
    } catch (err) {
      console.error('Error creating order:', err);
      throw err;
    }
  };

  // Obtener pedidos del usuario
  const getUserOrders = async (userEmail) => {
    try {
      const ordersRef = ref(realtimeDb, 'orders');
      const q = dbQuery(ordersRef, orderByChild('userInfo/email'), equalTo(userEmail));
      const snapshot = await get(q);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return {};
    } catch (err) {
      console.error('Error getting user orders:', err);
      return {};
    }
  };

  // Actualizar estado del pedido
  const updateOrderStatus = async (orderId, status) => {
    try {
      const orderRef = ref(realtimeDb, `orders/${orderId}`);
      await update(orderRef, { status });
    } catch (err) {
      console.error('Error updating order status:', err);
      throw err;
    }
  };

  // Eliminar pedido
  const deleteOrder = async (orderId) => {
    try {
      const orderRef = ref(realtimeDb, `orders/${orderId}`);
      await remove(orderRef);
    } catch (err) {
      console.error('Error deleting order:', err);
      throw err;
    }
  };

  // Limpiar pedidos pendientes
  const cleanupPendingOrders = async (userEmail) => {
    try {
      const ordersRef = ref(realtimeDb, 'orders');
      const snapshot = await get(ordersRef);
      
      if (snapshot.exists()) {
        const allOrders = snapshot.val();
        const currentTime = Date.now();
        
        for (const [orderId, order] of Object.entries(allOrders)) {
          const shouldCleanup = (
            order.status === 'pending' && 
            order.paymentMethod === 'card' &&
            order.userInfo?.email === userEmail &&
            (currentTime - order.timestamp > 2 * 60 * 1000) // Más de 2 minutos
          );
          
          if (shouldCleanup) {
            await remove(ref(realtimeDb, `orders/${orderId}`));
            console.log(`🧹 Pedido pendiente eliminado: ${orderId}`);
          }
        }
      }
    } catch (err) {
      console.error('Error cleaning up pending orders:', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return {
    products,
    loading,
    error,
    loadProducts,
    createOrder,
    getUserOrders,
    updateOrderStatus,
    deleteOrder,
    cleanupPendingOrders,
    db,
    auth,
    realtimeDb
  };
};

export default useFirebase;
