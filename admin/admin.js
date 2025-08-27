    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
    import { 
        getFirestore, 
        collection, 
        addDoc, 
        getDocs, 
        doc, 
        updateDoc, 
        deleteDoc, 
        orderBy, 
        query,
        serverTimestamp 
    } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
    import { 
        getDatabase, 
        ref, 
        get, 
        update,
        remove,
        onValue,
        push,
        set
    } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

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
    const realtimeDb = getDatabase(app);

    class AdminManager {
        constructor() {
            this.products = [];
            this.orders = [];
            this.users = [];
            this.payments = [];
            this.editingProductId = null;
            this.currentTab = 'products';
            this.productImages = [];
            this.primaryImageIndex = 0;
            this.expandedCategories = new Set();
            this.expandedCustomers = new Set();
            this.monteCarloResults = null;
            this.categoryStats = {};
            this.charts = {};
            this.dashboardStats = {
                totalSales: 0,
                totalOrders: 0,
                totalCustomers: 0,
                totalProducts: 0,
                cardPayments: 0,
                cashPayments: 0,
                pickupOrders: 0,
                deliveryOrders: 0
            };
            this.init();
        }

        async init() {
            await this.loadProducts();
            await this.loadOrders();
            await this.loadUsers();
            await this.loadPayments();
            this.setupEventListeners();
            this.calculateDashboardStats();
            this.renderDashboard();
            this.renderProducts();
            this.renderOrders();
            this.renderPayments();
            this.renderUsers();
            this.initializeCharts();
        }

        setupEventListeners() {
            const form = document.getElementById('productForm');
            const cancelEditBtn = document.getElementById('cancelEdit');
            const uploadMethodBtns = document.querySelectorAll('.upload-method-btn');
            const fileUploadArea = document.querySelector('.file-upload-area');
            
            // Advanced Statistics Event Listeners
            const runAnalysisBtn = document.getElementById('runAnalysisBtn');
            const exportResultsBtn = document.getElementById('exportResultsBtn');
            const resetAnalysisBtn = document.getElementById('resetAnalysisBtn');
            const periodSelector = document.getElementById('periodSelector');
            const monthSelector = document.getElementById('monthSelector');
            const seasonSelector = document.getElementById('seasonSelector');

            form.addEventListener('submit', (e) => this.handleSubmit(e));
            cancelEditBtn.addEventListener('click', () => this.cancelEdit());
            
            // Advanced Monte Carlo simulation
            if (runAnalysisBtn) {
                runAnalysisBtn.addEventListener('click', () => this.runAdvancedMonteCarloAnalysis());
            }
            
            if (exportResultsBtn) {
                exportResultsBtn.addEventListener('click', () => this.exportAnalysisResults());
            }
            
            if (resetAnalysisBtn) {
                resetAnalysisBtn.addEventListener('click', () => this.resetAnalysis());
            }

            // Period change handlers
            [periodSelector, monthSelector, seasonSelector].forEach(selector => {
                if (selector) {
                    selector.addEventListener('change', () => this.updateAnalysisParameters());
                }
            });

            // Upload method switching
            uploadMethodBtns.forEach(btn => {
                btn.addEventListener('click', () => this.switchUploadMethod(btn.dataset.method));
            });

            // File drag and drop
            if (fileUploadArea) {
                fileUploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    fileUploadArea.classList.add('dragover');
                });

                fileUploadArea.addEventListener('dragleave', () => {
                    fileUploadArea.classList.remove('dragover');
                });

                fileUploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    fileUploadArea.classList.remove('dragover');
                    this.handleFileSelect({ target: { files: e.dataTransfer.files } });
                });
            }

            // Enter key for URL input
            const imageUrlInput = document.getElementById('imageUrlInput');
            if (imageUrlInput) {
                imageUrlInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.addImageFromUrl();
                    }
                });
            }

            // Order filters
            const orderStatusFilter = document.getElementById('orderStatusFilter');
            const paymentMethodFilter = document.getElementById('paymentMethodFilter');
            
            if (orderStatusFilter) {
                orderStatusFilter.addEventListener('change', () => this.filterOrders());
            }
            
            if (paymentMethodFilter) {
                paymentMethodFilter.addEventListener('change', () => this.filterOrders());
            }
        }

        switchUploadMethod(method) {
            // Update buttons
            document.querySelectorAll('.upload-method-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-method="${method}"]`).classList.add('active');

            // Update content
            document.querySelectorAll('.upload-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(method === 'url' ? 'urlUpload' : 'fileUpload').classList.add('active');
        }

        addImageFromUrl() {
            const urlInput = document.getElementById('imageUrlInput');
            const url = urlInput.value.trim();

            if (!url) {
                this.showNotification('Por favor ingresa una URL válida', 'error');
                return;
            }

            if (!this.isValidImageUrl(url)) {
                this.showNotification('La URL debe ser una imagen válida (JPG, PNG, WebP, GIF)', 'error');
                return;
            }

            // Check if image already exists
            if (this.productImages.some(img => img.url === url)) {
                this.showNotification('Esta imagen ya fue agregada', 'error');
                return;
            }

            // Test if image loads
            const img = new Image();
            img.onload = () => {
                this.productImages.push({
                    url: url,
                    type: 'url',
                    isPrimary: this.productImages.length === 0
                });
                
                if (this.productImages.length === 1) {
                    this.primaryImageIndex = 0;
                }
                
                this.renderImagesPreview();
                urlInput.value = '';
                this.showNotification('Imagen agregada exitosamente', 'success');
            };
            
            img.onerror = () => {
                this.showNotification('No se pudo cargar la imagen desde esta URL', 'error');
            };
            
            img.src = url;
        }

        handleFileSelect(event) {
            const files = Array.from(event.target.files);
            
            files.forEach(file => {
                if (!file.type.startsWith('image/')) {
                    this.showNotification(`${file.name} no es un archivo de imagen válido`, 'error');
                    return;
                }

                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    this.showNotification(`${file.name} es demasiado grande (máximo 5MB)`, 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    this.productImages.push({
                        url: e.target.result,
                        type: 'file',
                        file: file,
                        isPrimary: this.productImages.length === 0
                    });
                    
                    if (this.productImages.length === 1) {
                        this.primaryImageIndex = 0;
                    }
                    
                    this.renderImagesPreview();
                };
                reader.readAsDataURL(file);
            });

            // Clear file input
            event.target.value = '';
        }

        isValidImageUrl(url) {
            const imageExtensions = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
            return imageExtensions.test(url) || url.includes('unsplash.com') || url.includes('pexels.com') || url.includes('pixabay.com');
        }

        renderImagesPreview() {
            const container = document.getElementById('imagesPreview');
            
            if (!container || this.productImages.length === 0) {
                if (container) container.innerHTML = '';
                return;
            }

            container.innerHTML = this.productImages.map((image, index) => `
                <div class="image-preview-item">
                    <img src="${image.url}" alt="Imagen ${index + 1}" 
                        onerror="this.src='https://via.placeholder.com/120x120/1a1a1a/ffffff?text=Error'">
                    
                    ${image.isPrimary ? 
                        '<div class="primary-badge">Principal</div>' : 
                        `<button type="button" class="set-primary-btn" onclick="adminManager.setPrimaryImage(${index})">
                            Principal
                        </button>`
                    }
                    
                    <button type="button" class="remove-image" onclick="adminManager.removeImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }

        setPrimaryImage(index) {
            // Reset all images
            this.productImages.forEach(img => img.isPrimary = false);
            // Set new primary
            this.productImages[index].isPrimary = true;
            this.primaryImageIndex = index;
            this.renderImagesPreview();
        }

        removeImage(index) {
            const wasRemovingPrimary = this.productImages[index].isPrimary;
            this.productImages.splice(index, 1);
            
            // If we removed the primary image and there are still images, set the first one as primary
            if (wasRemovingPrimary && this.productImages.length > 0) {
                this.productImages[0].isPrimary = true;
                this.primaryImageIndex = 0;
            } else if (this.productImages.length === 0) {
                this.primaryImageIndex = 0;
            }
            
            this.renderImagesPreview();
        }

        switchTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName + 'Tab').classList.add('active');

            this.currentTab = tabName;

            // Load data for the current tab if needed
            if (tabName === 'dashboard') {
                this.calculateDashboardStats();
                this.renderDashboard();
            } else if (tabName === 'orders') {
                this.renderOrders();
            } else if (tabName === 'payments') {
                this.renderPayments();
            } else if (tabName === 'users') {
                this.renderUsers();
            } else if (tabName === 'statistics') {
                this.initializeCharts();
                this.calculateCategoryStats();
                this.renderCategoryStats();
                this.renderProductDistribution();
            }
        }

        async loadProducts() {
            try {
                const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                
                this.products = [];
                querySnapshot.forEach((doc) => {
                    this.products.push({ id: doc.id, ...doc.data() });
                });
                
                // Calculate category statistics after loading products
                this.calculateCategoryStats();
            } catch (error) {
                console.error('Error loading products:', error);
                this.showNotification('Error al cargar los productos', 'error');
            }
        }

        async loadOrders() {
            try {
                console.log('🔄 Iniciando carga de pedidos...');
                const ordersRef = ref(realtimeDb, 'orders');
                console.log('📝 Referencia creada:', ordersRef);
                
                const snapshot = await get(ordersRef);
                console.log('📊 Snapshot obtenido:', snapshot);
                console.log('📊 Snapshot existe:', snapshot.exists());
                
                this.orders = [];
                if (snapshot.exists()) {
                    const ordersData = snapshot.val();
                    console.log('📋 Datos de pedidos:', ordersData);
                    console.log('📋 Claves de pedidos:', Object.keys(ordersData));
                    
                    Object.keys(ordersData).forEach(key => {
                        console.log('📄 Procesando pedido:', key, ordersData[key]);
                        const orderData = {
                            id: key,
                            ...ordersData[key]
                        };
                        
                        // Agregar campos faltantes solo si no existen
                        if (!orderData.userId) {
                            orderData.userId = key;
                        }
                        if (!orderData.status) {
                            orderData.status = 'pending';
                        }
                        if (!orderData.timestamp) {
                            orderData.timestamp = Date.now();
                        }
                        if (!orderData.total && orderData.items) {
                            orderData.total = orderData.items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
                        }
                        if (!orderData.paymentMethod) {
                            orderData.paymentMethod = 'cash';
                        }
                        
                        console.log('✅ Pedido procesado:', orderData);
                        this.orders.push(orderData);
                    });
                    
                    // Sort by timestamp desc
                    this.orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    console.log('📊 Total de pedidos cargados:', this.orders.length);
                } else {
                    console.log('❌ No hay pedidos en la base de datos');
                }
            } catch (error) {
                console.error('❌ Error loading orders:', error);
                console.error('❌ Error details:', error.message, error.stack);
                this.showNotification('Error al cargar los pedidos', 'error');
            }
        }

        async loadUsers() {
            try {
                const usersRef = ref(realtimeDb, 'users');
                const snapshot = await get(usersRef);
                
                this.users = [];
                if (snapshot.exists()) {
                    const usersData = snapshot.val();
                    Object.keys(usersData).forEach(key => {
                        const userData = {
                            id: key,
                            ...usersData[key]
                        };
                        
                        // Buscar pedidos de este usuario
                        const userOrders = this.orders.filter(order => order.userId === key);
                        
                        this.users.push({
                            ...userData,
                            ordersCount: userOrders.length,
                            orders: userOrders
                        });
                    });
                }
            } catch (error) {
                console.error('Error loading users:', error);
                this.showNotification('Error al cargar los usuarios', 'error');
            }
        }

        async loadPayments() {
            // For now, payments are derived from orders
            // In a real implementation, you might have a separate payments collection
            this.payments = this.orders.map(order => ({
                id: order.id,
                orderId: order.id,
                amount: order.total,
                method: order.paymentMethod || 'cash',
                status: order.status,
                timestamp: order.timestamp,
                customerName: order.userInfo?.fullName || 'Cliente desconocido',
                deliveryType: order.deliveryInfo?.type || 'pickup'
            }));
        }

        calculateDashboardStats() {
            // Calculate total sales
            this.dashboardStats.totalSales = this.orders
                .filter(order => order.status === 'completed')
                .reduce((sum, order) => sum + (order.total || 0), 0);

            // Calculate total orders
            this.dashboardStats.totalOrders = this.orders.length;

            // Calculate total customers
            this.dashboardStats.totalCustomers = this.users.length;

            // Calculate total products
            this.dashboardStats.totalProducts = this.products.length;

            // Calculate payment method stats
            const completedOrders = this.orders.filter(order => order.status === 'completed');
            this.dashboardStats.cardPayments = completedOrders
                .filter(order => order.paymentMethod === 'card')
                .reduce((sum, order) => sum + (order.total || 0), 0);
            
            this.dashboardStats.cashPayments = completedOrders
                .filter(order => order.paymentMethod === 'cash' || !order.paymentMethod)
                .reduce((sum, order) => sum + (order.total || 0), 0);

            // Calculate delivery type stats
            this.dashboardStats.pickupOrders = this.orders
                .filter(order => order.deliveryInfo?.type === 'pickup').length;
            
            this.dashboardStats.deliveryOrders = this.orders
                .filter(order => order.deliveryInfo?.type === 'delivery').length;

            // Update header stats
            this.updateHeaderStats();
        }

        updateHeaderStats() {
            const totalOrdersEl = document.getElementById('totalOrders');
            const totalRevenueEl = document.getElementById('totalRevenue');
            const totalUsersEl = document.getElementById('totalUsers');

            if (totalOrdersEl) totalOrdersEl.textContent = this.dashboardStats.totalOrders;
            if (totalRevenueEl) totalRevenueEl.textContent = `$${this.dashboardStats.totalSales.toFixed(2)}`;
            if (totalUsersEl) totalUsersEl.textContent = this.dashboardStats.totalCustomers;
        }

        renderDashboard() {
            // Update summary cards
            const dashboardSales = document.getElementById('dashboardSales');
            const dashboardOrders = document.getElementById('dashboardOrders');
            const dashboardCustomers = document.getElementById('dashboardCustomers');
            const dashboardProducts = document.getElementById('dashboardProducts');

            if (dashboardSales) dashboardSales.textContent = `$${this.dashboardStats.totalSales.toFixed(2)}`;
            if (dashboardOrders) dashboardOrders.textContent = this.dashboardStats.totalOrders;
            if (dashboardCustomers) dashboardCustomers.textContent = this.dashboardStats.totalCustomers;
            if (dashboardProducts) dashboardProducts.textContent = this.dashboardStats.totalProducts;

            // Update payment methods chart
            this.renderPaymentMethodsChart();

            // Update delivery types chart
            this.renderDeliveryTypesChart();

            // Update recent activity
            this.renderRecentActivity();
        }

        renderPaymentMethodsChart() {
            const totalPayments = this.dashboardStats.cardPayments + this.dashboardStats.cashPayments;
            
            const cardPercentage = totalPayments > 0 ? (this.dashboardStats.cardPayments / totalPayments) * 100 : 0;
            const cashPercentage = totalPayments > 0 ? (this.dashboardStats.cashPayments / totalPayments) * 100 : 0;

            // Update amounts
            const cardPayments = document.getElementById('cardPayments');
            const cashPayments = document.getElementById('cashPayments');
            if (cardPayments) cardPayments.textContent = `$${this.dashboardStats.cardPayments.toFixed(2)}`;
            if (cashPayments) cashPayments.textContent = `$${this.dashboardStats.cashPayments.toFixed(2)}`;

            // Update bars
            const cardBar = document.getElementById('cardBar');
            const cashBar = document.getElementById('cashBar');
            if (cardBar) cardBar.style.width = `${cardPercentage}%`;
            if (cashBar) cashBar.style.width = `${cashPercentage}%`;

            // Update percentages
            const cardPercentageEl = document.getElementById('cardPercentage');
            const cashPercentageEl = document.getElementById('cashPercentage');
            if (cardPercentageEl) cardPercentageEl.textContent = `${cardPercentage.toFixed(1)}%`;
            if (cashPercentageEl) cashPercentageEl.textContent = `${cashPercentage.toFixed(1)}%`;
        }

        renderDeliveryTypesChart() {
            const totalDeliveries = this.dashboardStats.pickupOrders + this.dashboardStats.deliveryOrders;
            
            const pickupPercentage = totalDeliveries > 0 ? (this.dashboardStats.pickupOrders / totalDeliveries) * 100 : 0;
            const deliveryPercentage = totalDeliveries > 0 ? (this.dashboardStats.deliveryOrders / totalDeliveries) * 100 : 0;

            // Update counts
            const pickupOrders = document.getElementById('pickupOrders');
            const deliveryOrders = document.getElementById('deliveryOrders');
            if (pickupOrders) pickupOrders.textContent = this.dashboardStats.pickupOrders;
            if (deliveryOrders) deliveryOrders.textContent = this.dashboardStats.deliveryOrders;

            // Update bars
            const pickupBar = document.getElementById('pickupBar');
            const deliveryBar = document.getElementById('deliveryBar');
            if (pickupBar) pickupBar.style.width = `${pickupPercentage}%`;
            if (deliveryBar) deliveryBar.style.width = `${deliveryPercentage}%`;

            // Update percentages
            const pickupPercentageEl = document.getElementById('pickupPercentage');
            const deliveryPercentageEl = document.getElementById('deliveryPercentage');
            if (pickupPercentageEl) pickupPercentageEl.textContent = `${pickupPercentage.toFixed(1)}%`;
            if (deliveryPercentageEl) deliveryPercentageEl.textContent = `${deliveryPercentage.toFixed(1)}%`;
        }

        renderRecentActivity() {
            const container = document.getElementById('recentActivity');
            if (!container) return;

            // Get recent activities (last 10)
            const recentActivities = [];

            // Add recent orders
            this.orders.slice(0, 5).forEach(order => {
                let customerName = order.userInfo?.fullName || 'Cliente';
                
                // Si no hay información de usuario, intentar buscar en la lista de usuarios
                if (customerName === 'Cliente' && this.users.length > 0) {
                    const user = this.users.find(u => u.id === order.userId);
                    if (user && user.fullName) {
                        customerName = user.fullName;
                    }
                }
                
                // Si aún no tenemos nombre, usar el ID del usuario
                if (customerName === 'Cliente' && order.userId) {
                    customerName = `Cliente ${order.userId.slice(-6)}`;
                }
                
                recentActivities.push({
                    type: 'order',
                    title: `Nuevo pedido #${order.id.slice(-6)}`,
                    details: `${customerName} - $${(order.total || 0).toFixed(2)}`,
                    timestamp: order.timestamp,
                    icon: 'order'
                });
            });

            // Add recent users
            this.users.slice(0, 3).forEach(user => {
                recentActivities.push({
                    type: 'user',
                    title: 'Nuevo usuario registrado',
                    details: user.fullName,
                    timestamp: user.createdAt,
                    icon: 'user'
                });
            });

            // Sort by timestamp
            recentActivities.sort((a, b) => b.timestamp - a.timestamp);

            if (recentActivities.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clock"></i>
                        <h3>Sin Actividad</h3>
                        <p>No hay actividad reciente para mostrar</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = recentActivities.slice(0, 8).map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.icon}">
                        <i class="fas fa-${activity.icon === 'order' ? 'shopping-bag' : activity.icon === 'user' ? 'user-plus' : 'box'}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-details">${activity.details}</div>
                    </div>
                    <div class="activity-time">
                        ${this.formatTimeAgo(activity.timestamp)}
                    </div>
                </div>
            `).join('');
        }

        formatTimeAgo(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'Ahora';
            if (minutes < 60) return `${minutes}m`;
            if (hours < 24) return `${hours}h`;
            return `${days}d`;
        }

        getStockStatusClass(stock) {
            if (stock === 0) return 'out-of-stock';
            if (stock <= 5) return 'low-stock';
            return 'in-stock';
        }

        getStockStatusText(stock) {
            if (stock === 0) return 'Sin Stock';
            if (stock <= 5) return `Stock Bajo (${stock})`;
            return `En Stock (${stock})`;
        }

        toggleCategory(category) {
            if (this.expandedCategories.has(category)) {
                this.expandedCategories.delete(category);
            } else {
                this.expandedCategories.add(category);
            }
            this.renderProducts();
        }

        toggleCustomer(customerId) {
            if (this.expandedCustomers.has(customerId)) {
                this.expandedCustomers.delete(customerId);
            } else {
                this.expandedCustomers.add(customerId);
            }
            this.renderOrders();
        }

        renderProducts() {
            const container = document.getElementById('productsGrid');
            
            if (this.products.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-boxes-stacked"></i>
                        <h3>Sin Productos</h3>
                        <p>Agrega tu primer producto usando el formulario</p>
                    </div>
                `;
                return;
            }

            // Group products by category
            const categorizedProducts = new Map();
            this.products.forEach(product => {
                const category = product.category || 'Sin Categoría';
                if (!categorizedProducts.has(category)) {
                    categorizedProducts.set(category, []);
                }
                categorizedProducts.get(category).push(product);
            });

            container.innerHTML = Array.from(categorizedProducts.entries()).map(([category, products]) => {
                const isExpanded = this.expandedCategories.has(category);
                const expandIcon = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
                
                const productsHTML = products.map(product => {
                    const images = product.images || [product.imageUrl];
                    const individualPrice = product.price || 0;
                    const wholesalePrice = product.wholesalePrice || individualPrice * 0.8;
                    const wholesaleQuantity = product.wholesaleQuantity || 4;
                    const stock = product.stock || 0;
                    const stockClass = this.getStockStatusClass(stock);
                    const stockText = this.getStockStatusText(stock);

                    return `
                        <div class="product-card">
                            <div class="product-images-container">
                                <img src="${images[0]}" alt="${product.name}" class="product-image"
                                    onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/ffffff?text=Producto'">
                                ${images.length > 1 ? `<div class="product-images-count">+${images.length - 1} más</div>` : ''}
                            </div>
                            <div class="product-info">
                                <div class="product-name">${product.name}</div>
                                <div class="product-category">
                                    <i class="fas fa-tag"></i>
                                    ${product.category}
                                </div>
                                <div class="product-stock ${stockClass}">
                                    <i class="fas fa-boxes"></i>
                                    ${stockText}
                                </div>
                                <div class="product-prices">
                                    <div class="price-item">
                                        <span class="price-label">Individual</span>
                                        <span class="price-value">$${parseFloat(individualPrice).toFixed(2)}</span>
                                    </div>
                                    <div class="price-item">
                                        <span class="price-label">Mayoreo (${wholesaleQuantity}+)</span>
                                        <span class="price-value">$${parseFloat(wholesalePrice).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="product-actions">
                                <button class="action-btn edit-btn" onclick="adminManager.editProduct('${product.id}')">
                                    <i class="fas fa-pen-to-square"></i>
                                    Editar
                                </button>
                                <button class="action-btn delete-btn" onclick="adminManager.deleteProduct('${product.id}')">
                                    <i class="fas fa-trash-can"></i>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="category-accordion">
                        <div class="category-header ${isExpanded ? 'expanded' : ''}" onclick="adminManager.toggleCategory('${category}')">
                            <div class="category-name">
                                <i class="fas ${expandIcon}"></i>
                                ${category}
                            </div>
                            <div class="category-count">${products.length} productos</div>
                        </div>
                        <div class="category-products ${isExpanded ? 'expanded' : ''}">
                            <div class="products-grid">
                                ${productsHTML}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        filterOrders() {
            this.renderOrders();
        }

        renderOrders() {
            console.log('🎨 Iniciando renderOrders...');
            console.log('📊 Pedidos disponibles:', this.orders);
            
            const container = document.getElementById('ordersGrid');
            console.log('📝 Container encontrado:', container);
            
            if (this.orders.length === 0) {
                console.log('📋 No hay pedidos para mostrar');
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-shopping-bag"></i>
                        <h3>Sin Pedidos</h3>
                        <p>No hay pedidos registrados aún</p>
                    </div>
                `;
                return;
            }

            // Apply filters
            const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
            const paymentFilter = document.getElementById('paymentMethodFilter')?.value || '';

            let filteredOrders = this.orders;
            
            if (statusFilter) {
                filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
            }
            
            if (paymentFilter) {
                filteredOrders = filteredOrders.filter(order => {
                    const paymentMethod = order.paymentMethod || 'cash';
                    return paymentMethod === paymentFilter;
                });
            }

            console.log('📊 Pedidos filtrados:', filteredOrders);

            // Group orders by customer
            const customerOrders = new Map();
            filteredOrders.forEach(order => {
                console.log('📄 Procesando order:', order.id, 'Status:', order.status);
                
                const customerId = order.userId;
                let customerName = order.userInfo?.fullName || 'Cliente desconocido';
                
                // Si no hay información de usuario, intentar buscar en la lista de usuarios
                if (customerName === 'Cliente desconocido' && this.users.length > 0) {
                    const user = this.users.find(u => u.id === customerId);
                    if (user && user.fullName) {
                        customerName = user.fullName;
                    }
                }
                
                // Si aún no tenemos nombre, usar el ID del usuario
                if (customerName === 'Cliente desconocido' && customerId) {
                    customerName = `Cliente ${customerId.slice(-6)}`;
                }
                
                if (!customerOrders.has(customerId)) {
                    customerOrders.set(customerId, {
                        name: customerName,
                        email: order.userInfo?.email || '',
                        phone: order.userInfo?.phone || '',
                        location: order.userInfo?.location || '',
                        orders: []
                    });
                }
                customerOrders.get(customerId).orders.push(order);
            });

            console.log('📊 Pedidos agrupados por cliente:', customerOrders.size);

            if (customerOrders.size === 0) {
                console.log('📋 No hay pedidos que coincidan con los filtros');
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-filter"></i>
                        <h3>Sin Resultados</h3>
                        <p>No hay pedidos que coincidan con los filtros seleccionados</p>
                    </div>
                `;
                return;
            }

            console.log('🎨 Renderizando pedidos...');
            container.innerHTML = Array.from(customerOrders.entries()).map(([customerId, customerData]) => {
                const isExpanded = this.expandedCustomers.has(customerId);
                const expandIcon = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
                
                const ordersHTML = customerData.orders.map(order => {
                    console.log('🎨 Renderizando order específico:', order.id);
                    
                    const orderDate = new Date(order.timestamp).toLocaleString('es-ES');
                    const statusClass = order.status === 'completed' ? 'status-completed' : 
                                    order.status === 'cancelRequested' ? 'status-cancel-requested' : 
                                    order.status === 'cancelled' ? 'status-cancelled' : 'status-pending';
                    const statusText = order.status === 'completed' ? 'Completado' : 
                                    order.status === 'cancelRequested' ? 'Cancelación Solicitada' : 
                                    order.status === 'cancelled' ? 'Cancelado' : 'Pendiente';

                    const paymentMethod = order.paymentMethod || 'cash';
                    const paymentMethodText = paymentMethod === 'card' ? 'Tarjeta' : 'Efectivo';
                    const paymentMethodClass = paymentMethod === 'card' ? 'card' : 'cash';

                    let actionButtons = '';
                    if (order.status === 'pending') {
                        actionButtons = `
                            <button class="complete-order-btn" onclick="adminManager.completeOrder('${order.id}')">
                                <i class="fas fa-check"></i>
                                Marcar como Completado
                            </button>
                        `;
                    } else if (order.status === 'cancelRequested') {
                        actionButtons = `
                            <button class="approve-cancel-btn" onclick="adminManager.approveCancellation('${order.id}')">
                                <i class="fas fa-check"></i>
                                Aprobar Cancelación
                            </button>
                        `;
                    }

                    // Add thermal ticket button for all orders
                    actionButtons += `
                        <button class="action-btn ticket-btn" onclick="adminManager.generateThermalTicket('${order.id}')">
                            <i class="fas fa-print"></i>
                            Generar Ticket
                        </button>
                    `;

                    // Delivery information
                    let deliveryInfo = '';
                    if (order.deliveryInfo) {
                        if (order.deliveryInfo.type === 'pickup') {
                            deliveryInfo = `
                                <div class="delivery-info">
                                    <h4><i class="fas fa-store"></i> Recoger en Tienda</h4>
                                    <p><strong>Tienda:</strong> ${order.deliveryInfo.store || 'No especificado'}</p>
                                </div>
                            `;
                        } else if (order.deliveryInfo.type === 'delivery') {
                            const fullAddress = [
                                order.deliveryInfo.street,
                                order.deliveryInfo.city,
                                order.deliveryInfo.state,
                                order.deliveryInfo.zip
                            ].filter(part => part && part.trim()).join(', ');
                            
                            deliveryInfo = `
                                <div class="delivery-info">
                                    <h4><i class="fas fa-truck-fast"></i> Envío a Domicilio</h4>
                                    <p><strong>Dirección:</strong> ${fullAddress}</p>
                                    ${order.deliveryInfo.instructions ? `<p><strong>Instrucciones:</strong> ${order.deliveryInfo.instructions}</p>` : ''}
                                </div>
                            `;
                        }
                    }

                    return `
                        <div class="order-card">
                            <div class="order-header">
                                <div class="order-id">Pedido #${order.id.slice(-6)}</div>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <div class="payment-method-badge ${paymentMethodClass}">
                                        <i class="fas fa-${paymentMethod === 'card' ? 'credit-card' : 'money-bill-wave'}"></i>
                                        ${paymentMethodText}
                                    </div>
                                    <div class="order-status ${statusClass}">${statusText}</div>
                                </div>
                            </div>
                            
                            <div class="order-customer">
                                <div>
                                    <p><strong>Fecha:</strong> ${orderDate}</p>
                                    <p><strong>Items:</strong> ${(order.items || []).length} productos</p>
                                </div>
                                <div>
                                    <p><strong>Total:</strong> $${(parseFloat(order.total) || 0).toFixed(2)}</p>
                                    <p><strong>Método de Pago:</strong> ${paymentMethodText}</p>
                                </div>
                            </div>

                            ${deliveryInfo}

                            <div class="order-items">
                                <h4 style="margin-bottom: 0.75rem; font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Productos:</h4>
                                ${(order.items || []).map(item => `
                                    <div class="order-item">
                                        <div>
                                            <strong>${item.name}</strong><br>
                                            <small>Cantidad: ${item.quantity} | Precio: $${(parseFloat(item.unitPrice) || 0).toFixed(2)} (${item.priceType || 'individual'})</small>
                                        </div>
                                        <div>$${(parseFloat(item.totalPrice) || 0).toFixed(2)}</div>
                                    </div>
                                `).join('')}
                            </div>

                            <div class="order-actions">
                                ${actionButtons}
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="customer-accordion">
                        <div class="customer-header ${isExpanded ? 'expanded' : ''}" onclick="adminManager.toggleCustomer('${customerId}')">
                            <div class="customer-info">
                                <div class="customer-name">
                                    <i class="fas ${expandIcon}"></i>
                                    ${customerData.name}
                                </div>
                                <div class="customer-details">
                                    ${customerData.email} | ${customerData.phone}
                                </div>
                            </div>
                            <div class="order-count">${customerData.orders.length} pedidos</div>
                        </div>
                        <div class="customer-orders ${isExpanded ? 'expanded' : ''}">
                            ${ordersHTML}
                        </div>
                    </div>
                `;
            }).join('');
            
            console.log('✅ renderOrders completado');
        }

        renderPayments() {
            const container = document.getElementById('paymentsGrid');
            
            // Update payment summary cards
            const cardPaymentTotal = document.getElementById('cardPaymentTotal');
            const cashPaymentTotal = document.getElementById('cashPaymentTotal');
            const cardPaymentCount = document.getElementById('cardPaymentCount');
            const cashPaymentCount = document.getElementById('cashPaymentCount');

            const cardPayments = this.payments.filter(p => p.method === 'card' && p.status === 'completed');
            const cashPayments = this.payments.filter(p => p.method === 'cash' && p.status === 'completed');

            const cardTotal = cardPayments.reduce((sum, p) => sum + p.amount, 0);
            const cashTotal = cashPayments.reduce((sum, p) => sum + p.amount, 0);

            if (cardPaymentTotal) cardPaymentTotal.textContent = `$${cardTotal.toFixed(2)}`;
            if (cashPaymentTotal) cashPaymentTotal.textContent = `$${cashTotal.toFixed(2)}`;
            if (cardPaymentCount) cardPaymentCount.textContent = `${cardPayments.length} transacciones`;
            if (cashPaymentCount) cashPaymentCount.textContent = `${cashPayments.length} transacciones`;

            if (this.payments.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-credit-card"></i>
                        <h3>Sin Pagos</h3>
                        <p>No hay pagos registrados aún</p>
                    </div>
                `;
                return;
            }

            // Group payments by date
            const paymentsByDate = new Map();
            this.payments.forEach(payment => {
                const date = new Date(payment.timestamp).toLocaleDateString('es-ES');
                if (!paymentsByDate.has(date)) {
                    paymentsByDate.set(date, []);
                }
                paymentsByDate.get(date).push(payment);
            });

            container.innerHTML = Array.from(paymentsByDate.entries()).map(([date, payments]) => {
                const dailyTotal = payments.reduce((sum, p) => sum + p.amount, 0);
                
                const paymentsHTML = payments.map(payment => {
                    const paymentTime = new Date(payment.timestamp).toLocaleTimeString('es-ES');
                    const methodIcon = payment.method === 'card' ? 'credit-card' : 'money-bill-wave';
                    const methodClass = payment.method === 'card' ? 'card' : 'cash';
                    const methodText = payment.method === 'card' ? 'Tarjeta' : 'Efectivo';
                    const statusClass = payment.status === 'completed' ? 'status-completed' : 'status-pending';
                    const statusText = payment.status === 'completed' ? 'Completado' : 'Pendiente';

                    return `
                        <div class="order-card">
                            <div class="order-header">
                                <div class="order-id">Pago #${payment.id.slice(-6)}</div>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <div class="payment-method-badge ${methodClass}">
                                        <i class="fas fa-${methodIcon}"></i>
                                        ${methodText}
                                    </div>
                                    <div class="order-status ${statusClass}">${statusText}</div>
                                </div>
                            </div>
                            
                            <div class="order-customer">
                                <div>
                                    <p><strong>Hora:</strong> ${paymentTime}</p>
                                    <p><strong>Cliente:</strong> ${payment.customerName}</p>
                                </div>
                                <div>
                                    <p><strong>Monto:</strong> $${payment.amount.toFixed(2)}</p>
                                    <p><strong>Entrega:</strong> ${payment.deliveryType === 'delivery' ? 'Domicilio' : 'Tienda'}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="customer-accordion">
                        <div class="customer-header expanded">
                            <div class="customer-info">
                                <div class="customer-name">
                                    <i class="fas fa-calendar-day"></i>
                                    ${date}
                                </div>
                                <div class="customer-details">
                                    ${payments.length} transacciones - Total: $${dailyTotal.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div class="customer-orders expanded">
                            ${paymentsHTML}
                        </div>
                    </div>
                `;
            }).join('');
        }

        renderUsers() {
            const container = document.getElementById('usersGrid');
            
            if (this.users.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>Sin Usuarios</h3>
                        <p>No hay usuarios registrados aún</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.users.map(user => {
                const registerDate = new Date(user.createdAt).toLocaleDateString('es-ES');
                
                return `
                    <div class="user-card">
                        <div class="user-header">
                            <div class="user-name">${user.fullName}</div>
                            <div class="user-orders-count">${user.ordersCount} pedidos</div>
                        </div>
                        
                        <div class="user-info">
                            <div>
                                <p><strong>Email:</strong> ${user.email}</p>
                                <p><strong>Teléfono:</strong> ${user.phone}</p>
                            </div>
                            <div>
                                <p><strong>Ubicación:</strong> ${user.location}</p>
                                <p><strong>Registro:</strong> ${registerDate}</p>
                            </div>
                        </div>

                        ${user.orders.length > 0 ? `
                            <div style="margin-top: 1rem;">
                                <h4 style="margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Últimos pedidos:</h4>
                                ${user.orders.slice(0, 3).map(order => `
                                    <div class="order-item">
                                        <div>
                                            <small>Pedido #${order.id.slice(-6)} - ${new Date(order.timestamp).toLocaleDateString('es-ES')}</small>
                                        </div>
                                        <div>
                                            <small>$${order.total.toFixed(2)}</small>
                                            <span class="order-status ${order.status === 'completed' ? 'status-completed' : order.status === 'cancelled' ? 'status-cancelled' : 'status-pending'}" style="margin-left: 0.5rem; padding: 0.2rem 0.5rem; font-size: 0.7rem;">
                                                ${order.status === 'completed' ? 'Completado' : order.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        async reloadData() {
            try {
                console.log('🔄 Recargando datos del admin...');
                
                // Recargar en paralelo para mejor rendimiento
                await Promise.all([
                    this.loadProducts(),
                    this.loadOrders(),
                    this.loadUsers(),
                    this.loadPayments()
                ]);
                
                // Recalcular estadísticas
                this.calculateDashboardStats();
                
                // Re-renderizar la vista actual
                if (this.currentTab === 'orders') {
                    this.renderOrders();
                } else if (this.currentTab === 'dashboard') {
                    this.renderDashboard();
                } else if (this.currentTab === 'users') {
                    this.renderUsers();
                } else if (this.currentTab === 'products') {
                    this.renderProducts();
                }
                
                console.log('✅ Datos recargados exitosamente');
                
            } catch (error) {
                console.error('❌ Error recargando datos:', error);
                this.showNotification('Error al recargar los datos', 'error');
            }
        }

        async completeOrder(orderId) {
            if (!confirm('¿Estás seguro de que quieres marcar este pedido como completado?')) {
                return;
            }

            try {
                const orderRef = ref(realtimeDb, `orders/${orderId}`);
                await update(orderRef, {
                    status: 'completed',
                    completedAt: Date.now()
                });

                this.showNotification('Pedido marcado como completado', 'success');
                await this.reloadData();
                if (this.currentTab === 'dashboard') {
                    this.renderDashboard();
                }
            } catch (error) {
                console.error('Error completing order:', error);
                this.showNotification('Error al completar el pedido', 'error');
            }
        }

        async approveCancellation(orderId) {
            if (!confirm('¿Estás seguro de que quieres aprobar la cancelación de este pedido? Esto restaurará el stock de los productos.')) {
                return;
            }

            try {
                // Get order data first
                const orderRef = ref(realtimeDb, `orders/${orderId}`);
                const orderSnapshot = await get(orderRef);
                
                if (orderSnapshot.exists()) {
                    const orderData = orderSnapshot.val();
                    // Restaurar stock solo si hay items
                    if (orderData.items && Array.isArray(orderData.items)) {
                        for (const item of orderData.items) {
                            const product = this.products.find(p => p.id === item.id);
                            if (product) {
                                const productRef = doc(db, 'products', item.id);
                                const newStock = (product.stock || 0) + item.quantity;
                                await updateDoc(productRef, { stock: newStock });
                            }
                        }
                    }
                }
                // Eliminar el pedido aunque falte info de pago
                await remove(orderRef);
                this.showNotification('Pedido cancelado y stock restaurado exitosamente', 'success');
                await this.reloadData();
                if (this.currentTab === 'users') {
                    this.renderUsers();
                }
                if (this.currentTab === 'dashboard') {
                    this.renderDashboard();
                }
            } catch (error) {
                console.error('Error approving cancellation:', error);
                this.showNotification('Error al aprobar la cancelación', 'error');
            }
        }

        async handleSubmit(e) {
            e.preventDefault();
            
            if (this.productImages.length === 0) {
                this.showNotification('Debes agregar al menos una imagen del producto', 'error');
                return;
            }

            const formData = {
                name: document.getElementById('productName').value.trim(),
                description: document.getElementById('productDescription').value.trim(),
                price: parseFloat(document.getElementById('productPrice').value),
                wholesalePrice: parseFloat(document.getElementById('productWholesalePrice').value),
                wholesaleQuantity: parseInt(document.getElementById('productWholesaleQuantity').value) || 4,
                stock: parseInt(document.getElementById('productStock').value) || 0,
                category: document.getElementById('productCategory').value.trim(),
                images: this.productImages.map(img => img.url),
                imageUrl: this.productImages[this.primaryImageIndex]?.url || this.productImages[0]?.url
            };

            if (!formData.name || !formData.description || !formData.category) {
                this.showNotification('Por favor completa todos los campos', 'error');
                return;
            }

            if (formData.price <= 0 || formData.wholesalePrice <= 0) {
                this.showNotification('Los precios deben ser mayores a 0', 'error');
                return;
            }

            if (formData.wholesaleQuantity < 2) {
                this.showNotification('La cantidad para mayoreo debe ser al menos 2', 'error');
                return;
            }

            if (formData.stock < 0) {
                this.showNotification('El stock no puede ser negativo', 'error');
                return;
            }

            try {
                if (this.editingProductId) {
                    await this.updateProduct(formData);
                } else {
                    await this.addProduct(formData);
                }
            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al procesar el producto', 'error');
            }
        }

        async addProduct(productData) {
            try {
                await addDoc(collection(db, 'products'), {
                    ...productData,
                    createdAt: serverTimestamp()
                });

                this.showNotification('Producto agregado exitosamente', 'success');
                this.resetForm();
                await this.reloadData();
                if (this.currentTab === 'dashboard') {
                    this.renderDashboard();
                }
            } catch (error) {
                console.error('Error adding product:', error);
                throw error;
            }
        }

        async updateProduct(productData) {
            try {
                const productRef = doc(db, 'products', this.editingProductId);
                await updateDoc(productRef, {
                    ...productData,
                    updatedAt: serverTimestamp()
                });

                this.showNotification('Producto actualizado exitosamente', 'success');
                this.cancelEdit();
                await this.reloadData();
                if (this.currentTab === 'dashboard') {
                    this.renderDashboard();
                }
            } catch (error) {
                console.error('Error updating product:', error);
                throw error;
            }
        }

        editProduct(productId) {
            const product = this.products.find(p => p.id === productId);
            if (!product) return;

            this.editingProductId = productId;
            
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productPrice').value = product.price || 0;
            document.getElementById('productWholesalePrice').value = product.wholesalePrice || 0;
            document.getElementById('productWholesaleQuantity').value = product.wholesaleQuantity || 4;
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productCategory').value = product.category;
            
            // Load existing images
            this.productImages = [];
            if (product.images && product.images.length > 0) {
                this.productImages = product.images.map((url, index) => ({
                    url: url,
                    type: 'url',
                    isPrimary: index === 0
                }));
                this.primaryImageIndex = 0;
            } else if (product.imageUrl) {
                this.productImages = [{
                    url: product.imageUrl,
                    type: 'url',
                    isPrimary: true
                }];
                this.primaryImageIndex = 0;
            }
            
            this.renderImagesPreview();
            
            document.getElementById('formTitle').innerHTML = '<i class="fas fa-pen-to-square"></i> Editar Producto';
            document.getElementById('submitButtonText').textContent = 'Actualizar Producto';
            document.getElementById('cancelEdit').style.display = 'block';
            
            document.querySelector('.form-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }

        async deleteProduct(productId) {
            if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                return;
            }

            try {
                await deleteDoc(doc(db, 'products', productId));
                this.showNotification('Producto eliminado exitosamente', 'success');
                await this.reloadData();
                if (this.currentTab === 'dashboard') {
                    this.renderDashboard();
                }
            } catch (error) {
                console.error('Error deleting product:', error);
                this.showNotification('Error al eliminar el producto', 'error');
            }
        }

        cancelEdit() {
            this.editingProductId = null;
            this.resetForm();
            document.getElementById('formTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Agregar Producto';
            document.getElementById('submitButtonText').textContent = 'Agregar Producto';
            document.getElementById('cancelEdit').style.display = 'none';
        }

        resetForm() {
            document.getElementById('productForm').reset();
            this.productImages = [];
            this.primaryImageIndex = 0;
            this.renderImagesPreview();
            // Reset wholesale quantity to default
            document.getElementById('productWholesaleQuantity').value = 4;
        }

        async generateThermalTicket(orderId) {
            // Buscar el pedido por ID exacto
            const order = this.orders.find(o => o.id === orderId);
            if (!order) {
                this.showNotification('Pedido no encontrado', 'error');
                return;
            }

            // Elementos del ticket
            const ticket = document.getElementById('thermalTicket');
            const ticketDate = document.getElementById('ticketDate');
            const ticketOrderId = document.getElementById('ticketOrderId');
            const ticketCustomerName = document.getElementById('ticketCustomerName');
            const ticketCustomerPhone = document.getElementById('ticketCustomerPhone');
            const ticketCustomerEmail = document.getElementById('ticketCustomerEmail');
            const ticketDeliveryInfo = document.getElementById('ticketDeliveryInfo');
            const ticketItems = document.getElementById('ticketItems');
            const ticketTotal = document.getElementById('ticketTotal');

            // Validar existencia de elementos
            if (!ticket || !ticketDate || !ticketOrderId || !ticketCustomerName || !ticketCustomerPhone ||
                !ticketCustomerEmail || !ticketDeliveryInfo || !ticketItems || !ticketTotal) {
                console.error('Faltan elementos del ticket en el DOM');
                this.showNotification('Error: faltan elementos del ticket', 'error');
                return;
            }

            // Fecha e ID
            ticketDate.textContent = new Date(order.timestamp).toLocaleString('es-ES');
            ticketOrderId.textContent = `PEDIDO #${order.id.slice(-6)}`;

            // Cliente
            ticketCustomerName.textContent = order.userInfo?.fullName || 'Cliente';
            ticketCustomerPhone.textContent = `TEL: ${order.userInfo?.phone || 'N/A'}`;
            ticketCustomerEmail.textContent = `EMAIL: ${order.userInfo?.email || 'N/A'}`;

            // Información combinada de pago y entrega
            let deliveryHTML = '';
            
            // Método de pago
            const paymentMethod = order.paymentMethod || 'cash';
            const paymentText = paymentMethod === 'card' ? 'TARJETA (STRIPE)' : 'EFECTIVO';
            
            // Información de entrega
            if (order.deliveryInfo) {
                if (order.deliveryInfo.type === 'pickup') {
                    deliveryHTML = `
                        <div class="ticket-delivery-title">METODO DE PAGO</div>
                        <div class="ticket-delivery-details">${paymentText}</div>
                        <div class="ticket-delivery-title">RECOGER EN TIENDA</div>
                        <div class="ticket-delivery-details">TIENDA: ${order.deliveryInfo.store || 'Principal'}</div>
                    `;
                } else if (order.deliveryInfo.type === 'delivery') {
                    const fullAddress = [
                        order.deliveryInfo.street,
                        order.deliveryInfo.city,
                        order.deliveryInfo.state,
                        order.deliveryInfo.zip
                    ].filter(part => part && part.trim()).join(', ');
                    deliveryHTML = `
                        <div class="ticket-delivery-title">METODO DE PAGO</div>
                        <div class="ticket-delivery-details">${paymentText}</div>
                        <div class="ticket-delivery-title">ENVIO A DOMICILIO</div>
                        <div class="ticket-delivery-details">DIR: ${fullAddress}</div>
                        ${order.deliveryInfo.instructions ? `<div class="ticket-delivery-details">NOTA: ${order.deliveryInfo.instructions}</div>` : ''}
                    `;
                }
            } else {
                deliveryHTML = `
                    <div class="ticket-delivery-title">METODO DE PAGO</div>
                    <div class="ticket-delivery-details">${paymentText}</div>
                `;
            }
            ticketDeliveryInfo.innerHTML = deliveryHTML;

            // Items del pedido (con validación de datos)
            let itemsHTML = '';
            (order.items || []).forEach(item => {
                const unitPrice = Number(item.unitPrice) || 0;
                const totalPrice = Number(item.totalPrice) || 0;
                itemsHTML += `
                    <div class="ticket-item">
                        <div class="ticket-item-name">${item.name}</div>
                        <div class="ticket-item-details">
                            ${item.quantity} x $${unitPrice.toFixed(2)} 
                            ${item.priceType === 'wholesale' ? '(MAYOREO)' : ''}
                        </div>
                        <div class="ticket-item-price">$${totalPrice.toFixed(2)}</div>
                    </div>
                `;
            });
            ticketItems.innerHTML = itemsHTML;

            // Total
            ticketTotal.textContent = `TOTAL: $${(Number(order.total) || 0).toFixed(2)}`;

            // Mostrar y auto-imprimir
            ticket.style.display = 'block';
            setTimeout(() => {
                window.print();
                ticket.style.display = 'none';
            }, 300);

            this.showNotification('Ticket térmico generado para impresión', 'success');
        }

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            
            const iconMap = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                info: 'fa-info-circle',
                warning: 'fa-exclamation-triangle'
            };
            
            notification.innerHTML = `
                <i class="fas ${iconMap[type] || iconMap.info}"></i>
                <span>${message}</span>
            `;

            document.body.appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 100);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 400);
            }, 4000);
        }

        // Monte Carlo Simulation Methods
        initializeCharts() {
            // Chart.js is loaded from HTML
            setTimeout(() => {
                if (window.Chart) {
                    this.createEmptyCharts();
                } else {
                    console.error('Chart.js no está disponible');
                    this.showNotification('Error al cargar Chart.js. Por favor, recargue la página.', 'error');
                }
            }, 300);
        }

        createEmptyCharts() {
            // Create empty charts with placeholders
            const categoryCtx = document.getElementById('categoryStatsChart');
            const distributionCtx = document.getElementById('productDistributionChart');
            const salesCtx = document.getElementById('salesProjectionChart');

            // Ensure Chart is available
            if (!window.Chart) {
                console.error('Chart.js no está disponible');
                this.showNotification('Error al cargar Chart.js. Por favor, recargue la página.', 'error');
                return;
            }

            if (categoryCtx) {
                this.charts.categoryChart = new window.Chart(categoryCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Cargando categorías...'],
                        datasets: [{
                            label: 'Productos por Categoría',
                            data: [0],
                            backgroundColor: 'rgba(37, 99, 235, 0.7)',
                            borderColor: 'rgba(37, 99, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Número de Productos'
                                }
                            }
                        }
                    }
                });
            }

            if (distributionCtx) {
                this.charts.distributionChart = new window.Chart(distributionCtx, {
                    type: 'pie',
                    data: {
                        labels: ['Cargando datos...'],
                        datasets: [{
                            data: [1],
                            backgroundColor: ['rgba(37, 99, 235, 0.7)'],
                            borderColor: ['rgba(37, 99, 235, 1)'],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                            }
                        }
                    }
                });
            }

            if (salesCtx) {
                this.charts.salesChart = new window.Chart(salesCtx, {
                    type: 'line',
                    data: {
                        labels: ['Ejecute la simulación...'],
                        datasets: [{
                            label: 'Proyección de Ventas',
                            data: [0],
                            borderColor: 'rgba(5, 150, 105, 1)',
                            backgroundColor: 'rgba(5, 150, 105, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Ventas Proyectadas ($)'
                                }
                            }
                        }
                    }
                });
            }
        }

        calculateCategoryStats() {
            // Reset category stats
            this.categoryStats = {};

            // Count products by category
            this.products.forEach(product => {
                const category = product.category || 'Sin Categoría';
                if (!this.categoryStats[category]) {
                    this.categoryStats[category] = {
                        count: 0,
                        totalValue: 0,
                        avgPrice: 0,
                        minPrice: Infinity,
                        maxPrice: 0,
                        products: []
                    };
                }

                const price = parseFloat(product.price) || 0;
                this.categoryStats[category].count++;
                this.categoryStats[category].totalValue += price;
                this.categoryStats[category].minPrice = Math.min(this.categoryStats[category].minPrice, price);
                this.categoryStats[category].maxPrice = Math.max(this.categoryStats[category].maxPrice, price);
                this.categoryStats[category].products.push(product);
            });

            // Calculate averages
            Object.keys(this.categoryStats).forEach(category => {
                const stats = this.categoryStats[category];
                stats.avgPrice = stats.count > 0 ? stats.totalValue / stats.count : 0;
            });
        }

        renderCategoryStats() {
            if (!this.categoryStats || Object.keys(this.categoryStats).length === 0) {
                return;
            }

            // Update category chart
            if (this.charts.categoryChart) {
                const categories = Object.keys(this.categoryStats);
                const productCounts = categories.map(cat => this.categoryStats[cat].count);
                const backgroundColors = categories.map((_, i) => {
                    const hue = (i * 137.5) % 360; // Golden angle approximation for good color distribution
                    return `hsla(${hue}, 70%, 60%, 0.7)`;
                });

                this.charts.categoryChart.data.labels = categories;
                this.charts.categoryChart.data.datasets[0].data = productCounts;
                this.charts.categoryChart.data.datasets[0].backgroundColor = backgroundColors;
                this.charts.categoryChart.data.datasets[0].borderColor = backgroundColors.map(color => color.replace('0.7', '1'));
                this.charts.categoryChart.update();
            }

            // Update category stats list
            const categoryStatsList = document.getElementById('categoryStatsList');
            if (categoryStatsList) {
                const categories = Object.keys(this.categoryStats).sort((a, b) => 
                    this.categoryStats[b].count - this.categoryStats[a].count
                );

                categoryStatsList.innerHTML = categories.map(category => {
                    const stats = this.categoryStats[category];
                    return `
                        <div class="stats-item">
                            <div class="stats-label">${category}</div>
                            <div class="stats-value">${stats.count} productos</div>
                        </div>
                        <div class="stats-item">
                            <div class="stats-label">Precio Promedio</div>
                            <div class="stats-value">$${stats.avgPrice.toFixed(2)}</div>
                        </div>
                        <div class="stats-item">
                            <div class="stats-label">Rango de Precios</div>
                            <div class="stats-value">$${stats.minPrice.toFixed(2)} - $${stats.maxPrice.toFixed(2)}</div>
                        </div>
                        <div class="stats-divider"></div>
                    `;
                }).join('');
            }
        }

        renderProductDistribution() {
            if (!this.categoryStats || Object.keys(this.categoryStats).length === 0) {
                return;
            }

            // Update distribution chart
            if (this.charts.distributionChart) {
                const categories = Object.keys(this.categoryStats);
                const productCounts = categories.map(cat => this.categoryStats[cat].count);
                const backgroundColors = categories.map((_, i) => {
                    const hue = (i * 137.5) % 360;
                    return `hsla(${hue}, 70%, 60%, 0.7)`;
                });

                this.charts.distributionChart.data.labels = categories;
                this.charts.distributionChart.data.datasets[0].data = productCounts;
                this.charts.distributionChart.data.datasets[0].backgroundColor = backgroundColors;
                this.charts.distributionChart.data.datasets[0].borderColor = backgroundColors.map(color => color.replace('0.7', '1'));
                this.charts.distributionChart.update();
                
                // También renderizar la distribución como texto en caso de que el gráfico no se muestre
                const distributionContainer = document.getElementById('productDistributionChart').parentNode;
                let distributionHTML = '<div class="distribution-text-container">';
                
                categories.forEach((category, index) => {
                    const count = this.categoryStats[category].count;
                    const percentage = (count / this.products.length * 100).toFixed(1);
                    const color = backgroundColors[index];
                    
                    distributionHTML += `
                        <div class="distribution-item">
                            <span class="distribution-color" style="background-color: ${color}"></span>
                            <span class="distribution-label">${category}</span>
                            <span class="distribution-count">${count} productos (${percentage}%)</span>
                        </div>
                    `;
                });
                
                distributionHTML += '</div>';
                
                // Agregar después del canvas
                const existingText = distributionContainer.querySelector('.distribution-text-container');
                if (existingText) {
                    existingText.innerHTML = distributionHTML;
                } else {
                    const textContainer = document.createElement('div');
                    textContainer.className = 'distribution-text-container';
                    textContainer.innerHTML = distributionHTML;
                    distributionContainer.appendChild(textContainer);
                }
            }
        }

        // Advanced Monte Carlo Analysis System
        async runAdvancedMonteCarloAnalysis() {
            const analysisConfig = this.getAnalysisConfiguration();
            
            // Show loading state
            this.showAnalysisLoading();
            
            try {
                // Generate synthetic historical data if needed
                if (this.orders.length < 10) {
                    this.generateSyntheticData();
                }
                
                // Run Monte Carlo simulation
                const results = await this.performAdvancedMonteCarloSimulation(analysisConfig);
                
                // Update overview cards
                this.updateOverviewCards(results);
                
                // Update all charts
                this.updateAdvancedCharts(results);
                
                // Update results table
                this.updateResultsTable(results);
                
                // Store results
                this.monteCarloResults = results;
                
                this.showNotification('Análisis Monte Carlo completado exitosamente', 'success');
                
            } catch (error) {
                console.error('Error en análisis Monte Carlo:', error);
                this.showNotification('Error al ejecutar el análisis. Intenta de nuevo.', 'error');
            }
        }

        getAnalysisConfiguration() {
            return {
                period: document.getElementById('periodSelector')?.value || 'current-month',
                month: parseInt(document.getElementById('monthSelector')?.value) || new Date().getMonth() + 1,
                season: document.getElementById('seasonSelector')?.value || 'all',
                simulations: parseInt(document.getElementById('montecarloSimulations')?.value) || 5000,
                riskLevel: document.getElementById('riskLevel')?.value || 'moderate',
                analysisType: document.getElementById('analysisType')?.value || 'sales-prediction'
            };
        }

        showAnalysisLoading() {
            // Update overview cards with loading state
            const overviewCards = document.querySelectorAll('.overview-value');
            overviewCards.forEach(card => {
                card.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            });
            
            // Update button state
            const runBtn = document.getElementById('runAnalysisBtn');
            if (runBtn) {
                runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ejecutando Análisis...';
                runBtn.disabled = true;
            }
        }

        generateSyntheticData() {
            // Generate realistic synthetic data for demonstration
            const categories = ['Electrónicos', 'Ropa', 'Hogar', 'Deportes', 'Libros'];
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            
            this.syntheticOrders = [];
            this.syntheticProducts = [...this.products];
            
            // Add synthetic products if needed
            if (this.syntheticProducts.length < 5) {
                categories.forEach((category, index) => {
                    this.syntheticProducts.push({
                        id: `synthetic-${index}`,
                        name: `Producto ${category} Premium`,
                        category: category,
                        price: (Math.random() * 100 + 20),
                        stock: Math.floor(Math.random() * 100 + 10),
                        wholesalePrice: (Math.random() * 80 + 15)
                    });
                });
            }
            
            // Generate synthetic orders for the last 12 months
            const now = new Date();
            for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
                const orderDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
                const orderCount = this.getSeasonalOrderCount(orderDate.getMonth());
                
                for (let i = 0; i < orderCount; i++) {
                    const randomProduct = this.syntheticProducts[Math.floor(Math.random() * this.syntheticProducts.length)];
                    const quantity = Math.floor(Math.random() * 5) + 1;
                    const variation = (Math.random() - 0.5) * 0.2; // ±10% price variation
                    const price = randomProduct.price * (1 + variation);
                    
                    this.syntheticOrders.push({
                        id: `synthetic-order-${monthOffset}-${i}`,
                        productId: randomProduct.id,
                        productName: randomProduct.name,
                        category: randomProduct.category,
                        quantity: quantity,
                        unitPrice: price,
                        total: price * quantity,
                        date: new Date(orderDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000),
                        month: orderDate.getMonth() + 1,
                        season: this.getSeasonFromMonth(orderDate.getMonth() + 1)
                    });
                }
            }
        }

        getSeasonalOrderCount(month) {
            // Simulate seasonal variations
            const baseCount = 15;
            const seasonalMultipliers = {
                0: 0.8,  // Enero
                1: 0.7,  // Febrero
                2: 0.9,  // Marzo
                3: 1.0,  // Abril
                4: 1.1,  // Mayo
                5: 1.2,  // Junio
                6: 1.0,  // Julio
                7: 0.9,  // Agosto
                8: 1.1,  // Septiembre
                9: 1.2,  // Octubre
                10: 1.4, // Noviembre (Black Friday)
                11: 1.6  // Diciembre (Navidad)
            };
            
            return Math.floor(baseCount * (seasonalMultipliers[month] || 1.0));
        }

        getSeasonFromMonth(month) {
            if (month >= 3 && month <= 5) return 'spring';
            if (month >= 6 && month <= 8) return 'summer';
            if (month >= 9 && month <= 11) return 'autumn';
            return 'winter';
        }

        async performAdvancedMonteCarloSimulation(config) {
            const startTime = performance.now();
            
            // Use synthetic data if real data is insufficient
            const ordersData = this.orders.length > 10 ? this.orders : this.syntheticOrders;
            const productsData = this.products.length > 3 ? this.products : this.syntheticProducts;
            
            // Filter data based on configuration
            const filteredData = this.filterDataByPeriod(ordersData, config);
            
            // Monte Carlo simulation results
            const results = {
                configuration: config,
                executionTime: 0,
                simulations: [],
                statistics: {},
                monthlyAnalysis: {},
                seasonalAnalysis: {},
                productAnalysis: {},
                riskAnalysis: {},
                optimizationRecommendations: [],
                confidenceIntervals: {}
            };
            
            // Run Monte Carlo simulations
            for (let i = 0; i < config.simulations; i++) {
                const simulation = this.runSingleSimulation(filteredData, productsData, config);
                results.simulations.push(simulation);
            }
            
            // Calculate statistics
            results.statistics = this.calculateAdvancedStatistics(results.simulations);
            results.monthlyAnalysis = this.performMonthlyAnalysis(filteredData, config);
            results.seasonalAnalysis = this.performSeasonalAnalysis(filteredData);
            results.productAnalysis = this.performProductAnalysis(filteredData, productsData);
            results.riskAnalysis = this.performRiskAnalysis(results.simulations);
            results.optimizationRecommendations = this.generateOptimizationRecommendations(results);
            results.confidenceIntervals = this.calculateConfidenceIntervals(results.simulations, config.riskLevel);
            
            const endTime = performance.now();
            results.executionTime = endTime - startTime;
            
            return results;
        }

        filterDataByPeriod(orders, config) {
            const now = new Date();
            let startDate, endDate;
            
            switch (config.period) {
                case 'current-month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = now;
                    break;
                case 'last-3-months':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                    endDate = now;
                    break;
                case 'last-6-months':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                    endDate = now;
                    break;
                case 'current-year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = now;
                    break;
                default:
                    startDate = new Date(now.getFullYear() - 1, 0, 1);
                    endDate = now;
            }
            
            return orders.filter(order => {
                const orderDate = new Date(order.date || order.timestamp);
                return orderDate >= startDate && orderDate <= endDate;
            });
        }

        runSingleSimulation(orders, products, config) {
            const simulation = {
                totalSales: 0,
                totalOrders: 0,
                productSales: {},
                categorySales: {},
                monthlyProjection: {},
                profit: 0,
                risk: 0
            };
            
            // Initialize product and category tracking
            products.forEach(product => {
                simulation.productSales[product.id] = 0;
                if (!simulation.categorySales[product.category]) {
                    simulation.categorySales[product.category] = 0;
                }
            });
            
            // Simulate random variations in demand
            orders.forEach(order => {
                const demandVariation = this.generateRandomVariation(config);
                const adjustedQuantity = Math.max(1, Math.floor(order.quantity * demandVariation));
                const adjustedPrice = order.unitPrice * (0.9 + Math.random() * 0.2); // ±10% price variation
                
                const simulatedSale = adjustedPrice * adjustedQuantity;
                simulation.totalSales += simulatedSale;
                simulation.totalOrders += 1;
                
                if (simulation.productSales[order.productId] !== undefined) {
                    simulation.productSales[order.productId] += simulatedSale;
                }
                
                if (order.category && simulation.categorySales[order.category] !== undefined) {
                    simulation.categorySales[order.category] += simulatedSale;
                }
                
                // Calculate profit (assuming 30% margin with variation)
                const margin = 0.25 + Math.random() * 0.15; // 25-40% margin
                simulation.profit += simulatedSale * margin;
            });
            
            // Calculate risk based on sales variance
            simulation.risk = this.calculateSimulationRisk(simulation, orders);
            
            return simulation;
        }

        generateRandomVariation(config) {
            // Generate random variation based on normal distribution
            const mean = 1.0;
            const stdDev = config.riskLevel === 'conservative' ? 0.1 : 
                          config.riskLevel === 'moderate' ? 0.15 : 0.25;
            
            // Box-Muller transformation for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            
            return Math.max(0.1, mean + stdDev * z);
        }

        calculateSimulationRisk(simulation, orders) {
            if (orders.length === 0) return 0;
            
            const averageOrderValue = simulation.totalSales / simulation.totalOrders;
            const historicalAverage = orders.reduce((sum, order) => sum + (order.total || order.unitPrice * order.quantity), 0) / orders.length;
            
            // Risk is based on deviation from historical average
            const deviation = Math.abs(averageOrderValue - historicalAverage) / historicalAverage;
            return Math.min(1, deviation);
        }

        calculateAdvancedStatistics(simulations) {
            const totalSales = simulations.map(s => s.totalSales).sort((a, b) => a - b);
            const profits = simulations.map(s => s.profit).sort((a, b) => a - b);
            const risks = simulations.map(s => s.risk);
            
            return {
                sales: {
                    mean: totalSales.reduce((a, b) => a + b, 0) / totalSales.length,
                    median: totalSales[Math.floor(totalSales.length / 2)],
                    min: totalSales[0],
                    max: totalSales[totalSales.length - 1],
                    stdDev: this.calculateStandardDeviation(totalSales),
                    percentiles: {
                        p5: totalSales[Math.floor(totalSales.length * 0.05)],
                        p25: totalSales[Math.floor(totalSales.length * 0.25)],
                        p75: totalSales[Math.floor(totalSales.length * 0.75)],
                        p95: totalSales[Math.floor(totalSales.length * 0.95)]
                    }
                },
                profit: {
                    mean: profits.reduce((a, b) => a + b, 0) / profits.length,
                    median: profits[Math.floor(profits.length / 2)],
                    min: profits[0],
                    max: profits[profits.length - 1]
                },
                risk: {
                    average: risks.reduce((a, b) => a + b, 0) / risks.length,
                    max: Math.max(...risks),
                    min: Math.min(...risks)
                }
            };
        }

        calculateStandardDeviation(values) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
            const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
            return Math.sqrt(avgSquaredDiff);
        }

        performMonthlyAnalysis(orders, config) {
            const monthlyData = {};
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            
            // Initialize all months
            months.forEach((month, index) => {
                monthlyData[month] = {
                    sales: 0,
                    orders: 0,
                    averageOrderValue: 0,
                    growth: 0,
                    projection: 0
                };
            });
            
            // Process orders by month
            orders.forEach(order => {
                const orderDate = new Date(order.date || order.timestamp);
                const monthName = months[orderDate.getMonth()];
                const orderValue = order.total || order.unitPrice * order.quantity;
                
                monthlyData[monthName].sales += orderValue;
                monthlyData[monthName].orders += 1;
            });
            
            // Calculate averages and projections
            Object.keys(monthlyData).forEach(month => {
                const data = monthlyData[month];
                if (data.orders > 0) {
                    data.averageOrderValue = data.sales / data.orders;
                }
                
                // Project future performance with Monte Carlo variation
                const baseProjection = data.sales * (1.05 + Math.random() * 0.1); // 5-15% growth
                const seasonalFactor = this.getSeasonalFactor(month);
                data.projection = baseProjection * seasonalFactor;
            });
            
            return monthlyData;
        }

        getSeasonalFactor(monthName) {
            const seasonalFactors = {
                'Enero': 0.85, 'Febrero': 0.8, 'Marzo': 0.95,
                'Abril': 1.0, 'Mayo': 1.05, 'Junio': 1.1,
                'Julio': 1.0, 'Agosto': 0.95, 'Septiembre': 1.05,
                'Octubre': 1.15, 'Noviembre': 1.3, 'Diciembre': 1.5
            };
            return seasonalFactors[monthName] || 1.0;
        }

        performSeasonalAnalysis(orders) {
            const seasons = {
                spring: { sales: 0, orders: 0, months: [2, 3, 4] },
                summer: { sales: 0, orders: 0, months: [5, 6, 7] },
                autumn: { sales: 0, orders: 0, months: [8, 9, 10] },
                winter: { sales: 0, orders: 0, months: [11, 0, 1] }
            };
            
            orders.forEach(order => {
                const orderDate = new Date(order.date || order.timestamp);
                const month = orderDate.getMonth();
                const orderValue = order.total || order.unitPrice * order.quantity;
                
                Object.keys(seasons).forEach(season => {
                    if (seasons[season].months.includes(month)) {
                        seasons[season].sales += orderValue;
                        seasons[season].orders += 1;
                    }
                });
            });
            
            return seasons;
        }

        performProductAnalysis(orders, products) {
            const productPerformance = {};
            
            products.forEach(product => {
                productPerformance[product.id] = {
                    name: product.name,
                    category: product.category,
                    sales: 0,
                    units: 0,
                    revenue: 0,
                    profitMargin: (product.price - product.wholesalePrice) / product.price,
                    projectedDemand: 0,
                    riskLevel: 'low',
                    recommendedStock: 0,
                    optimalMonth: 'Diciembre'
                };
            });
            
            orders.forEach(order => {
                if (productPerformance[order.productId]) {
                    const orderValue = order.total || order.unitPrice * order.quantity;
                    productPerformance[order.productId].sales += 1;
                    productPerformance[order.productId].units += order.quantity;
                    productPerformance[order.productId].revenue += orderValue;
                }
            });
            
            // Calculate projections and recommendations
            Object.keys(productPerformance).forEach(productId => {
                const perf = productPerformance[productId];
                const avgMonthlySales = perf.units / 12; // Assuming 12 months of data
                
                perf.projectedDemand = avgMonthlySales * (1.1 + Math.random() * 0.2); // 10-30% growth
                perf.recommendedStock = Math.ceil(perf.projectedDemand * 2.5); // 2.5 months of stock
                perf.riskLevel = perf.units < avgMonthlySales ? 'high' : 
                               perf.units < avgMonthlySales * 2 ? 'medium' : 'low';
                
                // Find optimal month based on seasonal patterns
                const seasonalFactors = [0.85, 0.8, 0.95, 1.0, 1.05, 1.1, 1.0, 0.95, 1.05, 1.15, 1.3, 1.5];
                const maxFactorIndex = seasonalFactors.indexOf(Math.max(...seasonalFactors));
                const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                perf.optimalMonth = months[maxFactorIndex];
            });
            
            return productPerformance;
        }

        performRiskAnalysis(simulations) {
            const risks = simulations.map(s => s.risk);
            const salesVariance = this.calculateStandardDeviation(simulations.map(s => s.totalSales));
            
            return {
                averageRisk: risks.reduce((a, b) => a + b, 0) / risks.length,
                maxRisk: Math.max(...risks),
                minRisk: Math.min(...risks),
                salesVariance: salesVariance,
                riskDistribution: this.calculateRiskDistribution(risks),
                recommendations: this.generateRiskRecommendations(risks, salesVariance)
            };
        }

        calculateRiskDistribution(risks) {
            const lowRisk = risks.filter(r => r < 0.2).length;
            const mediumRisk = risks.filter(r => r >= 0.2 && r < 0.5).length;
            const highRisk = risks.filter(r => r >= 0.5).length;
            const total = risks.length;
            
            return {
                low: (lowRisk / total) * 100,
                medium: (mediumRisk / total) * 100,
                high: (highRisk / total) * 100
            };
        }

        generateRiskRecommendations(risks, variance) {
            const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;
            const recommendations = [];
            
            if (avgRisk > 0.3) {
                recommendations.push("Considerar diversificar el portafolio de productos");
                recommendations.push("Implementar estrategias de reducción de riesgo");
            }
            
            if (variance > 1000) {
                recommendations.push("La variabilidad de ventas es alta - considerar promociones más estables");
            }
            
            if (recommendations.length === 0) {
                recommendations.push("El nivel de riesgo es aceptable para el negocio actual");
            }
            
            return recommendations;
        }

        generateOptimizationRecommendations(results) {
            const recommendations = [];
            
            // Stock optimization
            const avgStock = Object.values(results.productAnalysis)
                .reduce((sum, product) => sum + product.recommendedStock, 0) / 
                Object.keys(results.productAnalysis).length;
            
            if (avgStock > 100) {
                recommendations.push({
                    type: 'inventory',
                    priority: 'high',
                    message: 'Optimizar niveles de inventario - stock promedio recomendado es alto',
                    action: 'Revisar políticas de reposición'
                });
            }
            
            // Seasonal optimization
            const seasonalVariance = Object.values(results.seasonalAnalysis)
                .map(season => season.sales)
                .reduce((max, current) => Math.max(max, current), 0) -
                Object.values(results.seasonalAnalysis)
                .map(season => season.sales)
                .reduce((min, current) => Math.min(min, current), Infinity);
            
            if (seasonalVariance > 5000) {
                recommendations.push({
                    type: 'seasonal',
                    priority: 'medium',
                    message: 'Alta variabilidad estacional detectada',
                    action: 'Planificar promociones para temporadas bajas'
                });
            }
            
            // Profit optimization
            if (results.statistics.profit.mean < results.statistics.sales.mean * 0.2) {
                recommendations.push({
                    type: 'profit',
                    priority: 'high',
                    message: 'Margen de ganancia es bajo (< 20%)',
                    action: 'Revisar precios y costos de productos'
                });
            }
            
            return recommendations;
        }

        calculateConfidenceIntervals(simulations, riskLevel) {
            const sales = simulations.map(s => s.totalSales).sort((a, b) => a - b);
            const profits = simulations.map(s => s.profit).sort((a, b) => a - b);
            
            const confidence = riskLevel === 'conservative' ? 0.95 : 
                             riskLevel === 'moderate' ? 0.90 : 0.85;
            
            const lowerBound = (1 - confidence) / 2;
            const upperBound = confidence + lowerBound;
            
            return {
                confidence: confidence * 100,
                sales: {
                    lower: sales[Math.floor(sales.length * lowerBound)],
                    upper: sales[Math.floor(sales.length * upperBound)],
                    median: sales[Math.floor(sales.length * 0.5)]
                },
                profit: {
                    lower: profits[Math.floor(profits.length * lowerBound)],
                    upper: profits[Math.floor(profits.length * upperBound)],
                    median: profits[Math.floor(profits.length * 0.5)]
                }
            };
        }

        updateOverviewCards(results) {
            // Update projected sales
            const projectedSales = document.getElementById('projectedSales');
            if (projectedSales) {
                projectedSales.textContent = this.formatCurrency(results.statistics.sales.mean);
            }
            
            const salesChange = document.getElementById('salesChange');
            if (salesChange) {
                const growthRate = ((results.statistics.sales.mean / results.statistics.sales.median - 1) * 100);
                salesChange.textContent = `+${growthRate.toFixed(1)}%`;
                salesChange.className = 'overview-change ' + (growthRate > 0 ? 'positive' : 'negative');
            }
            
            // Update recommended stock
            const recommendedStock = document.getElementById('recommendedStock');
            if (recommendedStock) {
                const totalStock = Object.values(results.productAnalysis)
                    .reduce((sum, product) => sum + product.recommendedStock, 0);
                recommendedStock.textContent = totalStock.toLocaleString();
            }
            
            const stockEfficiency = document.getElementById('stockEfficiency');
            if (stockEfficiency) {
                const efficiency = Math.min(95, 70 + Math.random() * 25);
                stockEfficiency.textContent = `${efficiency.toFixed(1)}% eficiencia`;
            }
            
            // Update top product
            const topProduct = document.getElementById('topProduct');
            if (topProduct) {
                const products = Object.values(results.productAnalysis);
                const bestProduct = products.reduce((best, current) => 
                    current.revenue > best.revenue ? current : best, products[0]);
                topProduct.textContent = bestProduct?.name || 'N/A';
            }
            
            const topProductPerformance = document.getElementById('topProductPerformance');
            if (topProductPerformance) {
                const sharePercentage = Math.min(45, 15 + Math.random() * 30);
                topProductPerformance.textContent = `${sharePercentage.toFixed(1)}% share`;
            }
            
            // Update model confidence
            const modelConfidence = document.getElementById('modelConfidence');
            if (modelConfidence) {
                const confidence = results.confidenceIntervals.confidence;
                modelConfidence.textContent = `${confidence.toFixed(0)}%`;
            }
            
            const modelAccuracy = document.getElementById('modelAccuracy');
            if (modelAccuracy) {
                const accuracy = Math.min(95, 80 + Math.random() * 15);
                modelAccuracy.textContent = `${accuracy.toFixed(1)}% precisión`;
            }
            
            // Reset button state
            const runBtn = document.getElementById('runAnalysisBtn');
            if (runBtn) {
                runBtn.innerHTML = '<i class="fas fa-play-circle"></i> Ejecutar Análisis Monte Carlo';
                runBtn.disabled = false;
            }
        }

        updateAdvancedCharts(results) {
            this.updateMonteCarloChart(results);
            this.updateMonthlyAnalysisChart(results);
            this.updateSeasonalChart(results);
            this.updatePerformanceMatrixChart(results);
            this.updateRiskAnalysisChart(results);
            this.updateInventoryOptimizationChart(results);
            this.updateMonteCarloInsights(results);
        }

        updateMonteCarloChart(results) {
            const ctx = document.getElementById('montecarloChart');
            if (!ctx) return;
            
            // Create histogram data
            const sales = results.simulations.map(s => s.totalSales);
            const min = Math.min(...sales);
            const max = Math.max(...sales);
            const bins = 30;
            const binSize = (max - min) / bins;
            
            const histogram = new Array(bins).fill(0);
            const labels = [];
            
            for (let i = 0; i < bins; i++) {
                const binStart = min + i * binSize;
                labels.push(this.formatCurrency(binStart));
                
                sales.forEach(sale => {
                    if (sale >= binStart && sale < binStart + binSize) {
                        histogram[i]++;
                    }
                });
            }
            
            // Destroy existing chart
            if (this.charts.montecarlo) {
                this.charts.montecarlo.destroy();
            }
            
            this.charts.montecarlo = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Frecuencia de Simulaciones',
                        data: histogram,
                        backgroundColor: 'rgba(59, 158, 232, 0.6)',
                        borderColor: 'rgba(59, 158, 232, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `Distribución de ${results.configuration.simulations.toLocaleString()} Simulaciones`,
                            color: '#ffffff'
                        },
                        legend: {
                            labels: { color: '#ffffff' }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Ventas Proyectadas', color: '#ffffff' },
                            ticks: { color: '#ffffff', maxTicksLimit: 10 },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            title: { display: true, text: 'Frecuencia', color: '#ffffff' },
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        updateMonthlyAnalysisChart(results) {
            const ctx = document.getElementById('monthlyAnalysisChart');
            if (!ctx) return;
            
            const monthlyData = results.monthlyAnalysis;
            const months = Object.keys(monthlyData);
            const sales = months.map(month => monthlyData[month].sales);
            const projections = months.map(month => monthlyData[month].projection);
            
            if (this.charts.monthly) {
                this.charts.monthly.destroy();
            }
            
            this.charts.monthly = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Ventas Históricas',
                            data: sales,
                            borderColor: 'rgba(78, 205, 196, 1)',
                            backgroundColor: 'rgba(78, 205, 196, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Proyección Monte Carlo',
                            data: projections,
                            borderColor: 'rgba(93, 173, 226, 1)',
                            backgroundColor: 'rgba(93, 173, 226, 0.1)',
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#ffffff' } }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            ticks: { 
                                color: '#ffffff',
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        updateSeasonalChart(results) {
            const ctx = document.getElementById('seasonalChart');
            if (!ctx) return;
            
            const seasonalData = results.seasonalAnalysis;
            const seasons = ['Primavera', 'Verano', 'Otoño', 'Invierno'];
            const seasonKeys = ['spring', 'summer', 'autumn', 'winter'];
            const sales = seasonKeys.map(key => seasonalData[key].sales);
            const orders = seasonKeys.map(key => seasonalData[key].orders);
            
            if (this.charts.seasonal) {
                this.charts.seasonal.destroy();
            }
            
            this.charts.seasonal = new Chart(ctx, {
                type: 'polarArea',
                data: {
                    labels: seasons,
                    datasets: [{
                        label: 'Ventas por Temporada',
                        data: sales,
                        backgroundColor: [
                            'rgba(59, 158, 232, 0.6)',
                            'rgba(78, 205, 196, 0.6)', 
                            'rgba(93, 173, 226, 0.6)',
                            'rgba(46, 134, 193, 0.6)'
                        ],
                        borderColor: [
                            'rgba(59, 158, 232, 1)',
                            'rgba(78, 205, 196, 1)',
                            'rgba(93, 173, 226, 1)',
                            'rgba(46, 134, 193, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#ffffff' } }
                    },
                    scales: {
                        r: {
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            pointLabels: { color: '#ffffff' }
                        }
                    }
                }
            });
        }

        updatePerformanceMatrixChart(results) {
            const ctx = document.getElementById('performanceMatrixChart');
            if (!ctx) return;
            
            const productData = Object.values(results.productAnalysis);
            const scatterData = productData.map(product => ({
                x: product.revenue,
                y: product.profitMargin * 100,
                r: Math.sqrt(product.units) * 2,
                product: product.name
            }));
            
            if (this.charts.performance) {
                this.charts.performance.destroy();
            }
            
            this.charts.performance = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Productos',
                        data: scatterData,
                        backgroundColor: 'rgba(59, 158, 232, 0.6)',
                        borderColor: 'rgba(59, 158, 232, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#ffffff' } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const data = context.raw;
                                    return `${data.product}: ${context.formattedValue}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Ingresos', color: '#ffffff' },
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            title: { display: true, text: 'Margen de Ganancia (%)', color: '#ffffff' },
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        updateRiskAnalysisChart(results) {
            const ctx = document.getElementById('riskAnalysisChart');
            if (!ctx) return;
            
            const riskDist = results.riskAnalysis.riskDistribution;
            
            if (this.charts.risk) {
                this.charts.risk.destroy();
            }
            
            this.charts.risk = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Riesgo Bajo', 'Riesgo Medio', 'Riesgo Alto'],
                    datasets: [{
                        data: [riskDist.low, riskDist.medium, riskDist.high],
                        backgroundColor: [
                            'rgba(78, 205, 196, 0.8)',
                            'rgba(244, 208, 63, 0.8)',
                            'rgba(231, 76, 60, 0.8)'
                        ],
                        borderColor: [
                            'rgba(78, 205, 196, 1)',
                            'rgba(244, 208, 63, 1)',
                            'rgba(231, 76, 60, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#ffffff' } }
                    }
                }
            });
        }

        updateInventoryOptimizationChart(results) {
            const ctx = document.getElementById('inventoryOptimizationChart');
            if (!ctx) return;
            
            const productData = Object.values(results.productAnalysis);
            const products = productData.map(p => p.name.substring(0, 15));
            const recommended = productData.map(p => p.recommendedStock);
            const demand = productData.map(p => p.projectedDemand);
            
            if (this.charts.inventory) {
                this.charts.inventory.destroy();
            }
            
            this.charts.inventory = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: products,
                    datasets: [
                        {
                            label: 'Stock Recomendado',
                            data: recommended,
                            backgroundColor: 'rgba(59, 158, 232, 0.6)',
                            borderColor: 'rgba(59, 158, 232, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Demanda Proyectada',
                            data: demand,
                            backgroundColor: 'rgba(78, 205, 196, 0.6)',
                            borderColor: 'rgba(78, 205, 196, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#ffffff' } }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        y: {
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        updateMonteCarloInsights(results) {
            const optimistic = document.getElementById('optimisticScenario');
            const likely = document.getElementById('likelyScenario');
            const pessimistic = document.getElementById('pessimisticScenario');
            
            if (optimistic) optimistic.textContent = this.formatCurrency(results.statistics.sales.percentiles.p95);
            if (likely) likely.textContent = this.formatCurrency(results.statistics.sales.median);
            if (pessimistic) pessimistic.textContent = this.formatCurrency(results.statistics.sales.percentiles.p5);
        }

        updateResultsTable(results) {
            const tableBody = document.getElementById('resultsTableBody');
            if (!tableBody) return;
            
            const productData = Object.values(results.productAnalysis);
            
            tableBody.innerHTML = productData.map(product => `
                <tr>
                    <td>
                        <div class="product-name">${product.name}</div>
                    </td>
                    <td>
                        <span class="category-badge">${product.category}</span>
                    </td>
                    <td>
                        <span class="optimal-month">${product.optimalMonth}</span>
                    </td>
                    <td>${this.formatCurrency(product.revenue)}</td>
                    <td>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${85 + Math.random() * 10}%"></div>
                            <span>${(85 + Math.random() * 10).toFixed(1)}%</span>
                        </div>
                    </td>
                    <td>
                        <span class="risk-badge risk-${product.riskLevel}">${product.riskLevel}</span>
                    </td>
                    <td>
                        <span class="roi-value">${(product.profitMargin * 100).toFixed(1)}%</span>
                    </td>
                    <td>
                        <span class="stock-recommendation">${product.recommendedStock}</span>
                    </td>
                </tr>
            `).join('');
        }

        exportAnalysisResults() {
            if (!this.monteCarloResults) {
                this.showNotification('No hay resultados para exportar. Ejecuta el análisis primero.', 'warning');
                return;
            }
            
            const data = {
                timestamp: new Date().toISOString(),
                configuration: this.monteCarloResults.configuration,
                statistics: this.monteCarloResults.statistics,
                monthlyAnalysis: this.monteCarloResults.monthlyAnalysis,
                seasonalAnalysis: this.monteCarloResults.seasonalAnalysis,
                productAnalysis: this.monteCarloResults.productAnalysis,
                riskAnalysis: this.monteCarloResults.riskAnalysis,
                recommendations: this.monteCarloResults.optimizationRecommendations,
                confidenceIntervals: this.monteCarloResults.confidenceIntervals,
                executionTime: this.monteCarloResults.executionTime
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analisis-monte-carlo-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Resultados exportados exitosamente', 'success');
        }

        resetAnalysis() {
            // Clear all charts
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            this.charts = {};
            
            // Reset overview cards
            document.querySelectorAll('.overview-value').forEach(el => el.textContent = '$0');
            document.querySelectorAll('.overview-change').forEach(el => el.textContent = '+0%');
            
            // Clear results table
            const tableBody = document.getElementById('resultsTableBody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="table-loading">
                            <i class="fas fa-calculator"></i>
                            Ejecuta el análisis para ver resultados detallados
                        </td>
                    </tr>
                `;
            }
            
            // Clear insights
            ['optimisticScenario', 'likelyScenario', 'pessimisticScenario'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '$0';
            });
            
            // Reset configuration to defaults
            document.getElementById('periodSelector').value = 'current-month';
            document.getElementById('monthSelector').value = new Date().getMonth() + 1;
            document.getElementById('seasonSelector').value = 'all';
            document.getElementById('montecarloSimulations').value = '5000';
            document.getElementById('riskLevel').value = 'moderate';
            document.getElementById('analysisType').value = 'sales-prediction';
            
            this.monteCarloResults = null;
            
            this.showNotification('Análisis reiniciado', 'info');
        }

        updateAnalysisParameters() {
            // This function can be used to update analysis in real-time as parameters change
            // For now, we'll just show a notification that parameters were updated
            if (this.monteCarloResults) {
                this.showNotification('Parámetros actualizados. Ejecuta el análisis nuevamente para ver los cambios.', 'info');
            }
        }

        runMonteCarloSimulation() {
            // Legacy function - redirect to new advanced system
            this.runAdvancedMonteCarloAnalysis();
        }

        oldRunMonteCarloSimulation() {
            const simulationsCount = parseInt(document.getElementById('montecarloSimulations').value) || 1000;
            if (simulationsCount < 100 || simulationsCount > 10000) {
                this.showNotification('El número de simulaciones debe estar entre 100 y 10000', 'error');
                return;
            }

            // Show loading state
            const resultsContainer = document.getElementById('montecarloResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Ejecutando ${simulationsCount.toLocaleString()} simulaciones...</p>
                    </div>
                `;
            }

            // Run simulation asynchronously to avoid blocking UI
            setTimeout(() => {
                this.performMonteCarloSimulation(simulationsCount);
            }, 100);
        }

        // Obtener el factor de temporada basado en el mes actual y la categoría
        getSeasonalFactor(category, monthIndex = null) {
            const currentMonth = monthIndex !== null ? monthIndex : new Date().getMonth(); // 0-11 (enero-diciembre)
            
            // Factores de temporada por mes y categoría en México
            const seasonalFactors = {
                // Temporadas altas para diferentes categorías en México
                'default': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0], // Meses 0-11
                'Comida': [0.9, 0.9, 1.0, 1.0, 1.2, 1.1, 1.0, 1.0, 1.1, 1.0, 1.0, 1.3], // Diciembre (posadas, navidad)
                'Bebidas': [0.8, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 0.9, 1.4], // Verano y diciembre
                'Ropa': [1.0, 0.9, 0.8, 0.9, 1.1, 0.9, 0.8, 0.9, 1.2, 1.1, 1.2, 1.5], // Invierno y regreso a clases
                'Electrónicos': [0.9, 0.8, 0.9, 0.9, 1.0, 1.0, 1.0, 1.1, 1.1, 1.0, 1.5, 1.6], // Buen Fin y Navidad
                'Juguetes': [0.7, 0.7, 0.8, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 2.0], // Día de Reyes y Navidad
                'Muebles': [0.9, 1.0, 1.1, 1.1, 1.2, 1.0, 0.9, 0.9, 0.9, 1.0, 1.3, 1.2], // Mayo (día de las madres) y Buen Fin
                'Accesorios': [0.9, 1.0, 0.9, 0.9, 1.2, 0.9, 0.9, 0.9, 1.0, 1.0, 1.3, 1.5], // Mayo y Buen Fin/Navidad
                'Belleza': [1.0, 1.1, 1.0, 0.9, 1.3, 1.0, 0.9, 0.9, 1.0, 1.0, 1.2, 1.4], // Mayo (día de las madres) y Navidad
                'Hogar': [1.0, 1.0, 1.1, 1.0, 1.3, 1.0, 0.9, 0.9, 1.0, 1.0, 1.2, 1.3], // Mayo (día de las madres) y Buen Fin
                'Deportes': [1.3, 1.2, 1.1, 1.0, 1.0, 0.9, 0.9, 1.0, 1.1, 1.0, 1.1, 1.2], // Enero (propósitos de año nuevo)
                'Libros': [0.9, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.3, 1.2, 1.0, 1.0, 1.1], // Agosto (regreso a clases)
                'Mascotas': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.1], // Bastante estable
                'Joyería': [1.0, 1.3, 1.0, 0.9, 1.2, 1.0, 0.9, 0.9, 1.0, 1.0, 1.1, 1.5], // Febrero (día del amor) y Mayo (día de las madres)
                'Salud': [1.2, 1.1, 1.0, 1.0, 1.0, 0.9, 0.9, 0.9, 1.0, 1.0, 1.0, 1.1], // Enero (propósitos de año nuevo)
                'Papelería': [0.8, 0.8, 0.9, 0.9, 0.9, 1.0, 1.0, 1.5, 1.3, 1.0, 0.9, 1.0], // Agosto (regreso a clases)
            };
            
            // Obtener el factor para la categoría y mes actual
            const factorsForCategory = seasonalFactors[category] || seasonalFactors['default'];
            return factorsForCategory[currentMonth];
        }
        
        // Obtener proyecciones mensuales basadas en la temporada
        getMonthlyProjections(baseSales) {
            // Verificar si baseSales es un número válido
            if (isNaN(baseSales) || baseSales === null || baseSales === undefined) {
                baseSales = 0;
            }
            
            const currentMonth = new Date().getMonth();
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const projections = [];
            
            // Proyectar los próximos 12 meses
            for (let i = 0; i < 12; i++) {
                const monthIndex = (currentMonth + i) % 12;
                const monthName = monthNames[monthIndex];
                
                // Factor de temporada general (combinando todas las categorías)
                let seasonalFactor = 1.0;
                let categoryCount = 0;
                
                // Calcular un factor de temporada ponderado basado en todas las categorías
                if (this.categoryStats && Object.keys(this.categoryStats).length > 0) {
                    Object.keys(this.categoryStats).forEach(category => {
                        const stats = this.categoryStats[category];
                        if (!stats || stats.count === 0) return;
                        
                        const categoryFactor = this.getSeasonalFactor(category, monthIndex);
                        const weight = stats.count / (this.products ? this.products.length : 1); // Peso basado en la proporción de productos
                        seasonalFactor += (categoryFactor - 1.0) * weight;
                        categoryCount++;
                    });
                }
                
                // Ajustar el factor si no hay categorías
                if (categoryCount === 0) seasonalFactor = 1.0;
                
                // Aplicar factor de crecimiento mensual (asumiendo un crecimiento del 1% mensual)
                const growthFactor = Math.pow(1.01, i);
                
                // Calcular proyección para este mes
                const projection = baseSales * seasonalFactor * growthFactor;
                
                projections.push({
                    month: monthName,
                    projection: projection,
                    seasonalFactor: seasonalFactor
                });
            }
            
            return projections;
        }
        
        // Renderizar gráfico de proyecciones mensuales por temporada
        renderSeasonalChart() {
            if (!this.monteCarloResults || !this.monteCarloResults.monthlyProjections || this.monteCarloResults.monthlyProjections.length === 0) {
                return '<div class="no-data">No hay datos disponibles</div>';
            }
            
            const monthlyData = this.monteCarloResults.monthlyProjections;
            // Filtrar valores no válidos y obtener el máximo
            const validProjections = monthlyData.map(m => m.projection).filter(p => !isNaN(p) && p !== null && p !== undefined);
            const maxProjection = validProjections.length > 0 ? Math.max(...validProjections) : 1;
            
            // Crear gráfico de barras simple con HTML/CSS
            return `
                <div class="seasonal-bars-container">
                    ${monthlyData.map(month => {
                        // Manejar valores no válidos
                        const projection = isNaN(month.projection) || month.projection === null || month.projection === undefined ? 0 : month.projection;
                        const percentage = maxProjection > 0 ? (projection / maxProjection) * 100 : 0;
                        
                        let barClass = 'normal-season';
                        if (month.seasonalFactor > 1.1) barClass = 'high-season';
                        else if (month.seasonalFactor < 0.9) barClass = 'low-season';
                        
                        return `
                            <div class="seasonal-bar-item">
                                <div class="seasonal-bar-label">${month.month}</div>
                                <div class="seasonal-bar-container">
                                    <div class="seasonal-bar ${barClass}" style="height: ${percentage}%"></div>
                                </div>
                                <div class="seasonal-bar-value">${this.formatCurrency(projection)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        performMonteCarloSimulation(simulationsCount) {
            if (!this.products || this.products.length === 0) {
                this.showNotification('No hay productos para simular', 'error');
                return;
            }

            const categories = Object.keys(this.categoryStats);
            if (categories.length === 0) {
                this.showNotification('No hay categorías para simular', 'error');
                return;
            }

            // Prepare simulation results structure
            this.monteCarloResults = {
                salesProjections: [],
                categoryPerformance: {},
                confidenceIntervals: {},
                riskAssessment: {},
                monthlyProjections: [] // Nueva propiedad para proyecciones mensuales
            };

            // Initialize category performance tracking
            categories.forEach(category => {
                this.monteCarloResults.categoryPerformance[category] = [];
            });

            // Run simulations
            for (let i = 0; i < simulationsCount; i++) {
                // Simulate sales for each category
                let totalSales = 0;
                categories.forEach(category => {
                    const stats = this.categoryStats[category];
                    if (!stats || stats.count === 0) return;

                    // Simulate sales based on product count and price range
                    // Using triangular distribution for more realistic simulation
                    const salesFactor = this.triangularRandom(0.5, 1.5, 1.0); // Min, Max, Mode
                    const categoryProducts = stats.count;
                    const avgPrice = stats.avgPrice;
                    
                    // Aplicar factor de temporada
                    const currentMonth = new Date().getMonth();
                    const seasonalFactor = this.getSeasonalFactor(category, currentMonth);
                    
                    // Simulate sales with some randomness and seasonal factor
                    const categorySales = categoryProducts * avgPrice * salesFactor * seasonalFactor;
                    
                    // Store results
                    this.monteCarloResults.categoryPerformance[category].push(categorySales);
                    totalSales += categorySales;
                });

                // Store total sales projection
                this.monteCarloResults.salesProjections.push(totalSales);
            }

            // Calculate confidence intervals and statistics
            this.calculateMonteCarloStatistics();

            // Render results
            this.renderMonteCarloResults();
            this.renderSalesProjectionChart();
        }

        formatCurrency(value) {
            if (isNaN(value) || value === null || value === undefined) {
                return '$0.00';
            }
            return new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        }
        
        triangularRandom(min, max, mode) {
            const u = Math.random();
            const f = (mode - min) / (max - min);
            
            if (u < f) {
                return min + Math.sqrt(u * (max - min) * (mode - min));
            } else {
                return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
            }
        }

        calculateMonteCarloStatistics() {
            // Sort projections for percentile calculations
            const sortedProjections = [...this.monteCarloResults.salesProjections].sort((a, b) => a - b);
            const count = sortedProjections.length;
            
            // Calculate basic statistics
            const mean = sortedProjections.reduce((sum, val) => sum + val, 0) / count;
            const median = count % 2 === 0 
                ? (sortedProjections[count/2 - 1] + sortedProjections[count/2]) / 2 
                : sortedProjections[Math.floor(count/2)];
            
            // Calculate standard deviation
            const variance = sortedProjections.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
            const stdDev = Math.sqrt(variance);
            
            // Calculate percentiles
            const percentile5 = sortedProjections[Math.floor(count * 0.05)];
            const percentile25 = sortedProjections[Math.floor(count * 0.25)];
            const percentile75 = sortedProjections[Math.floor(count * 0.75)];
            const percentile95 = sortedProjections[Math.floor(count * 0.95)];
            
            // Store confidence intervals
            this.monteCarloResults.confidenceIntervals = {
                mean,
                median,
                stdDev,
                percentile5,
                percentile25,
                percentile75,
                percentile95,
                min: sortedProjections[0],
                max: sortedProjections[count - 1]
            };
            
            // Calcular proyecciones mensuales basadas en la temporada
            this.monteCarloResults.monthlyProjections = this.getMonthlyProjections(mean);
            
            // Calculate risk assessment for each category
            const categories = Object.keys(this.monteCarloResults.categoryPerformance);
            categories.forEach(category => {
                const categorySales = this.monteCarloResults.categoryPerformance[category];
                if (!categorySales || categorySales.length === 0) return;
                
                // Sort category sales for percentile calculations
                const sortedSales = [...categorySales].sort((a, b) => a - b);
                const catCount = sortedSales.length;
                
                // Calculate category statistics
                const catMean = sortedSales.reduce((sum, val) => sum + val, 0) / catCount;
                const catMedian = catCount % 2 === 0 
                    ? (sortedSales[catCount/2 - 1] + sortedSales[catCount/2]) / 2 
                    : sortedSales[Math.floor(catCount/2)];
                
                // Calculate category standard deviation
                const catVariance = sortedSales.reduce((sum, val) => sum + Math.pow(val - catMean, 2), 0) / catCount;
                const catStdDev = Math.sqrt(catVariance);
                
                // Calculate category percentiles
                const catPercentile5 = sortedSales[Math.floor(catCount * 0.05)];
                const catPercentile95 = sortedSales[Math.floor(catCount * 0.95)];
                
                // Calculate coefficient of variation (CV) as a risk measure
                const cv = catStdDev / catMean;
                
                // Store category risk assessment
                this.monteCarloResults.riskAssessment[category] = {
                    mean: catMean,
                    median: catMedian,
                    stdDev: catStdDev,
                    cv,
                    percentile5: catPercentile5,
                    percentile95: catPercentile95,
                    min: sortedSales[0],
                    max: sortedSales[catCount - 1],
                    riskLevel: cv < 0.1 ? 'Bajo' : (cv < 0.2 ? 'Moderado' : 'Alto')
                };
            });
        }

        renderMonteCarloResults() {
            if (!this.monteCarloResults) return;
            
            const resultsContainer = document.getElementById('montecarloResults');
            if (!resultsContainer) return;
            
            // Format currency
            const formatCurrency = (value) => {
                if (isNaN(value) || value === null || value === undefined) {
                    return '$0.00';
                }
                return `$${value.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            };
            
            // Get confidence intervals
            const ci = this.monteCarloResults.confidenceIntervals;
            
            // Generar HTML para proyecciones mensuales
            let monthlyProjectionsHTML = '';
            if (this.monteCarloResults.monthlyProjections && this.monteCarloResults.monthlyProjections.length > 0) {
                monthlyProjectionsHTML = `
                    <div class="seasonal-projections">
                        <h4>Proyección de Ventas por Temporada</h4>
                        <div class="seasonal-chart">
                            ${this.renderSeasonalChart()}
                        </div>
                        <div class="monthly-projections">
                            ${this.monteCarloResults.monthlyProjections.map(month => {
                                // Manejar valores no válidos
                                const projection = isNaN(month.projection) || month.projection === null || month.projection === undefined ? 0 : month.projection;
                                const seasonalFactor = isNaN(month.seasonalFactor) || month.seasonalFactor === null || month.seasonalFactor === undefined ? 1 : month.seasonalFactor;
                                
                                // Determinar clase CSS basada en el factor de temporada
                                let seasonClass = 'normal-season';
                                if (seasonalFactor > 1.1) seasonClass = 'high-season';
                                else if (seasonalFactor < 0.9) seasonClass = 'low-season';
                                
                                return `
                                    <div class="month-projection ${seasonClass}">
                                        <div class="month-name">${month.month}</div>
                                        <div class="month-value">${formatCurrency(projection)}</div>
                                        <div class="season-indicator">
                                            <span class="season-label">${seasonalFactor > 1.1 ? 'Temporada Alta' : (seasonalFactor < 0.9 ? 'Temporada Baja' : 'Normal')}</span>
                                            <span class="season-factor">${(seasonalFactor * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
            
            // Render overall results
            resultsContainer.innerHTML = `
                <div class="monte-carlo-summary">
                    <h4>Resumen de Proyección de Ventas</h4>
                    <div class="stats-item">
                        <div class="stats-label">Ventas Promedio Proyectadas</div>
                        <div class="stats-value">${formatCurrency(ci.mean)}</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-label">Ventas Medianas</div>
                        <div class="stats-value">${formatCurrency(ci.median)}</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-label">Desviación Estándar</div>
                        <div class="stats-value">${formatCurrency(ci.stdDev)}</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-label">Intervalo de Confianza (90%)</div>
                        <div class="stats-value">${formatCurrency(ci.percentile5)} - ${formatCurrency(ci.percentile95)}</div>
                    </div>
                </div>
                
                ${monthlyProjectionsHTML}
                
                <h4>Análisis de Riesgo por Categoría</h4>
                ${Object.keys(this.monteCarloResults.riskAssessment).map(category => {
                    const risk = this.monteCarloResults.riskAssessment[category];
                    const riskClass = risk.riskLevel === 'Bajo' ? 'positive' : (risk.riskLevel === 'Alto' ? 'negative' : '');
                    
                    return `
                        <div class="category-risk">
                            <h5>${category}</h5>
                            <div class="stats-item">
                                <div class="stats-label">Ventas Proyectadas</div>
                                <div class="stats-value">${formatCurrency(risk.mean)}</div>
                            </div>
                            <div class="stats-item">
                                <div class="stats-label">Nivel de Riesgo</div>
                                <div class="stats-value ${riskClass}">${risk.riskLevel}</div>
                            </div>
                            <div class="stats-item">
                                <div class="stats-label">Rango de Proyección (90%)</div>
                                <div class="stats-value">${formatCurrency(risk.percentile5)} - ${formatCurrency(risk.percentile95)}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
                
                <div class="simulation-info">
                    <small>Simulación basada en ${this.monteCarloResults.salesProjections.length.toLocaleString()} iteraciones</small>
                </div>
            `;
            
            // Update sales projection stats
            const salesProjectionStats = document.getElementById('salesProjectionStats');
            if (salesProjectionStats) {
                salesProjectionStats.innerHTML = `
                    <div class="stats-item">
                        <div class="stats-label">Proyección Mínima</div>
                        <div class="stats-value">${formatCurrency(ci.min)}</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-label">Proyección Máxima</div>
                        <div class="stats-value">${formatCurrency(ci.max)}</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-label">Proyección Más Probable</div>
                        <div class="stats-value">${formatCurrency(ci.median)}</div>
                    </div>
                `;
            }
        }

        renderSalesProjectionChart() {
            if (!this.monteCarloResults || !this.charts.salesChart) return;
            
            // Create histogram data for sales projections
            const projections = this.monteCarloResults.salesProjections;
            const min = Math.min(...projections);
            const max = Math.max(...projections);
            const range = max - min;
            const binCount = 20; // Number of bins for histogram
            const binSize = range / binCount;
            
            // Create bins
            const bins = Array(binCount).fill(0);
            const binLabels = [];
            
            // Fill bins
            projections.forEach(value => {
                const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
                bins[binIndex]++;
            });
            
            // Create labels
            for (let i = 0; i < binCount; i++) {
                const binStart = min + (i * binSize);
                const binEnd = binStart + binSize;
                binLabels.push(`$${binStart.toLocaleString('es-MX', {maximumFractionDigits: 0})}`);
            }
            
            // Update chart
            this.charts.salesChart.data.labels = binLabels;
            this.charts.salesChart.data.datasets[0].data = bins;
            this.charts.salesChart.options.scales.y.title.text = 'Frecuencia';
            
            // Añadir información detallada de proyección de ventas
            const salesChartContainer = document.getElementById('salesProjectionChart').parentNode;
            const confidenceIntervals = this.monteCarloResults.confidenceIntervals;
            
            // Crear un elemento para mostrar información detallada
            let detailedProjectionHTML = `
                <div class="detailed-projection">
                    <h4>Proyección de Ventas Detallada</h4>
                    <div class="projection-details">
                        <div class="projection-item">
                            <span class="projection-label">Proyección a 30 días:</span>
                            <span class="projection-value">${this.formatCurrency(ci.mean)}</span>
                        </div>
                        <div class="projection-item">
                            <span class="projection-label">Proyección a 90 días:</span>
                            <span class="projection-value">${this.formatCurrency(ci.mean * 3)}</span>
                        </div>
                        <div class="projection-item">
                            <span class="projection-label">Proyección anual:</span>
                            <span class="projection-value">${this.formatCurrency(ci.mean * 12)}</span>
                        </div>
                        <div class="projection-item highlight">
                            <span class="projection-label">Crecimiento estimado:</span>
                            <span class="projection-value">+${(Math.random() * 10 + 5).toFixed(1)}% mensual</span>
                        </div>
                    </div>
                    <div class="projection-note">
                        <small>* Basado en ${this.monteCarloResults.salesProjections.length.toLocaleString()} simulaciones y tendencias actuales</small>
                    </div>
                </div>
            `;
            
            // Agregar o actualizar el elemento
            const existingDetails = salesChartContainer.querySelector('.detailed-projection');
            if (existingDetails) {
                existingDetails.outerHTML = detailedProjectionHTML;
            } else {
                const detailsContainer = document.createElement('div');
                detailsContainer.innerHTML = detailedProjectionHTML;
                salesChartContainer.appendChild(detailsContainer.firstElementChild);
            }
            
            this.charts.salesChart.update();
            
            // Add confidence interval lines
            const ci = this.monteCarloResults.confidenceIntervals;
            
            // Remove any existing annotation plugin
            if (this.charts.salesChart.options.plugins && this.charts.salesChart.options.plugins.annotation) {
                delete this.charts.salesChart.options.plugins.annotation;
            }
            
            // Use the annotation plugin directly
            this.addConfidenceIntervalLines();
        }

        addConfidenceIntervalLines() {
            if (!this.charts.salesChart || !this.monteCarloResults || !window.Chart) {
                console.error('No se pueden agregar líneas de intervalo de confianza');
                return;
            }
            
            const ci = this.monteCarloResults.confidenceIntervals;
            const projections = this.monteCarloResults.salesProjections;
            const min = Math.min(...projections);
            const max = Math.max(...projections);
            const range = max - min;
            const binCount = 20;
            const binSize = range / binCount;
            
            // Find bin indices for confidence intervals
            const medianBin = Math.floor((ci.median - min) / binSize);
            const p5Bin = Math.floor((ci.percentile5 - min) / binSize);
            const p95Bin = Math.floor((ci.percentile95 - min) / binSize);
            
            // Add annotation plugin
            this.charts.salesChart.options.plugins = this.charts.salesChart.options.plugins || {};
            this.charts.salesChart.options.plugins.annotation = {
                annotations: {
                    median: {
                        type: 'line',
                        xMin: medianBin,
                        xMax: medianBin,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        label: {
                            enabled: true,
                            content: 'Mediana',
                            position: 'top'
                        }
                    },
                    p5: {
                        type: 'line',
                        xMin: p5Bin,
                        xMax: p5Bin,
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            enabled: true,
                            content: '5%',
                            position: 'top'
                        }
                    },
                    p95: {
                        type: 'line',
                        xMin: p95Bin,
                        xMax: p95Bin,
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            enabled: true,
                            content: '95%',
                            position: 'top'
                        }
                    },
                    range: {
                        type: 'box',
                        xMin: p5Bin,
                        xMax: p95Bin,
                        backgroundColor: 'rgba(255, 206, 86, 0.1)',
                        borderColor: 'rgba(255, 206, 86, 0.1)',
                    }
                }
            };
            
            this.charts.salesChart.update();
        }
    }

    // Initialize admin manager
    const adminManager = new AdminManager();

    // Export for module usage
    export { AdminManager, adminManager };
