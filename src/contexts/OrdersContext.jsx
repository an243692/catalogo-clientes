import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const OrdersContext = createContext();

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};

export const OrdersProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      loadOrders();
    } else {
      setOrders([]);
    }
  }, [currentUser]);

  const loadOrders = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef, 
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData) => {
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const order = {
        ...orderData,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'orders'), order);
      
      // Agregar la orden a la lista local
      setOrders(prev => [{
        id: docRef.id,
        ...order
      }, ...prev]);

      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status,
        updatedAt: new Date()
      });

      // Actualizar la orden en la lista local
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status, updatedAt: new Date() }
          : order
      ));
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  const cancelOrder = async (orderId) => {
    return updateOrderStatus(orderId, 'cancelled');
  };

  const getOrderById = (orderId) => {
    return orders.find(order => order.id === orderId);
  };

  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status);
  };

  const value = {
    orders,
    loading,
    createOrder,
    updateOrderStatus,
    cancelOrder,
    getOrderById,
    getOrdersByStatus,
    loadOrders
  };

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
};
