import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  ref, 
  push, 
  get, 
  query, 
  orderByChild, 
  equalTo, 
  update,
  onValue,
  off
} from 'firebase/database';
import { realtimeDb } from '../config/firebase';
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
      console.log('🔄 Cargando pedidos para:', currentUser.email);
      
      // Usar solo el backend (más confiable)
      const response = await fetch(`https://catalogo-clientes-0ido.onrender.com/api/orders/${encodeURIComponent(currentUser.email)}`);
      
      if (response.ok) {
        const backendOrders = await response.json();
        console.log('✅ Pedidos cargados desde backend:', backendOrders.length);
        console.log('📋 Pedidos:', backendOrders);
        setOrders(backendOrders);
      } else {
        console.error('❌ Error del backend:', response.status, response.statusText);
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      setOrders([]);
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const ordersRef = ref(realtimeDb, 'orders');
      const newOrderRef = push(ordersRef);
      await update(newOrderRef, order);
      
      // Agregar la orden a la lista local
      setOrders(prev => [{
        id: newOrderRef.key,
        ...order
      }, ...prev]);

      return newOrderRef.key;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const orderRef = ref(realtimeDb, `orders/${orderId}`);
      await update(orderRef, {
        status,
        updatedAt: new Date().toISOString()
      });

      // Actualizar la orden en la lista local
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status, updatedAt: new Date().toISOString() }
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
