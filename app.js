/**
 * ============================================
 * 🎯 AXENTRO APPLICATION v4.1 - HOTFIX EDITION
 * ✅ Main Application Controller - WITH LOADING FIX
 * 🔥 الحل النهائي لمشكلة فشل التحميل
 * ============================================
 */

// ============================================
// 🛡️ GLOBAL ERROR HANDLER
// ============================================

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Unhandled Promise Rejection:', event.reason);
    
    // Prevent default behavior (logging to console)
    // event.preventDefault(); // Uncomment if needed
});

window.addEventListener('error', function(event) {
    console.error('❌ Global Error:', event.error);
    
    // Show user-friendly error if loading screen is visible
    if (document.getElementById('loadingScreen')?.style.display !== 'none') {
        showLoadingError(event.message || 'حدث خطأ أثناء تحميل النظام');
    }
});

// ============================================
// 🚀 APPLICATION CLASS
// ============================================

class App {
    constructor() {
        this.isInitialized = false;
        this.currentPage = 'loginPage';
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Module references (will be initialized)
        this.modules = {};
        
        // Bind methods
        this.init = this.init.bind(this);
        this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
        
        console.log('🏗️ App constructor initialized');
    }

    // ============================================
    // 🚀 APPLICATION INITIALIZATION
    // ============================================

    /**
     * Initialize the entire application with ENHANCED error handling
     * 🔥 هذا هو الحل الرئيسي لمشكلة الفشل في التحميل
     */
    async init() {
        console.log(`🚀 Starting Axentro Application v${AppConfig.app.version}`);
        
        try {
            // ✅ Step 1: Update loading progress
            this.updateProgress(10, 'تهيئة الواجهة...');
            await this.sleep(100);

            // ✅ Step 2: Verify critical dependencies exist
            this.updateProgress(20, 'التحقق من المكونات...');
            
            if (!this.verifyDependencies()) {
                throw new Error('بعض المكونات الأساسية غير متوفرة - يرجى تحديث الصفحة');
            }

            // ✅ Step 3: Setup global event listeners
            this.setupGlobalEventListeners();
            this.updateProgress(30, 'إعداد المستمعين...');

            // ✅ Step 4: Initialize database client with GRACEFUL DEGRADATION
            this.updateProgress(40, 'الاتصال بقاعدة البيانات...');
            
            try {
                if (typeof db !== 'undefined' && db.isConnectedToSupabase) {
                    if (!db.isConnectedToSupabase()) {
                        console.warn('⚠️ Supabase client not fully initialized, will retry...');
                        // Don't throw - continue with limited functionality
                    } else {
                        console.log('✅ Supabase connected successfully');
                    }
                } else {
                    console.warn('⚠️ Database module not available');
                }
            } catch (dbError) {
                console.warn('⚠️ Database initialization warning:', dbError.message);
                // Continue without database - will show login page anyway
            }

            // ✅ Step 5: Load face recognition models with SMART FALLBACK
            // 🔥 THIS IS THE CRITICAL FIX - Most common failure point
            this.updateProgress(50, 'جاري تحميل نماذج الذكاء الاصطناعي...');
            
            const faceRecognitionLoaded = await this.loadFaceRecognitionWithFallback();
            
            if (!faceRecognitionLoaded) {
                console.warn('⚠️ Face recognition not available - continuing in basic mode');
                // DON'T THROW - Continue without face recognition!
                window.faceRecognitionAvailable = false;
            } else {
                window.faceRecognitionAvailable = true;
                console.log('✅ Face recognition loaded successfully');
            }

            // ✅ Step 6: Check for existing session
            this.updateProgress(70, 'التحقق من الجلسة...');
            
            let hasSession = false;
            try {
                if (typeof auth !== 'undefined' && auth.checkExistingSession) {
                    hasSession = await auth.checkExistingSession();
                }
            } catch (sessionError) {
                console.warn('⚠️ Session check failed:', sessionError.message);
                hasSession = false;
            }

            // ✅ Step 7: Load user settings
            this.updateProgress(80, 'تحميل الإعدادات...');
            this.loadUserSettings();

            // ✅ Step 8: Setup PWA features (optional - non-critical)
            this.updateProgress(90, 'إعداد التطبيق...');
            try {
                this.setupPWAFeatures();
            } catch (pwaError) {
                console.warn('⚠️ PWA setup failed:', pwaError.message);
                // Non-critical - don't fail the whole app
            }

            // ✅ Step 9: Final initialization - SUCCESS!
            this.updateProgress(100, 'تم التحميل بنجاح ✓');
            
            // Hide loading screen after short delay
            setTimeout(() => {
                this.hideLoadingScreen();
                
                // Navigate to appropriate page
                if (hasSession && this.isAuthenticated()) {
                    this.navigateTo('dashboardPage');
                    this.initializeDashboard();
                } else {
                    this.navigateTo('loginPage');
                }
                
                this.isInitialized = true;
                this.retryCount = 0; // Reset retry count on success
                
                console.log('✅ Application initialized successfully!');
                
                // Play success sound if available
                if (typeof ui !== 'undefined' && ui.playSound) {
                    ui.playSound('loginSuccess', 0.5);
                }

            }, 800); // Short delay for smooth transition

        } catch (error) {
            console.error('❌ Application initialization FAILED:', error);
            this.handleInitializationFailure(error);
        }
    }

    // ============================================
    // 🔧 HELPER METHODS
    // ============================================

    /**
     * Update progress bar and status text
     */
    updateProgress(percent, statusText) {
        const progressBar = document.getElementById('loadProgress');
        const statusEl = document.getElementById('loadStatus');
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
            progressBar.setAttribute('aria-valuenow', percent);
        }
        
        if (statusEl) {
            statusEl.textContent = statusText;
        }
        
        // Also use UI manager if available
        if (typeof ui !== 'undefined' && ui.updateLoadingProgress) {
            ui.updateLoadingProgress(percent, statusText);
        }
    }

    /**
     * Verify all required dependencies are loaded
     * @returns {boolean} True if all critical deps exist
     */
    verifyDependencies() {
        const requiredDeps = [
            { name: 'AppConfig', obj: typeof AppConfig !== 'undefined' },
            { name: 'ui', obj: typeof ui !== 'undefined' },
            { name: 'Utils', obj: typeof Utils !== 'undefined' },
            { name: 'Constants', obj: typeof Constants !== 'undefined' },
            // Optional but important
            { name: 'db', obj: typeof db !== 'undefined', optional: true },
            { name: 'auth', obj: typeof auth !== 'undefined', optional: true },
            { name: 'faceRecognition', obj: typeof faceRecognition !== 'undefined', optional: true },
            { name: 'attendance', obj: typeof attendance !== 'undefined', optional: true },
        ];

        let allCriticalPresent = true;
        let missingDeps = [];

        requiredDeps.forEach(dep => {
            if (!dep.obj) {
                if (!dep.optional) {
                    allCriticalPresent = false;
                    missingDeps.push(dep.name);
                } else {
                    console.warn(`⚠️ Optional dependency missing: ${dep.name}`);
                }
            }
        });

        if (!allCriticalPresent) {
            console.error(`❌ Missing critical dependencies: ${missingDeps.join(', ')}`);
            return false;
        }

        return true;
    }

    /**
     * Load face recognition with smart fallback mechanism
     * 🔥 THE MAIN FIX FOR LOADING FAILURE
     * 
     * @returns {Promise<boolean>} True if loaded successfully
     */
    async loadFaceRecognitionWithFallback() {
        // Check if we should skip face recognition (user choice or previous failure)
        if (window.skipFaceApi === true) {
            console.log('⏭️ Face recognition skipped by user or system');
            return false;
        }

        // Check if face-api.js library loaded
        if (typeof faceapi === 'undefined') {
            console.warn('⚠️ face-api.js library not loaded');
            
            // Try to load from alternative CDN
            if (!window.faceApiLoadError) {
                return await this.tryAlternativeFaceApiCdn();
            }
            
            return false;
        }

        // Check if faceRecognition module exists
        if (typeof faceRecognition === 'undefined') {
            console.warn('⚠️ Face Recognition module not found');
            return false;
        }

        // Try to load models with timeout
        try {
            // Set a timeout for model loading (15 seconds max)
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('تجاوز وقت تحميل النماذج')), 15000)
            );

            const loadPromise = this.loadFaceModels();

            await Promise.race([loadPromise, timeoutPromise]);
            return true;

        } catch (error) {
            console.error('❌ Face recognition loading failed:', error.message);
            
            // Offer user option to skip
            return false;
        }
    }

    /**
     * Attempt to load face models
     */
    async loadFaceModels() {
        if (typeof faceRecognition.areModelsLoaded === 'function' && 
            faceRecognition.areModelsLoaded()) {
            console.log('✅ Models already loaded');
            return true;
        }

        if (typeof faceRecognition.loadModels === 'function') {
            await faceRecognition.loadModels();
            return true;
        }

        throw new Error('Face recognition loadModels method not available');
    }

    /**
     * Try alternative CDN for face-api.js
     */
    async tryAlternativeFaceApiCdn() {
        console.log('🔄 Trying alternative CDN for face-api.js...');
        
        try {
            // Dynamic import from alternative source
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js';
            
            const loadPromise = new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            document.head.appendChild(script);
            await loadPromise;
            
            console.log('✅ Loaded face-api.js from alternative CDN');
            return await this.loadFaceRecognitionWithFallback();

        } catch (error) {
            console.error('❌ Alternative CDN also failed:', error);
            return false;
        }
    }

    /**
     * Handle initialization failure gracefully
     * @param {Error} error - The error that occurred
     */
    handleInitializationFailure(error) {
        console.error('💥 Initialization failed:', error);
        
        this.updateProgress(0, 'حدث خطأ في التحميل');
        
        // Increment retry count
        this.retryCount++;
        
        // Show error with retry options
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            const errorDiv = document.getElementById('loadingError');
            const errorMsg = document.getElementById('errorMessage');
            
            if (errorDiv && errorMsg) {
                errorMsg.innerHTML = `
                    <strong>الخطأ:</strong> ${error.message}<br><br>
                    <small style="color: #6b7280;">
                        محاولة ${this.retryCount} من ${this.maxRetries}
                    </small>
                `;
                errorDiv.style.display = 'block';
                
                // Update retry button text if max retries reached
                if (this.retryCount >= this.maxRetries) {
                    const retryBtn = errorDiv.querySelector('button[onclick="retryLoading()"]');
                    if (retryBtn) {
                        retryBtn.disabled = true;
                        retryBtn.innerHTML = '<i class="fas fa-ban"></i> وصلت للحد الأقصى للمحاولات';
                        retryBtn.style.opacity = '0.6';
                    }
                }
            }
            
            // Also try UI manager's showError if available
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(`فشل تحميل التطبيق - ${error.message}`);
            }

        }, 1500);
    }

    /**
     * Hide loading screen smoothly
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const appContainer = document.getElementById('app');
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                if (appContainer) {
                    appContainer.classList.remove('hidden');
                    appContainer.style.display = 'block';
                }
            }, 500);
        }
    }

    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // 📱 PAGE NAVIGATION
    // ============================================

    /**
     * Navigate to a specific page
     * @param {string} pageId - ID of the target page
     */
    navigateTo(pageId) {
        // Validate authentication for protected pages
        const protectedPages = ['dashboardPage', 'reportsPage', 'changePasswordPage'];
        
        if (protectedPages.includes(pageId) && !this.isAuthenticated()) {
            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('يجب تسجيل الدخول أولاً');
            }
            this.navigateTo('loginPage');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
        }

        // Update navigation if exists
        this.updateNavigation(pageId);

        // Page-specific actions
        this.onPageEnter(pageId);
    }

    /**
     * Update bottom navigation active state
     */
    updateNavigation(activePageId) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === activePageId) {
                link.classList.add('active');
            }
        });

        // Add click handlers to nav links
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                this.navigateTo(link.dataset.page);
            };
        });
    }

    /**
     * Handle page enter events
     */
    onPageEnter(pageId) {
        switch (pageId) {
            case 'dashboardPage':
                this.initializeDashboard();
                break;
                
            case 'reportsPage':
                if (typeof reports !== 'undefined' && reports.setDefaultDates) {
                    reports.setDefaultDates();
                }
                break;
                
            case 'loginPage':
                // Stop camera if running on other pages
                if (typeof faceRecognition !== 'undefined' && 
                    faceRecognition.stopCamera) {
                    faceRecognition.stopCamera();
                }
                break;
        }
    }

    // ============================================
    // 🏠 DASHBOARD INITIALIZATION
    // ============================================

    /**
     * Initialize dashboard with user data
     */
    async initializeDashboard() {
        try {
            if (!this.isAuthenticated()) return;

            const user = this.getCurrentUser();

            // Update user info in header
            const userNameEl = document.getElementById('userName');
            const userCodeEl = document.getElementById('userCodeDisplay');

            if (userNameEl) userNameEl.textContent = `مرحباً، ${user.name}`;
            if (userCodeEl) userCodeEl.textContent = `CODE: ${user.code}`;

            // Load dashboard stats
            if (typeof db !== 'undefined' && db.getEmployeesCount) {
                const totalEmployees = await db.getEmployeesCount();
                this.animateStatValue('totalEmployeesStat', totalEmployees);
            }

            // Load today's attendance records
            if (typeof attendance !== 'undefined' && attendance.loadTodayRecords) {
                await attendance.loadTodayRecords();
            }

            // Start camera for face recognition (if available)
            if (window.faceRecognitionAvailable !== false) {
                this.startDashboardCamera();
            } else {
                // Show message that camera is not available
                const recognitionArea = document.getElementById('recognitionArea');
                if (recognitionArea) {
                    recognitionArea.innerHTML += `
                        <div class="info-box" style="margin-top: 10px;">
                            <i class="fas fa-info-circle"></i>
                            <p>التعرف على الوجه غير متوفر - يمكنك استخدام الكود وكلمة المرور</p>
                        </div>
                    `;
                }
            }

            // If user is admin, enable admin features
            if (this.isAdmin()) {
                if (typeof admin !== 'undefined' && admin.setupAdminFeatures) {
                    admin.setupAdminFeatures();
                }
            }

            console.log('📊 Dashboard initialized');

        } catch (error) {
            console.error('Dashboard init error:', error);
            // Don't crash the whole app - just log the error
        }
    }

    /**
     * Start dashboard camera for face recognition
     */
    async startDashboardCamera() {
        try {
            const videoEl = document.getElementById('dashboardVideo');
            const canvasEl = document.getElementById('dashboardCanvas');
            
            if (!videoEl || !canvasEl) return;

            // Check if faceRecognition module is available
            if (typeof faceRecognition === 'undefined' || !faceRecognition.startCamera) {
                console.warn('⚠️ Face recognition module not available');
                return;
            }

            // Start camera with fallback
            await this.startCameraWithFallback(videoEl, { facingMode: 'user' });

            console.log('📹 Dashboard camera ready');

        } catch (error) {
            console.warn('Dashboard camera not available:', error.message);
            
            // Show message but don't block the app
            const container = document.getElementById('recognitionArea');
            if (container) {
                container.innerHTML += `
                    <div class="info-box" style="margin-top: 10px; background: #fef3c7; border-color: #f59e0b;">
                        <i class="fas fa-exclamation-triangle" style="color: #d97706;"></i>
                        <p style="color: #92400e;">الكاميرا غير متاحة</p>
                        <button onclick="app.startDashboardCamera()" class="btn btn-sm btn-outline mt-2">
                            <i class="fas fa-redo"></i> إعادة المحاولة
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * Start camera with automatic fallback
     */
    async startCameraWithFallback(videoElement, options = {}) {
        try {
            // Check for camera support
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Camera API not supported');
            }

            // Default camera constraints
            const constraints = {
                video: {
                    facingMode: options.facingMode || 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };

            // Request permission and get stream
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Attach to video element
            if (videoElement) {
                videoElement.srcObject = stream;
                await videoElement.play();
            }

            return stream;

        } catch (error) {
            console.error('Camera start error:', error);
            throw error;
        }
    }

    // ============================================
    // 👤 AUTHENTICATION HELPERS
    // ============================================

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        if (typeof auth !== 'undefined' && auth.isAuthenticated) {
            return auth.isAuthenticated();
        }
        return false;
    }

    /**
     * Get current user data
     * @returns {object|null}
     */
    getCurrentUser() {
        if (typeof auth !== 'undefined' && auth.getCurrentUser) {
            return auth.getCurrentUser();
        }
        return null;
    }

    /**
     * Check if current user is admin
     * @returns {boolean}
     */
    isAdmin() {
        if (typeof auth !== 'undefined' && auth.isAdmin) {
            return auth.isAdmin();
        }
        return false;
    }

    // ============================================
    // 🎨 UI ANIMATIONS & UTILITIES
    // ============================================

    /**
     * Animate stat value counter
     */
    animateStatValue(elementId, targetValue) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const duration = 1000;
        const steps = 60;
        const stepDuration = duration / steps;
        let currentValue = 0;
        const increment = targetValue / steps;

        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            el.textContent = Math.round(currentValue);
        }, stepDuration);
    }

    // ============================================
    // 📱 SETUP METHODS
    // ============================================

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));

        // Form submissions
        const loginForm = document.getElementById('loginForm');
        if (loginForm && typeof auth !== 'undefined' && auth.handleLogin) {
            loginForm.addEventListener('submit', (e) => auth.handleLogin(e));
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm && typeof auth !== 'undefined' && auth.handleRegister) {
            registerForm.addEventListener('submit', (e) => auth.handleRegister(e));
        }

        // Navigation links
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(link.dataset.page);
            });
        });

        console.log('🎧 Global event listeners set up');
    }

    /**
     * Handle online/offline status changes
     */
    handleOnlineStatus(isOnline) {
        if (typeof ui !== 'undefined') {
            if (isOnline) {
                ui.showSuccess('تم استعادة الاتصال بالإنترنت');
            } else {
                ui.showWarning('لا يوجد اتصال بالإنترنت - بعض الميزات قد لا تعمل');
            }
        }
    }

    /**
     * Load user settings from localStorage
     */
    loadUserSettings() {
        try {
            if (typeof Utils !== 'undefined' && Utils.loadFromStorage) {
                const settings = Utils.loadFromStorage(Constants?.storageKeys?.USER_SETTINGS || 'user_settings');
                if (settings) {
                    console.log('⚙️ User settings loaded');
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to load settings:', error);
        }
    }

    /**
     * Setup PWA features (service worker, etc.)
     */
    setupPWAFeatures() {
        try {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('✅ Service Worker registered:', registration.scope);
                    })
                    .catch(error => {
                        console.warn('⚠️ Service Worker registration failed:', error);
                    });
            }
        } catch (error) {
            console.warn('⚠️ PWA setup failed:', error);
        }
    }
}

// ============================================
// 🚀 INITIALIZE APPLICATION
// ============================================

/**
 * Global app instance - created when DOM is ready
 */
let app;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Initializing App...');
    
    // Create app instance
    app = new App();
    
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        app.init().catch(error => {
            console.error('❌ Fatal initialization error:', error);
            showLoadingError(error.message || 'فشل تشغيل التطبيق');
        });
    }, 500);
});

// Fallback: If DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('⚡ Document already loaded - initializing immediately');
    if (!app) {
        app = new App();
        setTimeout(() => app.init(), 100);
    }
}

console.log('🎯 App.js loaded successfully - waiting for initialization...');
