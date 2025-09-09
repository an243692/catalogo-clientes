import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    update,
    remove
} from 'firebase/database';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCLiPkISiuave91bqLg7WGKdqYrz376pCA",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "catalogo-b6e67.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "catalogo-b6e67",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "catalogo-b6e67.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "832808330065",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:832808330065:web:80469d16bfb9a360e46970",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-3MZ71V4PPY",
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://catalogo-b6e67-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const realtimeDb = getDatabase(app);

// Cargar Stripe
const stripe = window.Stripe ? window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_live_51Rq2HiLIzlkBZfRyuBjZyqBRGjalQWU5Cpwzaqt358SF0UGsMpSSpRhSXHtrLwi7Jc4VAjGEWGEwMG1hgjFeK8XY00899yMKQu') : null;

const EcommerceManager = () => {
    // Estados principales
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [categories, setCategories] = useState(new Map());
    const [cart, setCart] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    
    // Estados para modales
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCartModal, setShowCartModal] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    
    // Estados para autenticación
    const [authTab, setAuthTab] = useState('login');
    const [authForm, setAuthForm] = useState({
        login: { email: '', password: '' },
        register: { fullName: '', phone: '', email: '', password: '', location: '' }
    });
    
    // Estados para delivery
    const [deliveryInfo, setDeliveryInfo] = useState({
        type: 'pickup',
        store: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        instructions: ''
    });
    
    // Estados para historial
    const [orderHistory, setOrderHistory] = useState([]);
    
    // Estados para producto modal
    const [currentProduct, setCurrentProduct] = useState(null);
    const [modalQuantity, setModalQuantity] = useState(1);
    
    // Referencias para limpieza
    const cleanupTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);

    // Función para mostrar notificaciones
    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    }, []);

    // Función para limpiar información de pedido pendiente
    const clearPendingOrderInfo = useCallback(() => {
        localStorage.removeItem('pendingOrderSession');
        localStorage.removeItem('pendingOrderId');
        localStorage.removeItem('pendingOrderTimestamp');
        localStorage.removeItem('sessionInfo');
        localStorage.removeItem('redirectingToStripe');
        localStorage.removeItem('stripeRedirectTime');
        localStorage.removeItem('pageAwayTime');
        localStorage.removeItem('pageClosing');
        console.log('🧹 Información de pedido pendiente completamente limpiada del localStorage');
    }, []);

    // Función para manejar abandono de pago
    const handlePaymentAbandonment = useCallback(async () => {
        try {
            const pendingSessionId = localStorage.getItem('pendingOrderSession');
            const pendingOrderId = localStorage.getItem('pendingOrderId');
            
            if (pendingSessionId && pendingOrderId) {
                const orderRef = ref(realtimeDb, `orders/${pendingOrderId.replace('order_', '')}`);
                const snapshot = await get(orderRef);
                
                if (snapshot.exists()) {
                    const order = snapshot.val();
                    if (order.status === 'pending' && order.sessionId === pendingSessionId) {
                        await remove(orderRef);
                        console.log(`🚫 Pedido abandonado eliminado inmediatamente: ${pendingOrderId}`);
                        showNotification('Pedido cancelado y eliminado correctamente', 'info');
                    }
                }
                
                clearPendingOrderInfo();
            }
        } catch (error) {
            console.error('❌ Error al manejar abandono de pago:', error);
        }
    }, [clearPendingOrderInfo, showNotification]);

    // Función para limpiar pedidos abandonados
    const cleanupAbandonedOrders = useCallback(async () => {
        try {
            console.log('🧹 Iniciando limpieza de pedidos abandonados...');
            
            const pendingSessionId = localStorage.getItem('pendingOrderSession');
            const pendingOrderId = localStorage.getItem('pendingOrderId');
            const pendingTimestamp = localStorage.getItem('pendingOrderTimestamp');
            
            let cleanedCount = 0;
            
            // Limpieza de sesión específica
            if (pendingSessionId && pendingOrderId && pendingTimestamp) {
                const timeElapsed = Date.now() - parseInt(pendingTimestamp);
                
                if (timeElapsed > 5 * 60 * 1000) { // 5 minutos
                    try {
                        const orderRef = ref(realtimeDb, `orders/${pendingOrderId.replace('order_', '')}`);
                        const snapshot = await get(orderRef);
                        
                        if (snapshot.exists()) {
                            const order = snapshot.val();
                            if (order.status === 'pending' && order.sessionId === pendingSessionId) {
                                await remove(orderRef);
                                cleanedCount++;
                                console.log(`🗑️ Pedido abandonado limpiado: ${pendingOrderId}`);
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error al limpiar pedido específico:', error);
                    }
                    
                    clearPendingOrderInfo();
                }
            }
            
            // Limpieza general de pedidos expirados
            if (userProfile?.email) {
                const ordersRef = ref(realtimeDb, 'orders');
                const snapshot = await get(ordersRef);
                
                if (snapshot.exists()) {
                    const allOrders = snapshot.val();
                    const currentTime = Date.now();
                    
                    for (const [orderId, order] of Object.entries(allOrders)) {
                        const shouldCleanup = (
                            order.status === 'pending' && 
                            order.paymentMethod === 'card' &&
                            (
                                (order.userInfo?.email === userProfile.email && 
                                 currentTime - order.timestamp > 10 * 60 * 1000) ||
                                (order.expiresAt && currentTime > order.expiresAt) ||
                                (currentTime - order.timestamp > 30 * 60 * 1000) ||
                                (!order.sessionId || order.sessionId === '')
                            )
                        );
                        
                        if (shouldCleanup) {
                            try {
                                await remove(ref(realtimeDb, `orders/${orderId}`));
                                cleanedCount++;
                                console.log(`♻️ Pedido expirado eliminado: ${orderId}`);
                            } catch (error) {
                                console.error(`❌ Error al eliminar pedido ${orderId}:`, error);
                            }
                        }
                    }
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`✅ Limpieza completada: ${cleanedCount} pedido(s) eliminado(s)`);
            } else {
                console.log('✨ No se encontraron pedidos para limpiar');
            }
            
        } catch (error) {
            console.error('❌ Error en limpieza de pedidos abandonados:', error);
        }
    }, [userProfile, clearPendingOrderInfo]);

    // Función para verificar sesiones de pago abandonadas
    const checkForAbandonedPaymentSessions = useCallback(async () => {
        try {
            const pendingSessionId = localStorage.getItem('pendingOrderSession');
            const pendingTimestamp = localStorage.getItem('pendingOrderTimestamp');
            const redirectingToStripe = localStorage.getItem('redirectingToStripe');
            const stripeRedirectTime = localStorage.getItem('stripeRedirectTime');
            
            if (pendingSessionId && pendingTimestamp) {
                const timeElapsed = Date.now() - parseInt(pendingTimestamp);
                
                if (timeElapsed > 2 * 60 * 1000) {
                    console.log('🔍 Detectada posible sesión de pago abandonada al cargar página');
                    console.log(`⏰ Tiempo transcurrido: ${Math.round(timeElapsed / 1000)}s`);
                    
                    if (redirectingToStripe === 'true' && stripeRedirectTime) {
                        const timeSinceRedirect = Date.now() - parseInt(stripeRedirectTime);
                        if (timeSinceRedirect > 60 * 1000) {
                            console.log('🧹 Ejecutando limpieza por sesión abandonada detectada');
                            await handlePaymentAbandonment();
                        }
                    } else if (timeElapsed > 5 * 60 * 1000) {
                        console.log('🧹 Ejecutando limpieza por sesión muy antigua');
                        await handlePaymentAbandonment();
                    }
                }
            }
            
            localStorage.removeItem('redirectingToStripe');
            localStorage.removeItem('stripeRedirectTime');
            
        } catch (error) {
            console.error('❌ Error al verificar sesiones de pago abandonadas:', error);
        }
    }, [handlePaymentAbandonment]);

    // Cargar productos
    const loadProducts = useCallback(async () => {
        try {
            const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            const productsList = [];
            const categoriesMap = new Map();
            
            querySnapshot.forEach((doc) => {
                const product = { id: doc.id, ...doc.data() };
                productsList.push(product);
                
                if (!categoriesMap.has(product.category)) {
                    categoriesMap.set(product.category, []);
                }
                categoriesMap.get(product.category).push(product);
            });
            
            setProducts(productsList);
            setFilteredProducts(productsList);
            setCategories(categoriesMap);
        } catch (error) {
            console.error('Error loading products:', error);
            showNotification('Error al cargar los productos', 'error');
        }
    }, [showNotification]);

    // Cargar perfil de usuario
    const loadUserProfile = useCallback(async (uid) => {
        try {
            const userRef = ref(realtimeDb, `users/${uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                setUserProfile(snapshot.val());
            } else {
                console.error('User profile does not exist in database');
                showNotification('Perfil de usuario no encontrado', 'error');
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            showNotification('Error al cargar el perfil de usuario', 'error');
        }
    }, [showNotification]);

    // Manejar login
    const handleLogin = useCallback(async () => {
        const { email, password } = authForm.login;

        if (!email || !password) {
            showNotification('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            showNotification('¡Bienvenido de vuelta!', 'success');
            setShowAuthModal(false);
            setAuthForm(prev => ({ ...prev, login: { email: '', password: '' } }));
        } catch (error) {
            console.error('Error logging in:', error);
            let errorMessage = 'Error al iniciar sesión';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuario no encontrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Contraseña incorrecta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Demasiados intentos. Intenta más tarde';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña';
                    break;
            }
            
            showNotification(errorMessage, 'error');
        }
    }, [authForm.login, showNotification]);

    // Manejar registro
    const handleRegister = useCallback(async () => {
        const { fullName, phone, email, password, location } = authForm.register;

        if (!fullName || !phone || !email || !password || !location) {
            showNotification('Por favor completa todos los campos', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userProfileData = {
                uid: user.uid,
                fullName,
                phone,
                email,
                location,
                createdAt: Date.now()
            };

            // Guardar en Firebase Realtime Database
            await set(ref(realtimeDb, `users/${user.uid}`), userProfileData);
            
            setUserProfile(userProfileData);
            showNotification('¡Cuenta creada exitosamente!', 'success');
            setShowAuthModal(false);
            setAuthForm(prev => ({ ...prev, register: { fullName: '', phone: '', email: '', password: '', location: '' } }));
        } catch (error) {
            console.error('Error registering:', error);
            let errorMessage = 'Error al crear la cuenta';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este email ya está registrado';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es muy débil';
                    break;
            }
            
            showNotification(errorMessage, 'error');
        }
    }, [authForm.register, showNotification]);

    // Manejar logout
    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            setCart([]);
            setUserProfile(null);
            showNotification('Sesión cerrada correctamente', 'info');
        } catch (error) {
            console.error('Error logging out:', error);
            showNotification('Error al cerrar sesión', 'error');
        }
    }, [showNotification]);

    // Agregar al carrito
    const addToCart = useCallback((productId) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const stock = product.stock || 0;
        if (stock === 0) {
            showNotification('Este producto no tiene stock disponible. Elige otro producto.', 'error');
            return;
        }

        const cartItem = cart.find(item => item.id === productId);
        const currentQuantityInCart = cartItem ? cartItem.quantity : 0;
        
        if (currentQuantityInCart >= stock) {
            showNotification(`Stock insuficiente. Solo quedan ${stock} unidades disponibles.`, 'error');
            return;
        }

        if (cartItem) {
            setCart(prev => prev.map(item => 
                item.id === productId 
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart(prev => [...prev, {
                id: productId,
                name: product.name,
                quantity: 1,
                unitPrice: product.price || product.individualPrice || 0,
                wholesalePrice: product.wholesalePrice || (product.price || product.individualPrice || 0) * 0.8,
                wholesaleQuantity: product.wholesaleQuantity || 4,
                totalPrice: product.price || product.individualPrice || 0,
                priceType: 'individual'
            }]);
        }

        updateCartPricing();
        showNotification(`${product.name} agregado al carrito`, 'success');
    }, [products, cart, showNotification]);

    // Actualizar precios del carrito
    const updateCartPricing = useCallback(() => {
        setCart(prev => prev.map(item => {
            const product = products.find(p => p.id === item.id);
            if (product) {
                const wholesaleQuantity = product.wholesaleQuantity || 4;
                
                let unitPrice, priceType;
                if (item.quantity >= wholesaleQuantity && product.wholesalePrice) {
                    unitPrice = product.wholesalePrice;
                    priceType = 'wholesale';
                } else {
                    unitPrice = product.price || product.individualPrice || 0;
                    priceType = 'individual';
                }
                
                return {
                    ...item,
                    unitPrice,
                    priceType,
                    totalPrice: item.quantity * unitPrice
                };
            }
            return item;
        }));
    }, [products]);

    // Procesar pago con Stripe
    const processPaymentWithStripe = useCallback(async () => {
        if (cart.length === 0) {
            showNotification('Tu carrito está vacío', 'error');
            return;
        }

        if (!currentUser || !userProfile) {
            showNotification('Debes iniciar sesión para realizar un pedido', 'error');
            return;
        }

        try {
            showNotification('🔄 Preparando pago seguro...', 'info');
            
            // Limpiar pedidos pendientes previos
            await cleanupPreviousPendingOrders();

            // Actualizar precios del carrito
            const cartWithUpdatedPrices = cart.map(item => {
                const product = products.find(p => p.id === item.id);
                if (!product) {
                    throw new Error(`Producto no encontrado: ${item.name}`);
                }

                const wholesaleQuantity = product.wholesaleQuantity || 4;
                const isWholesale = item.quantity >= wholesaleQuantity && product.wholesalePrice;
                const unitPrice = isWholesale ? product.wholesalePrice : (product.price || product.individualPrice);
                
                if (!unitPrice || isNaN(unitPrice)) {
                    throw new Error(`Precio inválido para el producto: ${item.name}`);
                }

                return {
                    id: item.id,
                    name: `${item.name} ${isWholesale ? '(Precio Mayoreo)' : ''}`,
                    quantity: item.quantity,
                    unitPrice: parseFloat(unitPrice),
                    totalPrice: item.quantity * parseFloat(unitPrice),
                    priceType: isWholesale ? 'wholesale' : 'individual',
                    images: product.images || [product.imageUrl] || []
                };
            });

            const total = cartWithUpdatedPrices.reduce((sum, item) => sum + item.totalPrice, 0);
            
            if (isNaN(total) || total <= 0) {
                throw new Error('El total del pedido es inválido');
            }

            // Generar ID de sesión único
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Guardar información de seguimiento
            const sessionInfo = {
                sessionId: sessionId,
                userEmail: userProfile.email,
                cartSize: cartWithUpdatedPrices.length,
                total: total
            };
            
            localStorage.setItem('pendingOrderSession', sessionId);
            localStorage.setItem('pendingOrderTimestamp', Date.now().toString());
            localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
            
            console.log('🔒 Sesión de pago iniciada:', sessionInfo);

            showNotification('🔐 Creando sesión de pago...', 'info');
            
            // Crear sesión de checkout con Stripe
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://catalogo-clientes-0ido.onrender.com';
            const response = await fetch(`${backendUrl}/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cartWithUpdatedPrices,
                    userInfo: userProfile
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear la sesión de checkout');
            }

            const { url } = await response.json();
            
            showNotification('🚀 Redirigiendo a pasarela de pagos...', 'success');
            
            // Marcar que estamos yendo a Stripe
            localStorage.setItem('redirectingToStripe', 'true');
            localStorage.setItem('stripeRedirectTime', Date.now().toString());
            
            window.location.href = url;

        } catch (error) {
            console.error('❌ Error al procesar el pago:', error);
            clearPendingOrderInfo();
            showNotification(`${error.message || 'Error al procesar el pago'}`, 'error');
        }
    }, [cart, currentUser, userProfile, products, showNotification, clearPendingOrderInfo]);

    // Limpiar pedidos pendientes previos
    const cleanupPreviousPendingOrders = useCallback(async () => {
        try {
            if (!userProfile?.email) return;

            const ordersRef = ref(realtimeDb, 'orders');
            const snapshot = await get(ordersRef);
            
            if (snapshot.exists()) {
                const allOrders = snapshot.val();
                const currentTime = Date.now();
                
                for (const [orderId, order] of Object.entries(allOrders)) {
                    if (order.status === 'pending' && 
                        order.paymentMethod === 'card' &&
                        order.userInfo?.email === userProfile.email &&
                        (currentTime - order.timestamp > 5 * 60 * 1000)) {
                        
                        await remove(ref(realtimeDb, `orders/${orderId}`));
                        console.log(`Pedido pendiente previo eliminado: ${orderId}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error al limpiar pedidos pendientes previos:', error);
        }
    }, [userProfile]);

    // Cargar historial de pedidos
    const loadOrderHistory = useCallback(async () => {
        try {
            if (!currentUser || !userProfile) return;

            console.log('Fetching orders for user:', currentUser.uid);
            const ordersRef = ref(realtimeDb, 'orders');
            const snapshot = await get(ordersRef);

            const userOrders = [];
            if (snapshot.exists()) {
                const allOrders = snapshot.val();
                Object.keys(allOrders).forEach(key => {
                    if (allOrders[key].userId === currentUser.uid || 
                        allOrders[key].userInfo?.email === userProfile.email) {
                        console.log('Order found for user:', key, allOrders[key]);
                        userOrders.push({ id: key, ...allOrders[key] });
                    }
                });
            }

            setOrderHistory(userOrders);
        } catch (error) {
            console.error('Error loading order history:', error);
            showNotification(`Error al cargar el historial de pedidos: ${error.message}`, 'error');
        }
    }, [currentUser, userProfile, showNotification]);

    // Efectos
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                await loadUserProfile(user.uid);
            } else {
                setUserProfile(null);
                setCart([]);
            }
        });

        return () => unsubscribe();
    }, [loadUserProfile]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadProducts();
            await checkForAbandonedPaymentSessions();
            await cleanupAbandonedOrders();
            setLoading(false);
        };

        init();
    }, [loadProducts, checkForAbandonedPaymentSessions, cleanupAbandonedOrders]);

    useEffect(() => {
        updateCartPricing();
    }, [cart, updateCartPricing]);

    useEffect(() => {
        if (currentUser && userProfile) {
            loadOrderHistory();
        }
    }, [currentUser, userProfile, loadOrderHistory]);

    // Heartbeat para detectar sesiones abandonadas
    useEffect(() => {
        heartbeatIntervalRef.current = setInterval(async () => {
            const pendingSessionId = localStorage.getItem('pendingOrderSession');
            const pendingTimestamp = localStorage.getItem('pendingOrderTimestamp');
            
            if (pendingSessionId && pendingTimestamp) {
                const timeElapsed = Date.now() - parseInt(pendingTimestamp);
                
                if (timeElapsed > 25 * 60 * 1000) {
                    console.log('⏰ Heartbeat: Tiempo de sesión excedido, limpiando pedido');
                    await handlePaymentAbandonment();
                }
            }
        }, 60 * 1000);

        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
        };
    }, [handlePaymentAbandonment]);

    // Detectar cuando el usuario sale de la página
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const awayTime = Date.now();
                localStorage.setItem('pageAwayTime', awayTime.toString());
                console.log('🚫 Usuario salió de la página');
            } else if (document.visibilityState === 'visible') {
                const awayTime = localStorage.getItem('pageAwayTime');
                const pendingSessionId = localStorage.getItem('pendingOrderSession');
                const pendingTimestamp = localStorage.getItem('pendingOrderTimestamp');
                
                if (pendingSessionId && pendingTimestamp && awayTime) {
                    const timeAwayFromPage = Date.now() - parseInt(awayTime);
                    const totalTimeElapsed = Date.now() - parseInt(pendingTimestamp);
                    
                    if (timeAwayFromPage > 30 * 1000 || totalTimeElapsed > 3 * 60 * 1000) {
                        console.log('🧹 Iniciando limpieza por posible abandono de pago');
                        handlePaymentAbandonment();
                    }
                    
                    localStorage.removeItem('pageAwayTime');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [handlePaymentAbandonment]);

    // Detectar navegación con el botón "Atrás"
    useEffect(() => {
        const handlePopState = async () => {
            console.log('⬅️ Navegación hacia atrás detectada');
            
            const pendingSessionId = localStorage.getItem('pendingOrderSession');
            if (pendingSessionId) {
                console.log('🧹 Detectado regreso desde pasarela de pagos - limpiando pedido pendiente');
                
                setTimeout(async () => {
                    await handlePaymentAbandonment();
                }, 500);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [handlePaymentAbandonment]);

    // Detectar cuando el usuario intenta cerrar la pestaña
    useEffect(() => {
        const handleBeforeUnload = () => {
            const pendingSessionId = localStorage.getItem('pendingOrderSession');
            if (pendingSessionId) {
                localStorage.setItem('pageClosing', 'true');
                console.log('⚠️ Usuario intentando cerrar página con pedido pendiente');
            }
        };

        const handleFocus = () => {
            const wasClosing = localStorage.getItem('pageClosing');
            if (wasClosing === 'true') {
                localStorage.removeItem('pageClosing');
                console.log('✅ Usuario regresó después de intento de cierre');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('focus', handleFocus);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Cargando catálogo...</p>
            </div>
        );
    }

    return (
        <div className="ecommerce-manager">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="logo">
                        <span className="logo-icon">📦</span>
                        <span className="logo-text">SOFT PACK</span>
                    </div>
                    
                    <div className="search-bar">
                        <input 
                            type="text" 
                            placeholder="¿Qué estás buscando?" 
                            className="search-input"
                        />
                        <button className="search-btn">
                            <i className="fas fa-search"></i>
                        </button>
                    </div>
                    
                    <div className="header-actions">
                        <button className="contact-btn">
                            <i className="fas fa-phone"></i>
                            5627274791
                        </button>
                        
                        {currentUser ? (
                            <div className="user-section">
                                <span className="user-name">{userProfile?.fullName || 'Usuario'}</span>
                                <button 
                                    className="history-btn"
                                    onClick={() => setShowHistoryModal(true)}
                                >
                                    <i className="fas fa-history"></i>
                                    Historial
                                </button>
                                <button className="logout-btn" onClick={handleLogout}>
                                    <i className="fas fa-sign-out-alt"></i>
                                    Salir
                                </button>
                            </div>
                        ) : (
                            <button 
                                className="login-btn"
                                onClick={() => setShowAuthModal(true)}
                            >
                                <i className="fas fa-user"></i>
                                Iniciar Sesión
                            </button>
                        )}
                        
                        <button 
                            className="cart-btn"
                            onClick={() => setShowCartModal(true)}
                        >
                            <i className="fas fa-shopping-cart"></i>
                            <span className="cart-count">{cart.length}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
                <div className="hero-section">
                    <h1>Descubre productos de calidad premium</h1>
                    <p>Encuentra exactamente lo que necesitas con la mejor calidad y precios competitivos</p>
                    
                    <div className="feature-buttons">
                        <button className="feature-btn">
                            <i className="fas fa-credit-card"></i>
                            Pago Seguro
                        </button>
                        <button className="feature-btn">
                            <i className="fas fa-truck"></i>
                            Envío Rápido
                        </button>
                    </div>
                    
                    <div className="cta-buttons">
                        <button className="cta-btn primary">
                            <i className="fas fa-search"></i>
                            Explorar Catálogo
                        </button>
                        <button className="cta-btn secondary">
                            <i className="fas fa-comments"></i>
                            Contactar
                        </button>
                    </div>
                </div>

                {/* Products Grid */}
                <div className="products-section">
                    <div className="products-header">
                        <h2>Nuestros Productos</h2>
                        <span className="products-count">{filteredProducts.length} Artículos</span>
                    </div>
                    
                    <div className="products-grid">
                        {filteredProducts.map(product => {
                            const stock = product.stock || 0;
                            const individualPrice = product.price || product.individualPrice || 0;
                            
                            return (
                                <div 
                                    key={product.id} 
                                    className="product-card"
                                    onClick={() => {
                                        setCurrentProduct(product);
                                        setShowProductModal(true);
                                    }}
                                >
                                    <div className="product-image">
                                        <img 
                                            src={product.imageUrl} 
                                            alt={product.name}
                                            onError={(e) => {
                                                e.target.src = 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=350&h=350&fit=crop';
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="product-content">
                                        <div className="product-brand">SOFT DUCK</div>
                                        <h3 className="product-name">{product.name}</h3>
                                        <div className="product-price">${individualPrice.toFixed(2)}</div>
                                        <div className="product-stock">Stock: {stock}</div>
                                        
                                        <button 
                                            className={`add-to-cart ${stock === 0 ? 'disabled' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(product.id);
                                            }}
                                            disabled={stock === 0}
                                        >
                                            <i className={`fas fa-${stock === 0 ? 'times-circle' : 'cart-plus'}`}></i>
                                            {stock === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Modals */}
            {showAuthModal && (
                <AuthModal 
                    authTab={authTab}
                    setAuthTab={setAuthTab}
                    authForm={authForm}
                    setAuthForm={setAuthForm}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    onClose={() => setShowAuthModal(false)}
                />
            )}

            {showCartModal && (
                <CartModal 
                    cart={cart}
                    setCart={setCart}
                    onClose={() => setShowCartModal(false)}
                    onCheckout={() => {
                        setShowCartModal(false);
                        setShowDeliveryModal(true);
                    }}
                    onStripePayment={processPaymentWithStripe}
                    currentUser={currentUser}
                    userProfile={userProfile}
                />
            )}

            {showDeliveryModal && (
                <DeliveryModal 
                    deliveryInfo={deliveryInfo}
                    setDeliveryInfo={setDeliveryInfo}
                    onClose={() => setShowDeliveryModal(false)}
                    onSubmit={async (deliveryData) => {
                        // Implementar checkout con WhatsApp
                        setShowDeliveryModal(false);
                    }}
                />
            )}

            {showHistoryModal && (
                <HistoryModal 
                    orderHistory={orderHistory}
                    onClose={() => setShowHistoryModal(false)}
                />
            )}

            {showProductModal && currentProduct && (
                <ProductModal 
                    product={currentProduct}
                    quantity={modalQuantity}
                    setQuantity={setModalQuantity}
                    onClose={() => setShowProductModal(false)}
                    onAddToCart={(quantity) => {
                        // Implementar agregar al carrito con cantidad específica
                        setShowProductModal(false);
                    }}
                />
            )}

            {/* Notification */}
            {notification && (
                <div className={`notification notification-${notification.type}`}>
                    <i className={`fas fa-${notification.type === 'success' ? 'check-circle' : notification.type === 'error' ? 'exclamation-circle' : 'info-circle'}`}></i>
                    <span>{notification.message}</span>
                </div>
            )}
        </div>
    );
};

export default EcommerceManager;
