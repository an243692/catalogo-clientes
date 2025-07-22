import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    getDocs, 
    orderBy, 
    query,
    doc,
    updateDoc 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    push,
    query as dbQuery,
    orderByChild,
    equalTo,
    update
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
const auth = getAuth(app);
const realtimeDb = getDatabase(app);

class EcommerceManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.categories = new Map();
        this.carousels = new Map();
        this.autoSlideIntervals = new Map();
        this.cart = [];
        this.currentUser = null;
        this.userProfile = null;
        this.previousTotalQuantity = 0;
        this.editingOrder = null;
        this.editingOrderItems = [];
        this.currentProduct = null;
        this.modalCurrentImageIndex = 0;
        this.modalAutoSlideInterval = null;
        this.init();
    }

    async init() {
        this.setupAuthListeners();
        this.setupEventListeners();
        await this.loadProducts();
        this.renderProducts();
        this.renderCategories();
        this.updateCartUI();
    }

    setupAuthListeners() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            if (user) {
                await this.loadUserProfile(user.uid);
                this.showUserSection();
            } else {
                this.userProfile = null;
                this.showAuthSection();
                this.cart = [];
                this.updateCartUI();
            }
        });
    }

    async loadUserProfile(uid) {
        try {
            const userRef = ref(realtimeDb, `users/${uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                this.userProfile = snapshot.val();
                document.getElementById('userName').textContent = this.userProfile.fullName;
            } else {
                console.error('User profile does not exist in database');
                this.showNotification('Perfil de usuario no encontrado', 'error');
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.showNotification('Error al cargar el perfil de usuario', 'error');
        }
    }

    showUserSection() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('userSection').style.display = 'flex';
    }

    showAuthSection() {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('userSection').style.display = 'none';
    }

    setupEventListeners() {
        const authModal = document.getElementById('authModal');
        const loginBtn = document.getElementById('loginBtn');
        const closeAuthModal = document.getElementById('closeAuthModal');
        const logoutBtn = document.getElementById('logoutBtn');
        const historyBtn = document.getElementById('historyBtn');

        loginBtn.addEventListener('click', () => {
            authModal.classList.add('show');
        });

        closeAuthModal.addEventListener('click', () => {
            authModal.classList.remove('show');
        });

        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.remove('show');
            }
        });

        logoutBtn.addEventListener('click', () => {
            this.logout();
        });

        historyBtn.addEventListener('click', () => {
            this.showHistoryModal();
        });

        const authTabs = document.querySelectorAll('.auth-tab');
        const authForms = document.querySelectorAll('.auth-form');

        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                authTabs.forEach(t => t.classList.remove('active'));
                authForms.forEach(f => f.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(targetTab + 'Form').classList.add('active');
            });
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        const cartModal = document.getElementById('cartModal');
        const cartButton = document.getElementById('cartButton');
        const closeCartModal = document.getElementById('closeCartModal');
        const clearCart = document.getElementById('clearCart');
        const checkoutBtn = document.getElementById('checkoutBtn');

        cartButton.addEventListener('click', () => {
            cartModal.classList.add('show');
        });

        closeCartModal.addEventListener('click', () => {
            cartModal.classList.remove('show');
        });

        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                cartModal.classList.remove('show');
            }
        });

        clearCart.addEventListener('click', () => {
            this.clearCart();
        });

        checkoutBtn.addEventListener('click', () => {
            this.showDeliveryModal();
        });

        const deliveryModal = document.getElementById('deliveryModal');
        const closeDeliveryModal = document.getElementById('closeDeliveryModal');
        const deliveryForm = document.getElementById('deliveryForm');
        const deliveryTypeRadios = document.getElementsByName('deliveryType');
        const pickupFields = document.getElementById('pickupFields');
        const deliveryFields = document.getElementById('deliveryFields');

        closeDeliveryModal.addEventListener('click', () => {
            deliveryModal.classList.remove('show');
        });

        deliveryModal.addEventListener('click', (e) => {
            if (e.target === deliveryModal) {
                deliveryModal.classList.remove('show');
            }
        });

        deliveryTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'pickup') {
                    pickupFields.style.display = 'block';
                    deliveryFields.style.display = 'none';
                    deliveryFields.querySelectorAll('input, textarea').forEach(field => field.removeAttribute('required'));
                    document.getElementById('pickupStore').setAttribute('required', 'true');
                } else {
                    pickupFields.style.display = 'none';
                    deliveryFields.style.display = 'block';
                    deliveryFields.querySelectorAll('input').forEach(field => field.setAttribute('required', 'true'));
                    document.getElementById('pickupStore').removeAttribute('required');
                }
            });
        });

        deliveryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDeliverySubmit();
        });

        const historyModal = document.getElementById('historyModal');
        const closeHistoryModal = document.getElementById('closeHistoryModal');

        closeHistoryModal.addEventListener('click', () => {
            historyModal.classList.remove('show');
        });

        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) {
                historyModal.classList.remove('show');
            }
        });

        // Edit Order Modal
        const editOrderModal = document.getElementById('editOrderModal');
        const closeEditOrderModal = document.getElementById('closeEditOrderModal');
        const editTabs = document.querySelectorAll('.edit-tab');
        const editTabContents = document.querySelectorAll('.edit-tab-content');
        const catalogSearch = document.getElementById('catalogSearch');
        const cancelEdit = document.getElementById('cancelEdit');
        const saveEdit = document.getElementById('saveEdit');

        closeEditOrderModal.addEventListener('click', () => {
            editOrderModal.classList.remove('show');
        });

        editOrderModal.addEventListener('click', (e) => {
            if (e.target === editOrderModal) {
                editOrderModal.classList.remove('show');
            }
        });

        editTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                editTabs.forEach(t => t.classList.remove('active'));
                editTabContents.forEach(content => content.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(targetTab + 'Tab').classList.add('active');
            });
        });

        catalogSearch.addEventListener('input', () => {
            this.filterCatalogProducts();
        });

        cancelEdit.addEventListener('click', () => {
            editOrderModal.classList.remove('show');
            this.editingOrder = null;
            this.editingOrderItems = [];
        });

        saveEdit.addEventListener('click', () => {
            this.saveOrderEdit();
        });

        // Product Modal
        const productModal = document.getElementById('productModal');
        const closeProductModal = document.getElementById('closeProductModal');
        const modalDecreaseBtn = document.getElementById('modalDecreaseBtn');
        const modalIncreaseBtn = document.getElementById('modalIncreaseBtn');
        const modalQuantityInput = document.getElementById('modalQuantityInput');
        const modalAddToCart = document.getElementById('modalAddToCart');
        const modalViewCart = document.getElementById('modalViewCart');

        closeProductModal.addEventListener('click', () => {
            this.closeProductModal();
        });

        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) {
                this.closeProductModal();
            }
        });

        modalDecreaseBtn.addEventListener('click', () => {
            const current = parseInt(modalQuantityInput.value);
            if (current > 1) {
                modalQuantityInput.value = current - 1;
            }
        });

        modalIncreaseBtn.addEventListener('click', () => {
            const current = parseInt(modalQuantityInput.value);
            const stock = this.currentProduct ? (this.currentProduct.stock || 0) : 0;
            if (current < stock) {
                modalQuantityInput.value = current + 1;
            } else {
                this.showNotification(`Stock máximo: ${stock}`, 'warning');
            }
        });

        modalQuantityInput.addEventListener('change', () => {
            const value = parseInt(modalQuantityInput.value);
            const stock = this.currentProduct ? (this.currentProduct.stock || 0) : 0;
            if (value < 1) {
                modalQuantityInput.value = 1;
            } else if (value > stock) {
                modalQuantityInput.value = stock;
                this.showNotification(`Stock máximo: ${stock}`, 'warning');
            }
        });

        modalAddToCart.addEventListener('click', () => {
            if (this.currentProduct) {
                const quantity = parseInt(modalQuantityInput.value);
                this.addToCartWithQuantity(this.currentProduct.id, quantity);
                this.closeProductModal();
            }
        });

        modalViewCart.addEventListener('click', () => {
            this.closeProductModal();
            cartModal.classList.add('show');
        });

        const categoryFilter = document.getElementById('categoryFilter');
        const searchInput = document.getElementById('searchInput');
        const searchInputMain = document.getElementById('searchInput'); // Main search bar
        const searchButton = document.querySelector('.search-button');

        categoryFilter.addEventListener('change', () => this.filterProducts());
        searchInput.addEventListener('input', () => this.filterProducts());
        
        // Add functionality to main search bar
        if (searchInputMain) {
            searchInputMain.addEventListener('input', () => this.filterProducts());
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', () => this.filterProducts());
        }

        // Add keyboard support for closing modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (productModal.classList.contains('show')) {
                    this.closeProductModal();
                }
            }
        });
    }

    openProductModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.currentProduct = product;
        this.modalCurrentImageIndex = 0;

        // Update modal content
        document.getElementById('breadcrumbCategory').textContent = product.category;
        document.getElementById('breadcrumbProduct').textContent = product.name;
        document.getElementById('modalProductName').textContent = product.name;
        document.getElementById('modalProductBrand').textContent = 'VAHM SHOP';
        
        const individualPrice = product.price || product.individualPrice || 0;
        const wholesalePrice = product.wholesalePrice || individualPrice * 0.8;
        
        document.getElementById('modalProductPrice').textContent = `$${individualPrice.toFixed(2)}`;
        document.getElementById('modalProductSku').textContent = product.id;
        
        // Stock status
        const stock = product.stock || 0;
        const stockElement = document.getElementById('modalProductStock');
        stockElement.className = `modal-product-stock ${this.getStockStatusClass(stock)}`;
        stockElement.innerHTML = `<i class="fas fa-boxes"></i> ${this.getStockStatusText(stock)}`;
        
        // Description
        document.getElementById('modalProductDescription').innerHTML = this.formatDescription(product.description);
        
        // Prices
        document.getElementById('modalIndividualPrice').textContent = `$${individualPrice.toFixed(2)}`;
        document.getElementById('modalWholesalePrice').textContent = `$${wholesalePrice.toFixed(2)}`;
        
        // Quantity controls
        const quantityInput = document.getElementById('modalQuantityInput');
        quantityInput.value = 1;
        quantityInput.max = stock;
        
        // Add to cart button
        const addToCartBtn = document.getElementById('modalAddToCart');
        if (stock === 0) {
            addToCartBtn.disabled = true;
            addToCartBtn.innerHTML = '<i class="fas fa-times-circle"></i> Sin Stock';
        } else {
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Agregar al carrito';
        }

        // Setup carousel
        this.setupModalCarousel(product);
        
        // Show modal
        document.getElementById('productModal').classList.add('show');
    }

    setupModalCarousel(product) {
        const images = product.images || [product.imageUrl];
        const container = document.getElementById('modalCarouselContainer');
        const indicators = document.getElementById('modalCarouselIndicators');
        
        // Clear existing content
        container.innerHTML = '';
        indicators.innerHTML = '';
        
        // Add images
        images.forEach((imageUrl, index) => {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = product.name;
            img.style.display = index === 0 ? 'block' : 'none';
            img.onerror = () => {
                img.src = 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop';
            };
            container.appendChild(img);
        });
        
        // Add indicators if more than one image
        if (images.length > 1) {
            images.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
                dot.onclick = () => this.goToModalImage(index);
                indicators.appendChild(dot);
            });
            
            // Start auto-slide
            this.startModalAutoSlide(images.length);
        }
    }

    goToModalImage(index) {
        const images = document.querySelectorAll('#modalCarouselContainer img');
        const dots = document.querySelectorAll('#modalCarouselIndicators .carousel-dot');
        
        // Hide current image
        if (images[this.modalCurrentImageIndex]) {
            images[this.modalCurrentImageIndex].style.display = 'none';
        }
        if (dots[this.modalCurrentImageIndex]) {
            dots[this.modalCurrentImageIndex].classList.remove('active');
        }
        
        // Show new image
        this.modalCurrentImageIndex = index;
        if (images[this.modalCurrentImageIndex]) {
            images[this.modalCurrentImageIndex].style.display = 'block';
        }
        if (dots[this.modalCurrentImageIndex]) {
            dots[this.modalCurrentImageIndex].classList.add('active');
        }
    }

    startModalAutoSlide(totalImages) {
        if (this.modalAutoSlideInterval) {
            clearInterval(this.modalAutoSlideInterval);
        }
        
        if (totalImages > 1) {
            this.modalAutoSlideInterval = setInterval(() => {
                const nextIndex = (this.modalCurrentImageIndex + 1) % totalImages;
                this.goToModalImage(nextIndex);
            }, 4000);
        }
    }

    closeProductModal() {
        document.getElementById('productModal').classList.remove('show');
        if (this.modalAutoSlideInterval) {
            clearInterval(this.modalAutoSlideInterval);
            this.modalAutoSlideInterval = null;
        }
        this.currentProduct = null;
        this.modalCurrentImageIndex = 0;
    }

    shareProduct(platform) {
        if (!this.currentProduct) return;
        
        const productUrl = window.location.href;
        const productName = this.currentProduct.name;
        const productPrice = this.currentProduct.price || this.currentProduct.individualPrice || 0;
        const text = `¡Mira este producto! ${productName} - $${productPrice.toFixed(2)} en VAHM SHOP`;
        
        let shareUrl = '';
        
        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + productUrl)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(productUrl)}`;
                break;
            case 'link':
                navigator.clipboard.writeText(productUrl).then(() => {
                    this.showNotification('Enlace copiado al portapapeles', 'success');
                }).catch(() => {
                    this.showNotification('No se pudo copiar el enlace', 'error');
                });
                return;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showNotification('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            this.showNotification('¡Bienvenido de vuelta!', 'success');
            document.getElementById('authModal').classList.remove('show');
            document.getElementById('loginForm').reset();
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
            
            this.showNotification(errorMessage, 'error');
        }
    }

    async handleRegister() {
        const fullName = document.getElementById('registerName').value.trim();
        const phone = document.getElementById('registerPhone').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const location = document.getElementById('registerLocation').value.trim();

        if (!fullName || !phone || !email || !password || !location) {
            this.showNotification('Por favor completa todos los campos', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userProfile = {
                uid: user.uid,
                fullName,
                phone,
                email,
                location,
                createdAt: Date.now()
            };

            await set(ref(realtimeDb, `users/${user.uid}`), userProfile);
            
            this.userProfile = userProfile;
            this.showNotification('¡Cuenta creada exitosamente!', 'success');
            document.getElementById('authModal').classList.remove('show');
            document.getElementById('registerForm').reset();
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
            
            this.showNotification(errorMessage, 'error');
        }
    }

    async logout() {
        try {
            await signOut(auth);
            this.cart = [];
            this.updateCartUI();
            this.showNotification('Sesión cerrada correctamente', 'info');
        } catch (error) {
            console.error('Error logging out:', error);
            this.showNotification('Error al cerrar sesión', 'error');
        }
    }

    showDeliveryModal() {
        if (!this.currentUser || !this.userProfile) {
            this.showNotification('Debes iniciar sesión para realizar un pedido', 'error');
            return;
        }

        if (this.cart.length === 0) {
            this.showNotification('Tu carrito está vacío', 'error');
            return;
        }

        document.getElementById('deliveryModal').classList.add('show');
        document.getElementById('deliveryForm').reset();
        document.getElementById('pickupFields').style.display = 'block';
        document.getElementById('deliveryFields').style.display = 'none';
        document.getElementById('pickupStore').setAttribute('required', 'true');
        document.getElementById('deliveryFields').querySelectorAll('input').forEach(field => field.removeAttribute('required'));
    }

    async showHistoryModal() {
        if (!this.currentUser || !this.userProfile) {
            this.showNotification('Debes iniciar sesión para ver tu historial de pedidos', 'error');
            return;
        }

        await this.loadOrderHistory();
        document.getElementById('historyModal').classList.add('show');
    }

    async loadOrderHistory() {
        try {
            console.log('Fetching orders for user:', this.currentUser.uid);
            const ordersRef = ref(realtimeDb, 'orders');
            const snapshot = await get(ordersRef);

            const userOrders = [];
            if (snapshot.exists()) {
                const allOrders = snapshot.val();
                Object.keys(allOrders).forEach(key => {
                    if (allOrders[key].userId === this.currentUser.uid) {
                        console.log('Order found for user:', key, allOrders[key]);
                        userOrders.push({ id: key, ...allOrders[key] });
                    }
                });
            } else {
                console.log('No orders found in database');
            }

            if (userOrders.length === 0) {
                console.log('No orders found for user:', this.currentUser.uid);
                this.showNotification('No se encontraron pedidos para este usuario', 'info');
            }

            this.renderOrderHistory(userOrders);
        } catch (error) {
            console.error('Error loading order history:', error);
            this.showNotification(`Error al cargar el historial de pedidos: ${error.message}`, 'error');
            this.renderOrderHistory([]);
        }
    }

    renderOrderHistory(orders) {
        const historyItems = document.getElementById('historyItems');

        if (orders.length === 0) {
            historyItems.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock-rotate-left"></i>
                    <h3>Sin Pedidos</h3>
                    <p>Aún no has realizado ningún pedido.</p>
                </div>
            `;
            return;
        }

        historyItems.innerHTML = orders.map(order => {
            const statusText = order.status === 'completed' ? 'Completado' : order.status === 'cancelRequested' ? 'Cancelación Solicitada' : order.status === 'cancelled' ? 'Cancelado' : 'En Curso';
            const statusClass = order.status === 'completed' ? 'completed' : order.status === 'cancelRequested' ? 'cancel-requested' : order.status === 'cancelled' ? 'cancelled' : 'pending';
            let actionButtons = '';
            if (order.status === 'pending') {
                actionButtons = `
                    <div class="history-item-actions">
                        <button class="action-btn edit-btn" onclick="ecommerceManager.editOrder('${order.id}')">
                            <i class="fas fa-pen-to-square"></i> Editar
                        </button>
                        <button class="action-btn cancel-btn" onclick="ecommerceManager.cancelOrder('${order.id}')">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                `;
            }

            let deliveryInfo = '';
            if (order.deliveryInfo && order.deliveryInfo.type === 'pickup') {
                deliveryInfo = `Recoger en Tienda: ${order.deliveryInfo.store || 'No especificado'}`;
            } else if (order.deliveryInfo) {
                deliveryInfo = `Envío a Domicilio: ${order.deliveryInfo.street || ''}, ${order.deliveryInfo.city || ''}, ${order.deliveryInfo.state || ''}, ${order.deliveryInfo.zip || ''}<br>Instrucciones: ${order.deliveryInfo.instructions || 'Ninguna'}`;
            } else {
                deliveryInfo = 'Información de entrega no disponible';
            }

            const itemsList = order.items && order.items.length > 0 ? order.items.map(item => `
                <li>
                    ${item.name || 'Producto desconocido'} - Cantidad: ${item.quantity || 0} - $${(item.unitPrice || 0).toFixed(2)} c/u (${item.priceType || 'N/A'})<br>
                    Subtotal: $${(item.totalPrice || 0).toFixed(2)}
                </li>
            `).join('') : '<li>No hay productos en este pedido</li>';

            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <div class="history-item-date">${order.timestamp ? new Date(order.timestamp).toLocaleString('es-ES') : 'Fecha no disponible'}</div>
                        <div class="history-item-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="history-item-details">
                        <p><strong>Cliente:</strong> ${order.userInfo && order.userInfo.fullName ? order.userInfo.fullName : 'No especificado'}</p>
                        <p><strong>Entrega:</strong> ${deliveryInfo}</p>
                        <ul>${itemsList}</ul>
                        <div class="history-item-total">Total: $${(order.total || 0).toFixed(2)}</div>
                        ${actionButtons}
                    </div>
                </div>
            `;
        }).join('');
    }

    async cancelOrder(orderId) {
        if (!confirm('¿Estás seguro de que deseas cancelar este pedido? Requiere aprobación del administrador.')) {
            return;
        }

        try {
            const orderRef = ref(realtimeDb, `orders/${orderId}`);
            await update(orderRef, {
                status: 'cancelRequested',
                cancelRequestedAt: Date.now()
            });
            this.showNotification('Solicitud de cancelación enviada. Espera la aprobación del administrador.', 'info');
            await this.loadOrderHistory();
        } catch (error) {
            console.error('Error requesting order cancellation:', error);
            this.showNotification('Error al solicitar la cancelación del pedido', 'error');
        }
    }

    async editOrder(orderId) {
        try {
            const orderRef = ref(realtimeDb, `orders/${orderId}`);
            const snapshot = await get(orderRef);
            
            if (!snapshot.exists()) {
                this.showNotification('Pedido no encontrado', 'error');
                return;
            }

            const order = snapshot.val();
            if (order.status !== 'pending') {
                this.showNotification('No se puede editar un pedido que no está en curso', 'error');
                return;
            }

            this.editingOrder = { id: orderId, ...order };
            this.editingOrderItems = [...order.items];
            
            this.renderEditOrderModal();
            document.getElementById('editOrderModal').classList.add('show');
        } catch (error) {
            console.error('Error loading order for edit:', error);
            this.showNotification('Error al cargar el pedido', 'error');
        }
    }

    renderEditOrderModal() {
        this.renderCurrentOrderItems();
        this.renderCatalogProducts();
        this.updateEditOrderTotal();
    }

    renderCurrentOrderItems() {
        const container = document.getElementById('currentOrderItems');
        
        if (this.editingOrderItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>Sin Productos</h3>
                    <p>No hay productos en este pedido.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.editingOrderItems.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price-info">
                        <div class="cart-item-unit-price">$${item.unitPrice.toFixed(2)} c/u (${item.priceType})</div>
                        <div class="cart-item-total-price">Subtotal: $${item.totalPrice.toFixed(2)}</div>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <button onclick="ecommerceManager.decreaseEditQuantity('${item.id}')">-</button>
                    <span class="cart-item-quantity">${item.quantity}</span>
                    <button onclick="ecommerceManager.increaseEditQuantity('${item.id}')">+</button>
                </div>
                <button class="remove-item" onclick="ecommerceManager.removeFromEdit('${item.id}')">
                    <i class="fas fa-trash-can"></i>
                </button>
            </div>
        `).join('');
    }

    renderCatalogProducts() {
        const container = document.getElementById('catalogProducts');
        const searchTerm = document.getElementById('catalogSearch').value.toLowerCase();
        
        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );

        if (filteredProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Sin Resultados</h3>
                    <p>No se encontraron productos.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredProducts.map(product => {
            const individualPrice = product.price || product.individualPrice || 0;
            const wholesalePrice = product.wholesalePrice || individualPrice * 0.8;
            
            return `
                <div class="catalog-product">
                    <div class="catalog-product-info">
                        <div class="catalog-product-name">${product.name}</div>
                        <div class="catalog-product-price">
                            Individual: $${individualPrice.toFixed(2)} | Mayoreo: $${wholesalePrice.toFixed(2)}
                        </div>
                    </div>
                    <button class="add-to-edit-btn" onclick="ecommerceManager.addToEdit('${product.id}')">
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </div>
            `;
        }).join('');
    }

    filterCatalogProducts() {
        this.renderCatalogProducts();
    }

    addToEdit(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = this.editingOrderItems.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.editingOrderItems.push({
                id: productId,
                name: product.name,
                quantity: 1,
                unitPrice: product.price || product.individualPrice || 0,
                wholesalePrice: product.wholesalePrice || (product.price || product.individualPrice || 0) * 0.8,
                totalPrice: product.price || product.individualPrice || 0,
                priceType: 'individual'
            });
        }

        this.updateEditOrderPricing();
        this.renderCurrentOrderItems();
        this.updateEditOrderTotal();
        this.showNotification(`${product.name} agregado al pedido`, 'success');
    }

    increaseEditQuantity(productId) {
        const item = this.editingOrderItems.find(i => i.id === productId);
        if (item) {
            item.quantity += 1;
            this.updateEditOrderPricing();
            this.renderCurrentOrderItems();
            this.updateEditOrderTotal();
        }
    }

    decreaseEditQuantity(productId) {
        const item = this.editingOrderItems.find(i => i.id === productId);
        if (item && item.quantity > 1) {
            item.quantity -= 1;
            this.updateEditOrderPricing();
            this.renderCurrentOrderItems();
            this.updateEditOrderTotal();
        } else if (item) {
            this.removeFromEdit(productId);
        }
    }

    removeFromEdit(productId) {
        this.editingOrderItems = this.editingOrderItems.filter(item => item.id !== productId);
        this.updateEditOrderPricing();
        this.renderCurrentOrderItems();
        this.updateEditOrderTotal();
        this.showNotification('Producto removido del pedido', 'info');
    }

    updateEditOrderPricing() {
        const totalQuantity = this.editingOrderItems.reduce((sum, item) => sum + item.quantity, 0);
        
        this.editingOrderItems.forEach(item => {
            const product = this.products.find(p => p.id === item.id);
            if (totalQuantity >= 10 && product && product.wholesalePrice) {
                item.unitPrice = product.wholesalePrice;
                item.priceType = 'wholesale';
            } else {
                item.unitPrice = product ? (product.price || product.individualPrice || 0) : item.unitPrice;
                item.priceType = 'individual';
            }
            item.totalPrice = item.quantity * item.unitPrice;
        });
    }

    updateEditOrderTotal() {
        const total = this.editingOrderItems.reduce((sum, item) => sum + item.totalPrice, 0);
        document.getElementById('editOrderTotal').textContent = `$${total.toFixed(2)}`;
    }

    async saveOrderEdit() {
        if (this.editingOrderItems.length === 0) {
            this.showNotification('No puedes guardar un pedido vacío', 'error');
            return;
        }

        try {
            const total = this.editingOrderItems.reduce((sum, item) => sum + item.totalPrice, 0);
            const orderRef = ref(realtimeDb, `orders/${this.editingOrder.id}`);
            
            await update(orderRef, {
                items: this.editingOrderItems,
                total: total,
                editedAt: Date.now()
            });

            this.showNotification('Pedido actualizado exitosamente', 'success');
            document.getElementById('editOrderModal').classList.remove('show');
            this.editingOrder = null;
            this.editingOrderItems = [];
            await this.loadOrderHistory();
        } catch (error) {
            console.error('Error saving order edit:', error);
            this.showNotification('Error al guardar los cambios', 'error');
        }
    }

    async handleDeliverySubmit() {
        const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
        let deliveryInfo = {};

        if (deliveryType === 'pickup') {
            const store = document.getElementById('pickupStore').value;
            if (!store) {
                this.showNotification('Por favor selecciona una tienda', 'error');
                return;
            }
            deliveryInfo = {
                type: 'pickup',
                store: store
            };
        } else {
            const street = document.getElementById('deliveryStreet').value.trim();
            const city = document.getElementById('deliveryCity').value.trim();
            const state = document.getElementById('deliveryState').value.trim();
            const zip = document.getElementById('deliveryZip').value.trim();
            const instructions = document.getElementById('deliveryInstructions').value.trim();

            if (!street || !city || !state || !zip) {
                this.showNotification('Por favor completa todos los campos de la dirección', 'error');
                return;
            }

            deliveryInfo = {
                type: 'delivery',
                street,
                city,
                state,
                zip,
                instructions: instructions || 'Ninguna'
            };
        }

        await this.checkout(deliveryInfo);
    }

    async checkout(deliveryInfo) {
        if (!this.currentUser || !this.userProfile) {
            this.showNotification('Debes iniciar sesión para realizar un pedido', 'error');
            return;
        }

        if (this.cart.length === 0) {
            this.showNotification('Tu carrito está vacío', 'error');
            return;
        }

        // Check stock availability before processing order
        for (const item of this.cart) {
            const product = this.products.find(p => p.id === item.id);
            if (!product) {
                this.showNotification(`Producto ${item.name} no encontrado`, 'error');
                return;
            }
            
            const currentStock = product.stock || 0;
            if (currentStock < item.quantity) {
                this.showNotification(`Stock insuficiente para ${item.name}. Stock disponible: ${currentStock}`, 'error');
                return;
            }
        }

        const total = this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
        const orderRef = push(ref(realtimeDb, 'orders'));
        const orderId = orderRef.key;

        const orderData = {
            id: orderId,
            userId: this.currentUser.uid,
            userInfo: {
                fullName: this.userProfile.fullName,
                email: this.userProfile.email,
                phone: this.userProfile.phone,
                location: this.userProfile.location
            },
            items: this.cart,
            total: total,
            timestamp: Date.now(),
            status: 'pending',
            deliveryInfo: deliveryInfo
        };

        try {
            // Place the order
            await set(orderRef, orderData);

            // Update stock for each item
            for (const item of this.cart) {
                const product = this.products.find(p => p.id === item.id);
                if (product) {
                    const productRef = doc(db, 'products', item.id);
                    const newStock = (product.stock || 0) - item.quantity;
                    await updateDoc(productRef, {
                        stock: Math.max(0, newStock) // Ensure stock doesn't go negative
                    });
                }
            }

            this.showNotification('Pedido realizado con éxito. Revisa tu historial.', 'success');

            // Generate WhatsApp message
            const whatsappMessage = this.generateWhatsAppMessage(orderData);
            const whatsappUrl = `https://wa.me/525627274791?text=${encodeURIComponent(whatsappMessage)}`;
            
            // Redirect to WhatsApp with improved mobile compatibility
            if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                // Mobile device
                window.location.href = whatsappUrl;
            } else {
                // Desktop
                window.open(whatsappUrl, '_blank');
            }

            this.cart = [];
            this.updateCartUI();
            document.getElementById('deliveryModal').classList.remove('show');
            
            // Reload products to update stock display
            await this.loadProducts();
            this.renderProducts();
        } catch (error) {
            console.error('Error placing order:', error);
            this.showNotification('Error al realizar el pedido', 'error');
        }
    }

    generateWhatsAppMessage(orderData) {
        let message = `*📋 NUEVO PEDIDO - VAHM SHOP*\n`;
        message += `═══════════════════════════════\n`;
        message += `🗓️ *Fecha:* ${new Date(orderData.timestamp).toLocaleString('es-ES')}\n`;
        message += `👤 *Cliente:* ${orderData.userInfo.fullName}\n`;
        message += `📧 *Email:* ${orderData.userInfo.email}\n`;
        message += `📱 *Teléfono:* ${orderData.userInfo.phone}\n`;
        message += `📍 *Ubicación:* ${orderData.userInfo.location}\n\n`;
        
        message += `🛒 *PRODUCTOS SOLICITADOS:*\n`;
        message += `═══════════════════════════════\n`;
        
        orderData.items.forEach((item, index) => {
            message += `${index + 1}. *${item.name}*\n`;
            message += `   📦 Cantidad: ${item.quantity}\n`;
            message += `   💰 Precio: $${item.unitPrice.toFixed(2)} (${item.priceType === 'wholesale' ? 'Mayoreo' : 'Individual'})\n`;
            message += `   💵 Subtotal: $${item.totalPrice.toFixed(2)}\n`;
            message += `   ─────────────────────────\n`;
        });
        
        message += `\n💎 *TOTAL DEL PEDIDO: $${orderData.total.toFixed(2)}*\n\n`;
        
        message += `🚚 *INFORMACIÓN DE ENTREGA:*\n`;
        message += `═══════════════════════════════\n`;
        if (orderData.deliveryInfo.type === 'pickup') {
            message += `📍 *Tipo:* Recoger en Tienda\n`;
            message += `🏪 *Tienda:* ${orderData.deliveryInfo.store}\n`;
        } else {
            message += `🚛 *Tipo:* Envío a Domicilio\n`;
            message += `🏠 *Dirección:* ${orderData.deliveryInfo.street}\n`;
            message += `🌆 *Ciudad:* ${orderData.deliveryInfo.city}\n`;
            message += `🏙️ *Estado:* ${orderData.deliveryInfo.state}\n`;
            message += `📮 *C.P.:* ${orderData.deliveryInfo.zip}\n`;
            if (orderData.deliveryInfo.instructions) {
                message += `📝 *Instrucciones:* ${orderData.deliveryInfo.instructions}\n`;
            }
        }
        
        message += `\n🆔 *ID del Pedido:* ${orderData.id}\n`;
        message += `═══════════════════════════════\n`;
        message += `✅ *Por favor confirma la recepción de este pedido*\n`;
        message += `🙏 ¡Gracias por elegir VAHM SHOP!`;

        return message;
    }

    async loadProducts() {
        try {
            const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            this.products = [];
            this.categories.clear();
            
            querySnapshot.forEach((doc) => {
                const product = { id: doc.id, ...doc.data() };
                this.products.push(product);
                
                if (!this.categories.has(product.category)) {
                    this.categories.set(product.category, []);
                }
                this.categories.get(product.category).push(product);
            });
            
            this.filteredProducts = [...this.products];
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Error al cargar los productos');
        }
    }

    renderCategories() {
        const categoryFilter = document.getElementById('categoryFilter');
        const currentValue = categoryFilter.value;
        
        categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
        
        this.categories.forEach((products, category) => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
        
        categoryFilter.value = currentValue;
    }

    formatDescription(description) {
        if (!description) return '';
        
        if (description.includes('<') && description.includes('>')) {
            return description;
        }
        
        const items = description
            .split(/[.,;-]/)
            .map(item => item.trim())
            .filter(item => item.length > 0);
        
        if (items.length <= 1) {
            return `<p>${description}</p>`;
        }
        
        return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
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

    renderProducts() {
        const container = document.getElementById('categoriesContainer');
        
        this.autoSlideIntervals.forEach(interval => clearInterval(interval));
        this.autoSlideIntervals.clear();
        
        if (this.filteredProducts.length === 0) {
            if (this.products.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h3>Catálogo en Preparación</h3>
                        <p>Nuestros productos premium estarán disponibles muy pronto.</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>Sin Resultados</h3>
                        <p>No encontramos productos que coincidan con tu búsqueda.</p>
                    </div>
                `;
            }
            return;
        }

        const categorizedProducts = new Map();
        this.filteredProducts.forEach(product => {
            if (!categorizedProducts.has(product.category)) {
                categorizedProducts.set(product.category, []);
            }
            categorizedProducts.get(product.category).push(product);
        });

        const categoriesHTML = Array.from(categorizedProducts.entries()).map(([category, products]) => {
            const productsHTML = products.map(product => {
                const images = product.images || [product.imageUrl];
                const individualPrice = product.price || product.individualPrice || 0;
                const wholesalePrice = product.wholesalePrice || individualPrice * 0.8;
                const stock = product.stock || 0;
                const stockClass = this.getStockStatusClass(stock);
                const stockText = this.getStockStatusText(stock);

                return `
                    <div class="product-card" onclick="ecommerceManager.openProductModal('${product.id}')">
                        <div class="product-image-section">
                            <div class="image-carousel" data-product-id="${product.id}">
                                <div class="carousel-container">
                                    ${images.map(img => `
                                        <img src="${img}" alt="${product.name}" class="carousel-image" 
                                             onerror="this.src='https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=350&h=350&fit=crop'">
                                    `).join('')}
                                </div>
                                ${images.length > 1 ? `
                                    <div class="carousel-indicators">
                                        ${images.map((_, i) => `
                                            <div class="carousel-dot ${i === 0 ? 'active' : ''}" 
                                                 onclick="event.stopPropagation(); ecommerceManager.goToImage('${product.id}', ${i})"></div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            ${images.length > 1 ? `
                                <div class="image-count">
                                    <i class="fas fa-images"></i>
                                    ${images.length} imágenes
                                </div>
                            ` : ''}
                        </div>
                        <div class="product-content">
                            <div class="product-category">
                                <i class="fas fa-tag"></i>
                                ${product.category}
                            </div>
                            <h3 class="product-name">${product.name}</h3>
                            <div class="product-description">
                                ${this.formatDescription(product.description)}
                            </div>
                            <div class="product-stock ${stockClass}">
                                <i class="fas fa-boxes"></i>
                                ${stockText}
                            </div>
                            <div class="product-prices">
                                <div class="price-item price-individual">
                                    <span class="price-label">Individual</span>
                                    <span class="price-value">$${parseFloat(individualPrice).toFixed(2)}</span>
                                </div>
                                <div class="price-item price-wholesale">
                                    <span class="price-label">Mayoreo (10+)</span>
                                    <span class="price-value">$${parseFloat(wholesalePrice).toFixed(2)}</span>
                                </div>
                            </div>
                            <button class="add-to-cart ${stock === 0 ? 'disabled' : ''}" onclick="event.stopPropagation(); ecommerceManager.addToCart('${product.id}')" ${stock === 0 ? 'disabled' : ''}>
                                <i class="fas fa-${stock === 0 ? 'times-circle' : 'cart-plus'}"></i>
                                ${stock === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="category-section">
                    <div class="category-header">
                        <h2 class="category-title">${category}</h2>
                        <div class="category-divider"></div>
                    </div>
                    <div class="products-grid">
                        ${productsHTML}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = categoriesHTML;
        this.initializeCarousels();
    }

    initializeCarousels() {
        this.filteredProducts.forEach(product => {
            const images = product.images || [product.imageUrl];
            if (images.length > 1) {
                this.carousels.set(product.id, {
                    currentIndex: 0,
                    totalImages: images.length
                });
                this.startAutoSlide(product.id);
            }
        });
    }

    startAutoSlide(productId) {
        const interval = setInterval(() => {
            this.nextImage(productId);
        }, 5000);
        
        this.autoSlideIntervals.set(productId, interval);
    }

    nextImage(productId) {
        const carousel = this.carousels.get(productId);
        if (!carousel) return;

        carousel.currentIndex = (carousel.currentIndex + 1) % carousel.totalImages;
        this.updateCarousel(productId);
    }

    goToImage(productId, index) {
        const carousel = this.carousels.get(productId);
        if (!carousel) return;

        carousel.currentIndex = index;
        this.updateCarousel(productId);
    }

    updateCarousel(productId) {
        const carousel = document.querySelector(`.image-carousel[data-product-id="${productId}"]`);
        const images = carousel.querySelectorAll('.carousel-image');
        const dots = carousel.querySelectorAll('.carousel-dot');

        images.forEach((img, i) => img.style.display = i === this.carousels.get(productId).currentIndex ? 'block' : 'none');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === this.carousels.get(productId).currentIndex));
    }

    filterProducts() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

        this.filteredProducts = this.products.filter(product => {
            const matchesCategory = !categoryFilter || product.category === categoryFilter;
            const matchesSearch = !searchTerm || product.name.toLowerCase().includes(searchTerm) || 
                                 product.description.toLowerCase().includes(searchTerm) || 
                                 product.category.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });

        this.renderProducts();
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Check if product has stock
        const stock = product.stock || 0;
        if (stock === 0) {
            this.showNotification('Este producto no tiene stock disponible. Elige otro producto.', 'error');
            return;
        }

        // Check if adding one more would exceed stock
        const cartItem = this.cart.find(item => item.id === productId);
        const currentQuantityInCart = cartItem ? cartItem.quantity : 0;
        
        if (currentQuantityInCart >= stock) {
            this.showNotification(`Stock insuficiente. Solo quedan ${stock} unidades disponibles.`, 'error');
            return;
        }

        if (cartItem) {
            cartItem.quantity += 1;
        } else {
            this.cart.push({
                id: productId,
                name: product.name,
                quantity: 1,
                unitPrice: product.price || product.individualPrice || 0,
                wholesalePrice: product.wholesalePrice || (product.price || product.individualPrice || 0) * 0.8,
                totalPrice: product.price || product.individualPrice || 0,
                priceType: 'individual'
            });
        }

        this.updateCartPricing();
        this.updateCartUI();
        this.showNotification(`${product.name} agregado al carrito`, 'success');
    }

    addToCartWithQuantity(productId, quantity) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Check if product has stock
        const stock = product.stock || 0;
        if (stock === 0) {
            this.showNotification('Este producto no tiene stock disponible.', 'error');
            return;
        }

        // Check if adding this quantity would exceed stock
        const cartItem = this.cart.find(item => item.id === productId);
        const currentQuantityInCart = cartItem ? cartItem.quantity : 0;
        
        if (currentQuantityInCart + quantity > stock) {
            this.showNotification(`Stock insuficiente. Solo quedan ${stock} unidades disponibles.`, 'error');
            return;
        }

        if (cartItem) {
            cartItem.quantity += quantity;
        } else {
            this.cart.push({
                id: productId,
                name: product.name,
                quantity: quantity,
                unitPrice: product.price || product.individualPrice || 0,
                wholesalePrice: product.wholesalePrice || (product.price || product.individualPrice || 0) * 0.8,
                totalPrice: (product.price || product.individualPrice || 0) * quantity,
                priceType: 'individual'
            });
        }

        this.updateCartPricing();
        this.updateCartUI();
        this.showNotification(`${quantity} ${product.name} agregado(s) al carrito`, 'success');
    }

    increaseQuantity(productId) {
        const item = this.cart.find(i => i.id === productId);
        const product = this.products.find(p => p.id === productId);
        
        if (item && product) {
            const stock = product.stock || 0;
            if (item.quantity >= stock) {
                this.showNotification(`Stock insuficiente. Solo quedan ${stock} unidades disponibles.`, 'error');
                return;
            }
            
            item.quantity += 1;
            this.updateCartPricing();
            this.updateCartUI();
        }
    }

    decreaseQuantity(productId) {
        const item = this.cart.find(i => i.id === productId);
        if (item && item.quantity > 1) {
            item.quantity -= 1;
            this.updateCartPricing();
            this.updateCartUI();
        } else if (item) {
            this.removeFromCart(productId);
        }
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateCartPricing();
        this.updateCartUI();
        this.showNotification('Producto removido del carrito', 'info');
    }

    clearCart() {
        if (this.cart.length === 0) {
            this.showNotification('El carrito ya está vacío', 'info');
            return;
        }
        if (!confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
            return;
        }
        this.cart = [];
        this.updateCartUI();
        this.showNotification('Carrito vaciado', 'success');
    }

    updateCartPricing() {
        const currentTotalQuantity = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        this.cart.forEach(item => {
            const product = this.products.find(p => p.id === item.id);
            if (currentTotalQuantity >= 10 && product && product.wholesalePrice) {
                item.unitPrice = product.wholesalePrice;
                item.priceType = 'wholesale';
            } else {
                item.unitPrice = product ? (product.price || product.individualPrice || 0) : item.unitPrice;
                item.priceType = 'individual';
            }
            item.totalPrice = item.quantity * item.unitPrice;
        });
        
        // Show wholesale notification
        if (currentTotalQuantity >= 10 && this.previousTotalQuantity < 10) {
            const notification = document.getElementById('wholesaleNotification');
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        }
        
        this.previousTotalQuantity = currentTotalQuantity;
    }

    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        const cartTotalItems = document.getElementById('cartTotalItems');
        const cartPriceType = document.getElementById('cartPriceType');
        const checkoutBtn = document.getElementById('checkoutBtn');

        const totalQuantity = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = this.cart.length;
        cartTotalItems.textContent = `${totalQuantity} productos`;

        // Update price type indicator
        if (totalQuantity >= 10) {
            cartPriceType.textContent = 'PRECIO DE MAYOREO';
            cartPriceType.className = 'price-type-indicator wholesale';
        } else {
            cartPriceType.textContent = 'PRECIO INDIVIDUAL';
            cartPriceType.className = 'price-type-indicator individual';
        }

        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>Carrito Vacío</h3>
                    <p>Agrega productos desde el catálogo.</p>
                </div>
            `;
            cartTotal.textContent = '$0.00';
            cartTotalItems.textContent = '0 productos';
            cartPriceType.style.display = 'none';
            checkoutBtn.disabled = true;
        } else {
            cartItems.innerHTML = this.cart.map(item => {
                return `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-price-info">
                                <div class="cart-item-unit-price">$${item.unitPrice.toFixed(2)} c/u (${item.priceType})</div>
                                <div class="cart-item-total-price">Subtotal: $${item.totalPrice.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="cart-item-controls">
                            <button onclick="ecommerceManager.decreaseQuantity('${item.id}')">-</button>
                            <span class="cart-item-quantity">${item.quantity}</span>
                            <button onclick="ecommerceManager.increaseQuantity('${item.id}')">+</button>
                        </div>
                        <button class="remove-item" onclick="ecommerceManager.removeFromCart('${item.id}')">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>
                `;
            }).join('');
            
            const total = this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
            cartTotal.textContent = `$${total.toFixed(2)}`;
            cartPriceType.style.display = 'inline-block';
            checkoutBtn.disabled = false;
        }
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

    showError(message) {
        this.showNotification(message, 'error');
    }
}

const mp = new MercadoPago('APP_USR-bf8415ba-a2b4-4473-8174-8c836488c5af', { locale: 'es-MX' });

async function pagarConMercadoPago(carrito) {
  if (carrito.length === 0) {
    ecommerceManager.showNotification('Tu carrito está vacío', 'error');
    return;
  }

  // Prepara los items en el formato de Mercado Pago
  const items = carrito.map(item => ({
    title: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice
  }));

  try {
    // Llama a tu backend para crear la preferencia
    const res = await fetch('https://tu-backend.onrender.com/crear-preferencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    if (!res.ok) {
        console.error('Error al crear la preferencia:', await res.text());
        ecommerceManager.showNotification('Error al crear la preferencia de pago', 'error');
        return;
    }

    const data = await res.json();
    
    if (data.id) {
        // Abre el checkout de Mercado Pago
        mp.checkout({
            preference: { id: data.id },
            autoOpen: true,
        });
    } else {
        console.error('No se recibió el ID de preferencia');
        ecommerceManager.showNotification('No se pudo iniciar el pago', 'error');
    }

  } catch (error) {
      console.error('Error en pagarConMercadoPago:', error);
      ecommerceManager.showNotification('Error de conexión al iniciar el pago', 'error');
  }
}

window.ecommerceManager = new EcommerceManager();

document.getElementById('checkout-btn').addEventListener('click', () => {
  pagarConMercadoPago(ecommerceManager.cart);
});