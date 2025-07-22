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
            onValue 
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
                this.editingProductId = null;
                this.currentTab = 'products';
                this.productImages = [];
                this.primaryImageIndex = 0;
                this.expandedCategories = new Set();
                this.expandedCustomers = new Set();
                this.init();
            }

            async init() {
                await this.loadProducts();
                await this.loadOrders();
                await this.loadUsers();
                this.setupEventListeners();
                this.renderProducts();
                this.renderOrders();
                this.renderUsers();
            }

            setupEventListeners() {
                const form = document.getElementById('productForm');
                const cancelEditBtn = document.getElementById('cancelEdit');
                const uploadMethodBtns = document.querySelectorAll('.upload-method-btn');
                const fileUploadArea = document.querySelector('.file-upload-area');

                form.addEventListener('submit', (e) => this.handleSubmit(e));
                cancelEditBtn.addEventListener('click', () => this.cancelEdit());

                // Upload method switching
                uploadMethodBtns.forEach(btn => {
                    btn.addEventListener('click', () => this.switchUploadMethod(btn.dataset.method));
                });

                // File drag and drop
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

                // Enter key for URL input
                document.getElementById('imageUrlInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.addImageFromUrl();
                    }
                });
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
                
                if (this.productImages.length === 0) {
                    container.innerHTML = '';
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
                if (tabName === 'orders') {
                    this.loadOrders();
                } else if (tabName === 'users') {
                    this.loadUsers();
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
                } catch (error) {
                    console.error('Error loading products:', error);
                    this.showNotification('Error al cargar los productos', 'error');
                }
            }

            async loadOrders() {
                try {
                    const ordersRef = ref(realtimeDb, 'orders');
                    const snapshot = await get(ordersRef);
                    
                    this.orders = [];
                    if (snapshot.exists()) {
                        const ordersData = snapshot.val();
                        Object.keys(ordersData).forEach(key => {
                            this.orders.push({
                                id: key,
                                ...ordersData[key]
                            });
                        });
                        // Sort by timestamp desc
                        this.orders.sort((a, b) => b.timestamp - a.timestamp);
                    }
                } catch (error) {
                    console.error('Error loading orders:', error);
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
                            const userOrders = this.orders.filter(order => order.userId === key);
                            this.users.push({
                                id: key,
                                ...usersData[key],
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
                                            <span class="price-label">Mayoreo</span>
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

            renderOrders() {
                const container = document.getElementById('ordersGrid');
                
                if (this.orders.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-shopping-bag"></i>
                            <h3>Sin Pedidos</h3>
                            <p>No hay pedidos registrados aún</p>
                        </div>
                    `;
                    return;
                }

                // Group orders by customer
                const customerOrders = new Map();
                this.orders.forEach(order => {
                    const customerId = order.userId;
                    const customerName = order.userInfo?.fullName || 'Cliente desconocido';
                    
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

                container.innerHTML = Array.from(customerOrders.entries()).map(([customerId, customerData]) => {
                    const isExpanded = this.expandedCustomers.has(customerId);
                    const expandIcon = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
                    
                    const ordersHTML = customerData.orders.map(order => {
                        const orderDate = new Date(order.timestamp).toLocaleString('es-ES');
                        const statusClass = order.status === 'completed' ? 'status-completed' : 
                                           order.status === 'cancelRequested' ? 'status-cancel-requested' : 
                                           order.status === 'cancelled' ? 'status-cancelled' : 'status-pending';
                        const statusText = order.status === 'completed' ? 'Completado' : 
                                          order.status === 'cancelRequested' ? 'Cancelación Solicitada' : 
                                          order.status === 'cancelled' ? 'Cancelado' : 'Pendiente';

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
                                deliveryInfo = `
                                    <div class="delivery-info">
                                        <h4><i class="fas fa-truck-fast"></i> Envío a Domicilio</h4>
                                        <p><strong>Dirección:</strong> ${order.deliveryInfo.street || ''}, ${order.deliveryInfo.city || ''}, ${order.deliveryInfo.state || ''}, ${order.deliveryInfo.zip || ''}</p>
                                        ${order.deliveryInfo.instructions ? `<p><strong>Instrucciones:</strong> ${order.deliveryInfo.instructions}</p>` : ''}
                                    </div>
                                `;
                            }
                        }

                        return `
                            <div class="order-card">
                                <div class="order-header">
                                    <div class="order-id">Pedido #${order.id.slice(-6)}</div>
                                    <div class="order-status ${statusClass}">${statusText}</div>
                                </div>
                                
                                <div class="order-customer">
                                    <div>
                                        <p><strong>Fecha:</strong> ${orderDate}</p>
                                        <p><strong>Items:</strong> ${order.items.length} productos</p>
                                    </div>
                                    <div>
                                        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
                                    </div>
                                </div>

                                ${deliveryInfo}

                                <div class="order-items">
                                    <h4 style="margin-bottom: 0.75rem; font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Productos:</h4>
                                    ${order.items.map(item => `
                                        <div class="order-item">
                                            <div>
                                                <strong>${item.name}</strong><br>
                                                <small>Cantidad: ${item.quantity} | Precio: $${item.unitPrice.toFixed(2)} (${item.priceType || 'individual'})</small>
                                            </div>
                                            <div>$${item.totalPrice.toFixed(2)}</div>
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

            generateThermalTicket(orderId) {
                const order = this.orders.find(o => o.id === orderId);
                if (!order) {
                    this.showNotification('Pedido no encontrado', 'error');
                    return;
                }

                // Populate ticket template with enhanced information
                const ticketDate = document.getElementById('ticketDate');
                const ticketOrderId = document.getElementById('ticketOrderId');
                const ticketCustomerName = document.getElementById('ticketCustomerName');
                const ticketCustomerPhone = document.getElementById('ticketCustomerPhone');
                const ticketCustomerEmail = document.getElementById('ticketCustomerEmail');
                const ticketDeliveryInfo = document.getElementById('ticketDeliveryInfo');
                const ticketItems = document.getElementById('ticketItems');
                const ticketTotal = document.getElementById('ticketTotal');

                // Set date and order ID
                ticketDate.textContent = new Date(order.timestamp).toLocaleString('es-ES');
                ticketOrderId.textContent = `PEDIDO #${order.id.slice(-6)}`;

                // Customer information
                ticketCustomerName.textContent = order.userInfo?.fullName || 'Cliente';
                ticketCustomerPhone.textContent = `TEL: ${order.userInfo?.phone || 'N/A'}`;
                ticketCustomerEmail.textContent = `EMAIL: ${order.userInfo?.email || 'N/A'}`;

                // Delivery information
                let deliveryHTML = '';
                if (order.deliveryInfo) {
                    if (order.deliveryInfo.type === 'pickup') {
                        deliveryHTML = `
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
                            <div class="ticket-delivery-title">ENVIO A DOMICILIO</div>
                            <div class="ticket-delivery-details">DIR: ${fullAddress}</div>
                            ${order.deliveryInfo.instructions ? `<div class="ticket-delivery-details">NOTA: ${order.deliveryInfo.instructions}</div>` : ''}
                        `;
                    }
                }
                ticketDeliveryInfo.innerHTML = deliveryHTML;

                // Format items for thermal ticket
                let itemsHTML = '';
                order.items.forEach(item => {
                    itemsHTML += `
                        <div class="ticket-item">
                            <div class="ticket-item-name">${item.name}</div>
                            <div class="ticket-item-details">
                                ${item.quantity} x $${item.unitPrice.toFixed(2)} 
                                ${item.priceType === 'wholesale' ? '(MAYOREO)' : ''}
                            </div>
                            <div class="ticket-item-price">$${item.totalPrice.toFixed(2)}</div>
                        </div>
                    `;
                });

                ticketItems.innerHTML = itemsHTML;
                ticketTotal.textContent = `TOTAL: $${order.total.toFixed(2)}`;

                // Show ticket and print
                const ticket = document.getElementById('thermalTicket');
                ticket.style.display = 'block';
                
                // Wait a moment for rendering then print
                setTimeout(() => {
                    window.print();
                    ticket.style.display = 'none';
                }, 300);

                this.showNotification('Ticket térmico generado para impresión', 'success');
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
                    await this.loadOrders();
                    this.renderOrders();
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
                        
                        // Restore stock for each item
                        for (const item of orderData.items) {
                            const product = this.products.find(p => p.id === item.id);
                            if (product) {
                                const productRef = doc(db, 'products', item.id);
                                const newStock = (product.stock || 0) + item.quantity;
                                await updateDoc(productRef, {
                                    stock: newStock
                                });
                            }
                        }
                    }

                    // Remove the order completely from the database
                    await remove(orderRef);

                    this.showNotification('Pedido cancelado y stock restaurado exitosamente', 'success');
                    await this.loadOrders();
                    await this.loadUsers(); // Reload users to update order counts
                    await this.loadProducts(); // Reload products to update stock
                    this.renderOrders();
                    this.renderProducts();
                    if (this.currentTab === 'users') {
                        this.renderUsers();
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
                    await this.loadProducts();
                    this.renderProducts();
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
                    await this.loadProducts();
                    this.renderProducts();
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
                    await this.loadProducts();
                    this.renderProducts();
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
            }

            showNotification(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = `notification notification-${type}`;
                notification.innerHTML = `
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                    <span>${message}</span>
                `;

                document.body.appendChild(notification);
                
                setTimeout(() => notification.classList.add('show'), 100);
                
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 400);
                }, 4000);
            }
        }

        // Initialize admin manager
        window.adminManager = new AdminManager();