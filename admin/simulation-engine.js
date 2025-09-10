// Sistema de Simulaciones de Ventas Automáticas
class SalesSimulationEngine {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.simulationData = {
            totalSales: 0,
            totalProfit: 0,
            totalLosses: 0,
            totalOrders: 0,
            productsSold: 0,
            simulatedCustomers: 0,
            startTime: null,
            endTime: null,
            currentDay: 0
        };
        
        this.categories = [];
        this.products = [];
        this.customers = this.generateCustomers();
        this.simulationInterval = null;
        this.charts = {};
        
        this.initializeEventListeners();
        
        // Esperar un poco para que el admin se cargue completamente
        setTimeout(() => {
            this.loadFirebaseData();
        }, 1000);
    }

         // Cargar datos reales de Firebase
     async loadFirebaseData() {
         try {
             this.addLogEntry('info', '🔍 Verificando disponibilidad del admin...');
             
             // Verificar si el admin está disponible
             if (window.adminManager && window.adminManager.database) {
                 this.addLogEntry('info', '✅ Usando conexión Firebase existente del admin');
                 await this.loadProductsFromExistingConnection();
                 return;
             }
             
             // Si no hay conexión existente, crear una nueva
             this.addLogEntry('info', '🔄 Admin no disponible, creando nueva conexión a Firebase');
             await this.createNewFirebaseConnection();
             
         } catch (error) {
             console.error('Error cargando datos de Firebase:', error);
             this.addLogEntry('error', `❌ Error cargando datos de Firebase: ${error.message}`);
             this.loadFallbackData();
         }
     }

    // Cargar productos usando la conexión existente del admin
    async loadProductsFromExistingConnection() {
        try {
            this.addLogEntry('info', '🔍 Verificando conexión Firebase del admin...');
            
            if (!window.adminManager) {
                throw new Error('No hay adminManager disponible');
            }
            
            this.addLogEntry('info', '✅ AdminManager encontrado');
            
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            
            // Crear conexión directa a Firestore
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
            const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            
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
            const firestore = getFirestore(app);
            
            // Usar Firestore
            const productsRef = collection(firestore, 'products');
            this.addLogEntry('info', '📡 Consultando productos en Firestore...');
            const productsSnapshot = await getDocs(productsRef);
             
             if (!productsSnapshot.empty) {
                 this.addLogEntry('info', `📦 Datos de productos encontrados en Firestore`);
                 
                 // Convertir documentos de Firestore a array
                 this.products = productsSnapshot.docs.map(doc => ({
                     id: doc.id,
                     ...doc.data()
                 }));
                 this.addLogEntry('info', `📊 Total de productos en Firestore: ${this.products.length}`);
                 
                 // Debug: mostrar estructura de datos
                 if (this.products.length > 0) {
                     const firstProduct = this.products[0];
                     this.addLogEntry('info', `🔍 Estructura del primer producto: ${JSON.stringify(firstProduct, null, 2)}`);
                 }
                 
                 // Filtrar productos que tengan datos válidos
                 const originalCount = this.products.length;
                 this.products = this.products.filter(product => {
                     const isValid = product && 
                                   product.name && 
                                   product.category &&
                                   product.price && 
                                   parseFloat(product.price) > 0;
                     
                     if (!isValid) {
                         this.addLogEntry('warning', `⚠️ Producto inválido filtrado: ${product ? product.name || 'Sin nombre' : 'null'}`);
                     }
                     return isValid;
                 });
                 
                 this.addLogEntry('info', `✅ Productos válidos después del filtrado: ${this.products.length} de ${originalCount}`);
                 
                 // Limitar precios a rangos realistas
                 this.products = this.products.map(product => ({
                     ...product,
                     price: Math.min(parseFloat(product.price), 1000), // Máximo $1000
                     wholesalePrice: Math.min(parseFloat(product.wholesalePrice || product.price * 0.8), 800)
                 }));
                 
                 // Extraer categorías únicas SOLO de productos reales de Firebase
                 const uniqueCategories = [...new Set(this.products.map(product => product.category))];
                 this.categories = uniqueCategories.filter(category => category && category.trim() !== '');
                 
                 this.addLogEntry('info', `🏷️ Categorías extraídas: ${uniqueCategories.join(', ')}`);
                 this.addLogEntry('info', `✅ Categorías válidas: ${this.categories.join(', ')}`);
                 
                 // Verificar que tenemos categorías reales
                 if (this.categories.length === 0) {
                     this.addLogEntry('error', '❌ No se encontraron categorías válidas en Firebase');
                     this.addLogEntry('error', '❌ Verifica que tus productos tengan categorías definidas');
                     this.loadFallbackData();
                     return;
                 }
                 
                 this.addLogEntry('success', `Cargados ${this.products.length} productos reales de Firebase`);
                 this.addLogEntry('success', `✅ CATEGORÍAS DE FIREBASE CARGADAS: ${this.categories.join(', ')}`);
                 this.addLogEntry('info', `Precios ajustados a rangos realistas (máx $1000)`);
                 
                 // Debug: mostrar algunos productos de ejemplo
                 if (this.products.length > 0) {
                     const sampleProducts = this.products.slice(0, 3);
                     sampleProducts.forEach((product, index) => {
                         this.addLogEntry('info', `Producto ${index + 1}: ${product.name} - ${product.category} - $${product.price}`);
                     });
                 }
                 
                 // Inicializar gráficos y rendimiento por categoría después de cargar datos
                 this.initializeCharts();
                 this.generateCategoryPerformance();
             } else {
                 this.addLogEntry('error', '❌ No se encontraron productos en Firebase');
                 this.addLogEntry('error', '❌ Verifica que tengas productos agregados en el panel de administración');
                 this.loadFallbackData();
             }
        } catch (error) {
            console.error('Error cargando productos:', error);
            this.addLogEntry('error', `Error cargando productos: ${error.message}`);
            this.loadFallbackData();
        }
    }

    // Crear nueva conexión a Firebase
    async createNewFirebaseConnection() {
        try {
            this.addLogEntry('info', '🔧 Inicializando nueva conexión Firebase...');
            
            // Importar Firebase dinámicamente
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
            const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            
            this.addLogEntry('info', '📦 Módulos Firebase cargados correctamente');
            
                         // Configuración de Firebase (usar la misma que el admin)
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
            
                                      this.addLogEntry('info', '🚀 Inicializando aplicación Firebase...');
             const app = initializeApp(firebaseConfig);
             const firestore = getFirestore(app);
             
             this.addLogEntry('info', '✅ Aplicación Firebase inicializada correctamente');
             
             // Cargar productos desde Firestore
             const productsRef = collection(firestore, 'products');
             this.addLogEntry('info', '📡 Consultando productos en Firestore...');
             const productsSnapshot = await getDocs(productsRef);
            
             if (!productsSnapshot.empty) {
                 this.addLogEntry('info', `📦 Datos de productos encontrados en Firestore`);
                 
                 // Convertir documentos de Firestore a array
                 this.products = productsSnapshot.docs.map(doc => ({
                     id: doc.id,
                     ...doc.data()
                 }));
                 this.addLogEntry('info', `📊 Total de productos en Firestore: ${this.products.length}`);
                 
                 // Debug: mostrar estructura de datos
                 if (this.products.length > 0) {
                     const firstProduct = this.products[0];
                     this.addLogEntry('info', `🔍 Estructura del primer producto: ${JSON.stringify(firstProduct, null, 2)}`);
                 }
                 
                 // Filtrar productos que tengan datos válidos
                 const originalCount = this.products.length;
                 this.products = this.products.filter(product => {
                     const isValid = product && 
                                   product.name && 
                                   product.category &&
                                   product.price && 
                                   parseFloat(product.price) > 0;
                     
                     if (!isValid) {
                         this.addLogEntry('warning', `⚠️ Producto inválido filtrado: ${product ? product.name || 'Sin nombre' : 'null'}`);
                     }
                     return isValid;
                 });
                 
                 this.addLogEntry('info', `✅ Productos válidos después del filtrado: ${this.products.length} de ${originalCount}`);
                 
                 // Limitar precios a rangos realistas
                 this.products = this.products.map(product => ({
                     ...product,
                     price: Math.min(parseFloat(product.price), 1000), // Máximo $1000
                     wholesalePrice: Math.min(parseFloat(product.wholesalePrice || product.price * 0.8), 800)
                 }));
                 
                 // Extraer categorías únicas SOLO de productos reales de Firebase
                 const uniqueCategories = [...new Set(this.products.map(product => product.category))];
                 this.categories = uniqueCategories.filter(category => category && category.trim() !== '');
                 
                 this.addLogEntry('info', `🏷️ Categorías extraídas: ${uniqueCategories.join(', ')}`);
                 this.addLogEntry('info', `✅ Categorías válidas: ${this.categories.join(', ')}`);
                 
                 // Verificar que tenemos categorías reales
                 if (this.categories.length === 0) {
                     this.addLogEntry('error', '❌ No se encontraron categorías válidas en Firebase');
                     this.addLogEntry('error', '❌ Verifica que tus productos tengan categorías definidas');
                     this.loadFallbackData();
                     return;
                 }
                 
                 this.addLogEntry('success', `Cargados ${this.products.length} productos reales de Firebase`);
                 this.addLogEntry('success', `✅ CATEGORÍAS DE FIREBASE CARGADAS: ${this.categories.join(', ')}`);
                 this.addLogEntry('info', `Precios ajustados a rangos realistas (máx $1000)`);
                 
                 // Debug: mostrar algunos productos de ejemplo
                 if (this.products.length > 0) {
                     const sampleProducts = this.products.slice(0, 3);
                     sampleProducts.forEach((product, index) => {
                         this.addLogEntry('info', `Producto ${index + 1}: ${product.name} - ${product.category} - $${product.price}`);
                     });
                 }
                 
                 // Inicializar gráficos y rendimiento por categoría después de cargar datos
                 this.initializeCharts();
                 this.generateCategoryPerformance();
             } else {
                 this.addLogEntry('error', '❌ No se encontraron productos en Firebase');
                 this.addLogEntry('error', '❌ Verifica que tengas productos agregados en el panel de administración');
                 this.loadFallbackData();
             }
        } catch (error) {
            console.error('Error creando conexión Firebase:', error);
            this.loadFallbackData();
        }
    }

    // Cargar datos de respaldo si Firebase falla
    loadFallbackData() {
        this.addLogEntry('warning', '⚠️ NO SE PUDIERON CARGAR CATEGORÍAS DE FIREBASE');
        this.addLogEntry('error', '❌ Usando datos de ejemplo - NO son tus categorías reales');
        
        // NO cargar categorías de ejemplo si no hay conexión a Firebase
        this.categories = [];
        this.products = [];
        
        // Mostrar mensaje de error en lugar de categorías falsas
        this.showFirebaseError();
    }
    
         // Mostrar error de Firebase
     showFirebaseError() {
         const grid = document.getElementById('categoryPerformanceGrid');
         if (!grid) return;
         
         grid.innerHTML = `
             <div class="category-performance-card" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                 <div class="category-performance-header">
                     <h4 style="color: #E74C3C;">❌ No se encontraron productos en Firebase</h4>
                 </div>
                 <div class="category-performance-stats">
                     <div class="stat">
                         <span class="stat-label">Estado:</span>
                         <span class="stat-value" style="color: #E74C3C;">Sin productos</span>
                     </div>
                     <div class="stat">
                         <span class="stat-label">Categorías:</span>
                         <span class="stat-value" style="color: #E74C3C;">0 encontradas</span>
                     </div>
                     <div class="stat">
                         <span class="stat-label">Productos:</span>
                         <span class="stat-value" style="color: #E74C3C;">0 cargados</span>
                     </div>
                     <div class="stat">
                         <span class="stat-label">Solución:</span>
                         <span class="stat-value" style="color: #F39C12;">Agregar productos en "Productos"</span>
                     </div>
                 </div>
                 <div style="margin-top: 1rem; padding: 1rem; background: rgba(243, 156, 18, 0.1); border-radius: 8px; border-left: 4px solid #F39C12;">
                     <p style="margin: 0; color: #F39C12; font-weight: 500;">
                         <i class="fas fa-info-circle"></i>
                         Para usar las simulaciones, primero agrega productos en la pestaña "Productos" del panel de administración.
                     </p>
                 </div>
             </div>
         `;
     }

    // NO generar productos de respaldo - solo usar Firebase

    // Generar clientes simulados
    generateCustomers() {
        const customers = [];
        const firstNames = ['Ana', 'Carlos', 'María', 'José', 'Laura', 'Miguel', 'Carmen', 'Antonio', 'Isabel', 'Francisco'];
        const lastNames = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín'];
        
        for (let i = 0; i < 100; i++) {
            customers.push({
                id: `customer_${i}`,
                name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
                email: `cliente${i}@email.com`,
                phone: `+52 55 ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9000) + 1000}`,
                location: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana'][Math.floor(Math.random() * 5)],
                purchaseHistory: [],
                preferences: this.categories.slice(0, Math.floor(Math.random() * 3) + 1)
            });
        }
        
        return customers;
    }

    // Inicializar event listeners
    initializeEventListeners() {
        document.getElementById('startSimulationBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('pauseSimulationBtn').addEventListener('click', () => this.pauseSimulation());
        document.getElementById('stopSimulationBtn').addEventListener('click', () => this.stopSimulation());
        document.getElementById('resetSimulationBtn').addEventListener('click', () => this.resetSimulation());
        document.getElementById('reloadFirebaseBtn').addEventListener('click', () => this.reloadFirebase());
        document.getElementById('clearLogBtn').addEventListener('click', () => this.clearLog());
        document.getElementById('exportLogBtn').addEventListener('click', () => this.exportLog());
    }

    // Inicializar gráficos
    initializeCharts() {
        this.initializeRealtimeSalesChart();
        this.initializeCategoryDistributionChart();
        this.initializeProfitLossChart();
    }

    // Gráfico de ventas en tiempo real
    initializeRealtimeSalesChart() {
        const ctx = document.getElementById('realtimeSalesChart').getContext('2d');
        this.charts.realtimeSales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Ventas ($)',
                    data: [],
                    borderColor: '#3B9EE8',
                    backgroundColor: 'rgba(59, 158, 232, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Gráfico de distribución por categoría
    initializeCategoryDistributionChart() {
        const ctx = document.getElementById('categoryDistributionChart').getContext('2d');
        this.charts.categoryDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.categories,
                datasets: [{
                    data: new Array(this.categories.length).fill(0),
                    backgroundColor: [
                        '#3B9EE8', '#5DADE2', '#4ECDC4', '#76D7C4', '#7BC4F0',
                        '#85C1E9', '#48C9B0', '#F4D03F', '#E74C3C', '#9B59B6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Gráfico de ganancias vs pérdidas
    initializeProfitLossChart() {
        const ctx = document.getElementById('profitLossChart').getContext('2d');
        this.charts.profitLoss = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ganancias', 'Pérdidas', 'Neto'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#48C9B0', '#E74C3C', '#3B9EE8']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Generar rendimiento por categoría
    generateCategoryPerformance() {
        const grid = document.getElementById('categoryPerformanceGrid');
        if (!grid) return;
        
        grid.innerHTML = '';

        if (this.categories.length === 0) {
            grid.innerHTML = `
                <div class="category-performance-card">
                    <div class="category-performance-header">
                        <h4>Cargando categorías...</h4>
                    </div>
                    <div class="category-performance-stats">
                        <div class="stat">
                            <span class="stat-label">Estado:</span>
                            <span class="stat-value">Conectando a Firebase</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        this.categories.forEach((category, index) => {
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-performance-card';
            
            // Contar productos reales en esta categoría
            const productCount = this.products.filter(p => p.category === category).length;
            
            categoryCard.innerHTML = `
                <div class="category-performance-header">
                    <h4>${category}</h4>
                    <span class="category-rank">#${index + 1}</span>
                </div>
                <div class="category-performance-stats">
                    <div class="stat">
                        <span class="stat-label">Ventas:</span>
                        <span class="stat-value" id="sales_${category.replace(/\s+/g, '_')}">$0</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Productos:</span>
                        <span class="stat-value" id="products_${category.replace(/\s+/g, '_')}">0</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Margen:</span>
                        <span class="stat-value" id="margin_${category.replace(/\s+/g, '_')}">0%</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">En catálogo:</span>
                        <span class="stat-value">${productCount} productos</span>
                    </div>
                </div>
                <div class="category-performance-bar">
                    <div class="performance-fill" id="bar_${category.replace(/\s+/g, '_')}" style="width: 0%"></div>
                </div>
            `;
            grid.appendChild(categoryCard);
        });
    }

    // Iniciar simulación
    startSimulation() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.simulationData.startTime = new Date();
        this.simulationData.currentDay = 0;

        this.updateButtons();
                 this.addLogEntry('success', 'Simulación iniciada');
         
         // Mostrar información de productos y categorías cargadas
         this.addLogEntry('info', `Productos disponibles: ${this.products.length}`);
         this.addLogEntry('success', `🔥 CATEGORÍAS REALES DE FIREBASE: ${this.categories.join(', ')}`);
         
         // Verificar que tenemos datos reales
         if (this.products.length === 0 || this.categories.length === 0) {
             this.addLogEntry('error', '❌ NO HAY DATOS DE FIREBASE - Simulación cancelada');
             this.stopSimulation();
             return;
         }
         
         const speed = document.getElementById('simulationSpeed').value;
         const interval = this.getSimulationInterval(speed);
        
        this.simulationInterval = setInterval(() => {
            this.runSimulationStep();
        }, interval);

        // Auto-start si está habilitado
        if (document.getElementById('autoStart').checked) {
            this.addLogEntry('info', 'Inicio automático activado');
        }
    }

    // Pausar simulación
    pauseSimulation() {
        if (!this.isRunning) return;

        this.isPaused = !this.isPaused;
        this.updateButtons();
        
        if (this.isPaused) {
            clearInterval(this.simulationInterval);
            this.addLogEntry('warning', 'Simulación pausada');
        } else {
            const speed = document.getElementById('simulationSpeed').value;
            const interval = this.getSimulationInterval(speed);
            this.simulationInterval = setInterval(() => {
                this.runSimulationStep();
            }, interval);
            this.addLogEntry('success', 'Simulación reanudada');
        }
    }

    // Detener simulación
    stopSimulation() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.simulationInterval);
        this.simulationData.endTime = new Date();
        
        this.updateButtons();
        this.addLogEntry('error', 'Simulación detenida');
        this.generateFinalReport();
    }

    // Reiniciar simulación
    resetSimulation() {
        this.stopSimulation();
        this.simulationData = {
            totalSales: 0,
            totalProfit: 0,
            totalLosses: 0,
            totalOrders: 0,
            productsSold: 0,
            simulatedCustomers: 0,
            startTime: null,
            endTime: null,
            currentDay: 0
        };
        
        this.updateDashboard();
        this.clearLog();
        this.resetCharts();
        this.addLogEntry('info', 'Sistema reiniciado');
    }

    // Recargar conexión a Firebase
    async reloadFirebase() {
        this.addLogEntry('info', '🔄 Recargando conexión a Firebase...');
        
        // Limpiar datos existentes
        this.products = [];
        this.categories = [];
        
        // Mostrar estado de carga
        this.showFirebaseError();
        
        // Intentar recargar
        try {
            await this.loadFirebaseData();
            this.addLogEntry('success', '✅ Firebase recargado correctamente');
        } catch (error) {
            this.addLogEntry('error', `❌ Error recargando Firebase: ${error.message}`);
        }
    }

    // Ejecutar paso de simulación
    async runSimulationStep() {
        const mode = document.getElementById('simulationMode').value;
        const duration = parseInt(document.getElementById('simulationDuration').value);
        
        // Simular ventas basado en el modo
        const salesData = await this.generateSalesData(mode);
        
        // Actualizar datos de simulación
        this.simulationData.totalSales += salesData.sales;
        this.simulationData.totalProfit += salesData.profit;
        this.simulationData.totalLosses += salesData.losses;
        this.simulationData.totalOrders += salesData.orders;
        this.simulationData.productsSold += salesData.productsSold;
        this.simulationData.simulatedCustomers += salesData.newCustomers;
        this.simulationData.currentDay++;

        // Actualizar dashboard
        this.updateDashboard();
        
        // Actualizar gráficos
        this.updateCharts(salesData);
        
        // Actualizar rendimiento por categoría
        this.updateCategoryPerformance(salesData);
        
        // Agregar entrada al log
        this.addLogEntry('info', `Quincena ${this.simulationData.currentDay}: ${salesData.orders} pedidos, $${salesData.sales.toFixed(2)} en ventas`);
        
        // Verificar si debe parar automáticamente
        if (document.getElementById('autoStop').checked && this.simulationData.currentDay >= duration) {
            this.stopSimulation();
        }
    }

    // Generar datos de ventas basado en el modo
    async generateSalesData(mode) {
        if (this.products.length === 0 || this.categories.length === 0) {
            this.addLogEntry('error', '❌ No hay productos o categorías de Firebase disponibles');
            this.addLogEntry('error', '❌ La simulación no puede continuar sin datos reales');
            return {
                sales: 0,
                profit: 0,
                losses: 0,
                orders: 0,
                productsSold: 0,
                newCustomers: 0
            };
        }

        const baseMultiplier = this.getModeMultiplier(mode);
        const randomFactor = Math.random() * 0.5 + 0.75; // 0.75 - 1.25
        
        // Obtener cantidad de clientes del input
        const customerCount = parseInt(document.getElementById('customerCount').value) || 10;
        
        // Generar pedidos más realistas: no todos los clientes compran cada quincena
        const purchaseRate = 0.3; // Solo 30% de clientes compran por quincena
        const orders = Math.floor(customerCount * purchaseRate * baseMultiplier * randomFactor);
        let sales = 0;
        let profit = 0;
        let losses = 0;
        let productsSold = 0;
        const newCustomers = Math.floor(Math.random() * 3) + 1;
        
        this.addLogEntry('info', `Generando ${orders} pedidos para ${customerCount} clientes`);
        
        // Generar pedidos reales y guardarlos en Firebase
        const generatedOrders = [];
        
        for (let i = 0; i < orders; i++) {
            const order = await this.generateRealOrder();
            if (order) {
                generatedOrders.push(order);
                sales += order.total;
                profit += order.profit;
                productsSold += order.totalQuantity;
                
                // Simular algunas pérdidas ocasionales
                if (Math.random() < 0.05) { // 5% de probabilidad de pérdida
                    losses += order.total * 0.2; // 20% de pérdida
                }
            }
        }
        
        // Guardar pedidos en Firebase
        if (generatedOrders.length > 0) {
            await this.saveOrdersToFirebase(generatedOrders);
        }
        
        this.addLogEntry('success', `Generados ${generatedOrders.length} pedidos: $${sales.toFixed(2)} en ventas`);
        
        return {
            sales: Math.round(sales * 100) / 100,
            profit: Math.round(profit * 100) / 100,
            losses: Math.round(losses * 100) / 100,
            orders: generatedOrders.length,
            productsSold,
            newCustomers
        };
    }

    // Generar un pedido real
    async generateRealOrder() {
        try {
            if (this.products.length === 0) {
                console.error('No hay productos disponibles para generar pedido');
                return null;
            }

            // Seleccionar productos aleatorios (1-2 productos por pedido, más realista)
            const numProducts = Math.floor(Math.random() * 2) + 1; // 1-2 productos
            const selectedProducts = [];
            
                         for (let i = 0; i < numProducts; i++) {
                 const product = this.products[Math.floor(Math.random() * this.products.length)];
                 const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 unidades, más realista
                 
                 // Usar precios reales del producto de Firebase
                 const price = parseFloat(product.price) || (Math.random() * 200 + 20); // $20-$220 si no hay precio
                 const wholesalePrice = parseFloat(product.wholesalePrice) || (price * 0.85);
                 const wholesaleQuantity = parseInt(product.wholesaleQuantity) || 3;
                 
                 // Debug: mostrar qué producto se está usando
                 console.log(`Usando producto de Firebase: ${product.name} - ${product.category} - $${price}`);
                
                const isWholesale = quantity >= wholesaleQuantity;
                const unitPrice = isWholesale ? wholesalePrice : price;
                const cost = price * 0.7; // 30% margen de ganancia, más realista
                
                selectedProducts.push({
                    id: product.id || `prod_${Date.now()}_${i}`,
                    name: product.name || `Producto ${i + 1}`,
                    category: product.category || 'General',
                    quantity: quantity,
                    unitPrice: Math.round(unitPrice * 100) / 100,
                    totalPrice: Math.round((unitPrice * quantity) * 100) / 100,
                    cost: Math.round((cost * quantity) * 100) / 100,
                    profit: Math.round(((unitPrice * quantity) - (cost * quantity)) * 100) / 100,
                    isWholesale: isWholesale
                });
            }
            
            // Calcular totales
            const total = Math.round(selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100;
            const totalCost = Math.round(selectedProducts.reduce((sum, item) => sum + item.cost, 0) * 100) / 100;
            const totalProfit = Math.round((total - totalCost) * 100) / 100;
            const totalQuantity = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
            
            // Generar cliente simulado
            const customer = this.generateSimulatedCustomer();
            
            // Crear pedido
            const order = {
                id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                customer: customer,
                items: selectedProducts,
                total: total,
                totalCost: totalCost,
                profit: totalProfit,
                totalQuantity: totalQuantity,
                status: 'completed', // Los pedidos simulados se marcan como completados
                paymentMethod: Math.random() > 0.5 ? 'card' : 'cash',
                createdAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                isSimulated: true,
                simulationData: {
                    mode: document.getElementById('simulationMode').value,
                    quincena: this.simulationData.currentDay
                }
            };
            
            return order;
        } catch (error) {
            console.error('Error generando pedido:', error);
            return null;
        }
    }

    // Generar cliente simulado
    generateSimulatedCustomer() {
        const firstNames = ['Ana', 'Carlos', 'María', 'José', 'Laura', 'Miguel', 'Carmen', 'Antonio', 'Isabel', 'Francisco'];
        const lastNames = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín'];
        const locations = ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Torreón', 'Querétaro', 'San Luis Potosí'];
        
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        return {
            name: `${firstName} ${lastName}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
            phone: `+52 55 ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9000) + 1000}`,
            location: location,
            isSimulated: true
        };
    }

    // Guardar pedidos en Firestore
    async saveOrdersToFirebase(orders) {
        try {
            const { collection, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            
            let firestore;
            if (window.adminManager && window.adminManager.firestore) {
                firestore = window.adminManager.firestore;
            } else {
                this.addLogEntry('error', 'No se pudo conectar a Firestore para guardar pedidos');
                return;
            }
            
            // Guardar cada pedido
            for (const order of orders) {
                const ordersRef = doc(collection(firestore, 'orders'), order.id);
                await setDoc(ordersRef, order);
            }
            
            this.addLogEntry('success', `${orders.length} pedidos simulados guardados en Firestore`);
            
        } catch (error) {
            console.error('Error guardando pedidos en Firestore:', error);
            this.addLogEntry('error', 'Error guardando pedidos en Firestore');
        }
    }

    // Obtener multiplicador basado en el modo
    getModeMultiplier(mode) {
        const multipliers = {
            'realistic': 1.0,
            'optimistic': 1.3, // Más conservador
            'pessimistic': 0.7, // Menos dramático
            'seasonal': this.getSeasonalMultiplier(),
            'random': Math.random() * 0.6 + 0.7 // Entre 0.7 y 1.3
        };
        return multipliers[mode] || 1.0;
    }

    // Multiplicador estacional
    getSeasonalMultiplier() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4) return 1.1; // Primavera
        if (month >= 5 && month <= 7) return 1.2; // Verano
        if (month >= 8 && month <= 10) return 1.0; // Otoño
        return 1.1; // Invierno
    }

    // Obtener intervalo de simulación basado en velocidad
    getSimulationInterval(speed) {
        const intervals = {
            'slow': 1000,      // 1 segundo
            'normal': 100,     // 100ms
            'fast': 10,        // 10ms
            'instant': 1       // 1ms
        };
        return intervals[speed] || 100;
    }

    // Actualizar dashboard
    updateDashboard() {
        document.getElementById('simulatedSales').textContent = `$${this.simulationData.totalSales.toLocaleString()}`;
        document.getElementById('totalProfit').textContent = `$${this.simulationData.totalProfit.toLocaleString()}`;
        document.getElementById('totalLosses').textContent = `$${this.simulationData.totalLosses.toLocaleString()}`;
        document.getElementById('totalOrders').textContent = this.simulationData.totalOrders.toLocaleString();
        document.getElementById('productsSold').textContent = this.simulationData.productsSold.toLocaleString();
        document.getElementById('simulatedCustomers').textContent = this.simulationData.simulatedCustomers.toLocaleString();
        
        // Calcular tendencias
        const profitMargin = this.simulationData.totalSales > 0 ? 
            ((this.simulationData.totalProfit / this.simulationData.totalSales) * 100).toFixed(1) : 0;
        const lossRate = this.simulationData.totalSales > 0 ? 
            ((this.simulationData.totalLosses / this.simulationData.totalSales) * 100).toFixed(1) : 0;
        
        document.getElementById('profitMargin').textContent = `${profitMargin}% margen`;
        document.getElementById('lossRate').textContent = `${lossRate}% tasa`;
    }

    // Actualizar gráficos
    updateCharts(salesData) {
        // Actualizar gráfico de ventas en tiempo real
        const now = new Date().toLocaleTimeString();
        this.charts.realtimeSales.data.labels.push(now);
        this.charts.realtimeSales.data.datasets[0].data.push(this.simulationData.totalSales);
        
        // Mantener solo los últimos 20 puntos
        if (this.charts.realtimeSales.data.labels.length > 20) {
            this.charts.realtimeSales.data.labels.shift();
            this.charts.realtimeSales.data.datasets[0].data.shift();
        }
        this.charts.realtimeSales.update('none');

        // Actualizar gráfico de ganancias vs pérdidas
        this.charts.profitLoss.data.datasets[0].data = [
            this.simulationData.totalProfit,
            this.simulationData.totalLosses,
            this.simulationData.totalProfit - this.simulationData.totalLosses
        ];
        this.charts.profitLoss.update('none');
    }

    // Actualizar rendimiento por categoría
    updateCategoryPerformance(salesData) {
        if (this.categories.length === 0) return;
        
        // Calcular distribución real por categoría basada en productos
        const categoryStats = {};
        
        // Inicializar estadísticas por categoría
        this.categories.forEach(category => {
            categoryStats[category] = {
                sales: 0,
                products: 0,
                margin: 0
            };
        });
        
                 // Simular ventas por categoría basado en productos reales de Firebase
         const categoryProducts = this.products.filter(p => this.categories.includes(p.category));
         
         this.categories.forEach(category => {
             const categoryProductCount = categoryProducts.filter(p => p.category === category).length;
             const categoryWeight = categoryProductCount / categoryProducts.length;
             
             // Calcular ventas realistas basadas en productos de Firebase
             const categorySales = salesData.sales * categoryWeight * (Math.random() * 0.5 + 0.75);
             const categoryProductsSold = Math.floor(salesData.productsSold * categoryWeight * (Math.random() * 0.5 + 0.75));
             
             // Calcular margen basado en precios reales de Firebase
             const categoryProductPrices = categoryProducts.filter(p => p.category === category).map(p => parseFloat(p.price) || 0);
             const avgPrice = categoryProductPrices.length > 0 ? categoryProductPrices.reduce((a, b) => a + b, 0) / categoryProductPrices.length : 100;
             const margin = Math.min(Math.max((avgPrice * 0.3) / avgPrice * 100, 20), 50); // 20-50% margen realista
            
            categoryStats[category] = {
                sales: categorySales,
                products: categoryProductsSold,
                margin: margin
            };
        });
        
        // Actualizar UI
        this.categories.forEach(category => {
            const stats = categoryStats[category];
            const categoryId = category.replace(/\s+/g, '_');
            
            const salesElement = document.getElementById(`sales_${categoryId}`);
            const productsElement = document.getElementById(`products_${categoryId}`);
            const marginElement = document.getElementById(`margin_${categoryId}`);
            const barElement = document.getElementById(`bar_${categoryId}`);
            
            if (salesElement) salesElement.textContent = `$${stats.sales.toFixed(0)}`;
            if (productsElement) productsElement.textContent = stats.products.toString();
            if (marginElement) marginElement.textContent = `${stats.margin.toFixed(0)}%`;
            
            // Actualizar barra de progreso
            if (barElement) {
                const maxSales = Math.max(...Object.values(categoryStats).map(s => s.sales));
                const percentage = maxSales > 0 ? (stats.sales / maxSales) * 100 : 0;
                barElement.style.width = `${percentage}%`;
            }
        });
    }

    // Actualizar botones
    updateButtons() {
        const startBtn = document.getElementById('startSimulationBtn');
        const pauseBtn = document.getElementById('pauseSimulationBtn');
        const stopBtn = document.getElementById('stopSimulationBtn');
        
        if (this.isRunning) {
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
            pauseBtn.innerHTML = this.isPaused ? 
                '<i class="fas fa-play"></i> Reanudar' : 
                '<i class="fas fa-pause"></i> Pausar';
        } else {
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
        }
    }

    // Agregar entrada al log
    addLogEntry(type, message) {
        const log = document.getElementById('simulationLog');
        const time = new Date().toLocaleTimeString();
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${message}</span>
        `;
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        
        // Mantener solo los últimos 100 entries
        while (log.children.length > 100) {
            log.removeChild(log.firstChild);
        }
    }

    // Limpiar log
    clearLog() {
        const log = document.getElementById('simulationLog');
        log.innerHTML = `
            <div class="log-entry info">
                <span class="log-time">00:00:00</span>
                <span class="log-message">Log limpiado. Sistema listo para nueva simulación.</span>
            </div>
        `;
    }

    // Exportar log
    exportLog() {
        const log = document.getElementById('simulationLog');
        const entries = Array.from(log.children).map(entry => {
            const time = entry.querySelector('.log-time').textContent;
            const message = entry.querySelector('.log-message').textContent;
            return `${time} - ${message}`;
        }).join('\n');
        
        const blob = new Blob([entries], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simulation_log_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Generar reporte final
    generateFinalReport() {
        const duration = this.simulationData.endTime - this.simulationData.startTime;
        const durationMinutes = Math.round(duration / 60000);
        const quincenas = this.simulationData.currentDay;
        
        this.addLogEntry('success', `=== REPORTE FINAL DE SIMULACIÓN ===`);
        this.addLogEntry('info', `Duración de simulación: ${durationMinutes} minutos`);
        this.addLogEntry('info', `Quincenas simuladas: ${quincenas}`);
        this.addLogEntry('info', `Ventas totales: $${this.simulationData.totalSales.toLocaleString()}`);
        this.addLogEntry('info', `Ganancias: $${this.simulationData.totalProfit.toLocaleString()}`);
        this.addLogEntry('info', `Pérdidas: $${this.simulationData.totalLosses.toLocaleString()}`);
        this.addLogEntry('info', `Pedidos generados: ${this.simulationData.totalOrders.toLocaleString()}`);
        this.addLogEntry('info', `Productos vendidos: ${this.simulationData.productsSold.toLocaleString()}`);
        this.addLogEntry('info', `Clientes simulados: ${this.simulationData.simulatedCustomers.toLocaleString()}`);
        
        const netProfit = this.simulationData.totalProfit - this.simulationData.totalLosses;
        const avgSalesPerQuincena = quincenas > 0 ? this.simulationData.totalSales / quincenas : 0;
        const avgOrdersPerQuincena = quincenas > 0 ? this.simulationData.totalOrders / quincenas : 0;
        
        this.addLogEntry('success', `Ganancia neta: $${netProfit.toLocaleString()}`);
        this.addLogEntry('info', `Promedio por quincena: $${avgSalesPerQuincena.toFixed(2)} en ventas, ${avgOrdersPerQuincena.toFixed(1)} pedidos`);
        this.addLogEntry('success', `Todos los pedidos han sido guardados en Firebase`);
    }

    // Reiniciar gráficos
    resetCharts() {
        this.charts.realtimeSales.data.labels = [];
        this.charts.realtimeSales.data.datasets[0].data = [];
        this.charts.realtimeSales.update();
        
        this.charts.profitLoss.data.datasets[0].data = [0, 0, 0];
        this.charts.profitLoss.update();
        
        // Reiniciar rendimiento por categoría
        this.categories.forEach(category => {
            const categoryId = category.replace(/\s+/g, '_');
            const salesElement = document.getElementById(`sales_${categoryId}`);
            const productsElement = document.getElementById(`products_${categoryId}`);
            const marginElement = document.getElementById(`margin_${categoryId}`);
            const barElement = document.getElementById(`bar_${categoryId}`);
            
            if (salesElement) salesElement.textContent = '$0';
            if (productsElement) productsElement.textContent = '0';
            if (marginElement) marginElement.textContent = '0%';
            if (barElement) barElement.style.width = '0%';
        });
    }
}

// Exportar para uso en admin.js
window.SalesSimulationEngine = SalesSimulationEngine;
