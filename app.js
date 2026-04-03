/**
 * ============================================
 * 🎯 AXENTRO APPLICATION v4.0.1 - HOTFIX
 * ✅ Main Application Controller - With Better Error Handling
 * ============================================
 */

class App {
    constructor() {
        this.isInitialized = false;
        this.currentPage = 'loginPage';
        
        // Module references
        this.modules = {
            ui: null,
            auth: null,
            db: null,
            faceRecognition: null,
            attendance: null,
            admin: null,
            reports: null
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
    }

    // ============================================
    // 🚀 APPLICATION INITIALIZATION
    // ============================================

    /**
     * Initialize the entire application with enhanced error handling
     */
    async init() {
        console.log('🚀 Starting Axentro Application v' + AppConfig.app.version);
        
        try {
            // Step 1: Update loading progress
            ui.updateLoadingProgress(10, 'تهيئة الواجهة...');
            
            // Step 2: Initialize UI Manager (already created globally)
            await Utils.sleep(100);
            
            // Step 3: Setup global event listeners
            this.setupGlobalEventListeners();
            ui.updateLoadingProgress(20, 'إعداد المستمعين...');
            
            // Step 4: Initialize database client with error handling
            ui.updateLoadingProgress(30, 'الاتصال بقاعدة البيانات...');
            if (!db.isConnectedToSupabase()) {
                console.warn('⚠️ Supabase client not initialized, will retry...');
                // Don't throw error here - we'll handle it gracefully
            }
            
            // Step 5: Load face recognition models with better error handling
            ui.updateLoadingProgress(50, 'جاري تحميل نماذج الذكاء الاصطناعي...');
            try {
                if (!faceRecognition.areModelsLoaded()) {
                    await faceRecognition.loadModels();
                } else {
                    console.log('✅ Face recognition models already loaded');
                }
            } catch (modelError) {
                console.warn('⚠️ Face recognition models failed to load, continuing...', modelError.message);
                // Don't stop the whole app just because face recognition failed
                ui.showWarning('⚠️ تعذر تحميل نموذج التعرف على الوجه');
            }
            
            // Step 6: Check for existing session
            ui.updateLoadingProgress(70, 'التحقق من الجلسة...');
            const hasSession = await auth.checkExistingSession();
            
            // Step 7: Load user settings
            ui.updateLoadingProgress(80, 'تحميل الإعدادات...');
            this.loadUserSettings();
            
            // Step 8: Setup PWA features
            ui.updateLoadingProgress(90, 'إعداد التطبيق...');
            this.setupPWAFeatures();
            
            // Step 9: Final initialization
            ui.updateLoadingProgress(100, 'جاهز! ✓');
            
            // Hide loading screen after a short delay
            setTimeout(() => {
                ui.hideLoadingScreen();
                
                // Navigate to appropriate page
                if (hasSession && auth.isAuthenticated()) {
                    this.navigateTo('dashboardPage');
                    this.initializeDashboard();
                } else {
                    this.navigateTo('loginPage');
                }
                
                this.isInitialized = true;
                console.log('✅ Application initialized successfully!');
                
            }, 800);

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            ui.updateLoadingProgress(0, 'حدث خطأ في التحميل');
            
            // Show user-friendly error and retry option
            setTimeout(() => {
                ui.hideLoadingScreen();
                
                const retryBtn = document.createElement('button');
                retryBtn.className = 'btn btn-primary btn-block';
                retryBtn.innerHTML = '<i class="fas fa-redo"></i> إعادة المحاولة';
                retryBtn.onclick = () => window.location.reload();
                
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.appendChild(retryBtn);
                }
                
                ui.showError('فشل تحميل التطبيق - يرجى المحاولة');
            }, 1500);
        }
    }

    // ============================================
    // 📱 PAGE NAVIGATION
    // ============================================

    /**
     * Navigate to a specific page
     */
    navigateTo(pageId) {
        // Validate user is authenticated for protected pages
        const protectedPages = ['dashboardPage', 'reportsPage', 'changePasswordPage'];
        
        if (protectedPages.includes(pageId) && !auth.isAuthenticated()) {
            ui.showWarning('يجب تسجيل الدخول أولاً');
            this.navigateTo('loginPage');
            return;
        }

        // Navigate using UI Manager
        ui.navigateTo(pageId);
        this.currentPage = pageId;

        // Page-specific actions
        this.onPageEnter(pageId);
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
                if (typeof reports !== 'undefined') reports.setDefaultDates();
                break;
                
            case 'loginPage':
                // Stop camera if running on other pages
                if (this.modules.faceRecognition?.isCameraRunning()) {
                    this.modules.faceRecognition.stopCamera();
                }
                break;
        }
    }

    // ============================================
    // 🏠️ DASHBOARD INITIALIZATION
    // ============================================

    /**
     * Initialize dashboard with user data
     */
    async initializeDashboard() {
        try {
            if (!auth.isAuthenticated()) return;

            const user = auth.getCurrentUser();

            // Update user info in header
            const userNameEl = document.getElementById('userName');
            const userCodeEl = document.getElementById('userCodeDisplay');

            if (userNameEl) userNameEl.textContent = `مرحباً، ${user.name}`;
            if (userCodeEl) userCodeEl.textContent = `CODE: ${user.code}`;

            // Load dashboard stats
            const totalEmployees = await db.getEmployeesCount();
            ui.animateStatValue('totalEmployeesStat', totalEmployees);

            // Load today's attendance records
            await attendance.loadTodayRecords();

            // Start camera for face recognition
            this.startDashboardCamera();

            // Load known faces for recognition
            if (this.modules.faceRecognition) {
                await this.modules.faceRecognition.loadKnownFaces();
            }

            // If user is admin, enable admin features
            if (auth.isAdmin()) {
                if (this.modules.admin) this.modules.admin.setupAdminFeatures();
            }

            console.log('📊 Dashboard initialized');

        } catch (error) {
            console.error('Dashboard init error:', error);
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

            // Start camera with fallback
            await this.startCameraWithFallback(videoEl, { facingMode: 'user' });

            console.log('📹 Dashboard camera ready');

        } catch (error) {
            console.warn('Dashboard camera not available:', error.message);
            
            // Show message but don't block the app
            const container = document.getElementById('recognitionArea');
            if (container) {
                container.innerHTML += `
                    <div style="text-align:center;padding:20px;color:var(--text-muted);">
                        <i class="fas fa-camera-slash" style="font-size:48px;margin-bottom:10px;opacity:0.5;"></i>
                        <p>الكاميرا غير متاحة</p>
                        <button onclick="location.reload()" style="
                            display:inline-block;
                            padding:12px 24px;
                            background:var(--primary-600);
                            color:white;
                            border:none;
                            border-radius:8px;
                            cursor:pointer;
                            font-weight:bold;
                        ">
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

            // Default constraints
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
                this.currentVideoElement = videoElement;
            }

            this.isCameraActive = true;
            console.log('📹 Camera started successfully');
            return stream;

        } catch (error) {
            console.warn('Camera start error:', error.message);
            
            // Return graceful error without breaking the app
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // ⚙️ GLOBAL EVENT LISTENERS
    // ============================================

    /**
     * Setup all event listeners for the application
     */
    setupGlobalEventListeners() {
        // ============================================
        // NAVIGATION EVENTS
        // ============================================
        
        // Bottom navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPage = btn.dataset.page;
                if (targetPage) {
                    this.navigateTo(targetPage);
                    
                    // Page-specific initialization
                    switch (targetPage) {
                        case 'dashboardPage':
                            this.initializeDashboard();
                            break;
                        case 'reportsPage':
                            if (typeof reports !== 'undefined') reports.setDefaultDates();
                            break;
                        case 'changePasswordPage':
                            // Nothing special needed
                            break;
                    }
                }
            });
        });

        // ============================================
        // AUTH FORMS
        // ============================================
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.modules.auth) {
                    this.modules.auth.handleLogin(e);
                }
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (form) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.modules.auth) {
                    this.modules.auth.handleRegister(e);
                }
            });
        }

        // Forgot password form
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.modules.auth) {
                    this.modules.auth.handleForgotPassword(e);
                }
            });
        }

        // Change password form
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.modules.auth) {
                    this.modules.auth.handleChangePassword(e);
                }
            });
        }

        // Force password change form
        const forcePasswordForm = document.getElementById('forcePasswordForm');
        if (forcePasswordForm) {
            forcePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.modules.auth) {
                    this.modules.auth.handleForcePasswordChange(e);
                }
            });
        }

        // ============================================
        // AUTH LINKS & BUTTONS
        // ============================================
        
        // Show registration link
        const showRegisterLink = document.getElementById('showRegisterLink');
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('registerPage');
            });
        }

        // Show forgot password link
        const showForgotLink = document.getElementById('showForgotPasswordLink');
        if (showForgotLink) {
            showForgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('forgotPasswordPage');
            });
        }

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.navigateTo('loginPage');
            });
        });

        const backToLoginBtn = document.getElementById('backToLoginBtn');
        if (backToLoginBtn) {
            backToLoginBtn.addEventListener('click', () => {
                this.navigateTo('loginPage');
            });
        }

        const backToLoginFromRegister = document.getElementById('backToLoginFromRegister');
        if (backToLoginFromRegister) {
            backToLoginFromRegister.addEventListener('click', () => {
                this.navigateTo('loginPage');
            });
        }

        const backToLoginFromForgot = document.getElementById('backToLoginFromForgot');
        if (backToLoginFromForgot) {
            backToLoginFromForgot.addEventListener('click', () => {
                this.navigateTo('loginPage');
            });
        }

        // Biometric login button
        const biometricLoginBtn = document.getElementById('biometricLoginBtn');
        if (biometricLoginBtn) {
            biometricLoginBtn.addEventListener('click', () => {
                if (this.modules.auth) {
                    this.modules.auth.attemptBiometricAuth();
                }
            });
        }

        // ============================================
        // DASHBOARD ACTIONS
        // ============================================
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (this.modules.auth) {
                    this.modules.auth.logout();
                }
            });
        }

        // Check-in button
        const checkInBtn = document.getElementById('checkInBtn');
        if (checkInBtn) {
            checkInBtn.addEventListener('click', () => {
                if (this.modules.attendance) {
                    this.modules.attendance.handleCheckIn();
                }
            });
        }

        // Check-out button
        const checkOutBtn = document.getElementById('checkOutBtn');
        if (checkOutBtn) {
            checkOutBtn.addEventListener('click', () => {
                if (this.modules.attendance) {
                    this.modules.attendance.handleCheckOut();
                }
            });
        }

        // Switch camera button
        const switchCameraBtn = document.getElementById('switchCameraBtn');
        if (switchCameraBtn) {
            switchCameraBtn.addEventListener('click', () => {
                if (this.modules.faceRecognition) {
                    this.modules.faceRecognition.switchCamera();
                }
            });
        }

        // Face capture for registration
        const startFaceCaptureBtn = document.getElementById('startFaceCaptureBtn');
        if (startFaceCaptureBtn) {
            startFaceCaptureBtn.addEventListener('click', async () => {
                try {
                    ui.showButtonLoading(startFaceCaptureBtn, 'جاري تشغيل الكاميرا...');
                    
                    if (this.modules.faceRecognition) {
                        await this.modules.faceRecognition.startCamera(
                            this.modules.faceRecognition.registerVideo,
                            { facingMode: 'user' }
                        );
                        
                        const captureBtn = document.getElementById('captureFaceBtn');
                        if (captureBtn) captureBtn.classList.remove('hidden');
                        
                        const overlay = document.getElementById('registerOverlay');
                        if (overlay) overlay.style.display = 'none';
                        
                        ui.showSuccess('تم تشغيل الكاميرا ✓');
                        
                        const captureFaceBtn2 = document.getElementById('captureFaceBtn');
                        if (captureFaceBtn2 && !captureFaceBtn2.dataset.listenerAttached) {
                            captureFaceBtn2.addEventListener('click', (e) => {
                                if (this.modules.faceRecognition) {
                                    this.modules.faceRecognition.handleRegistrationCapture(e);
                                }
                            });
                            captureFaceBtn2.dataset.listenerAttached = 'true';
                        }
                    }
                    
                } catch (error) {
                    ui.showError(error.message || 'فشل تشغيل الكاميرا');
                } finally {
                    ui.hideButtonLoading(startFaceCaptureBtn);
                }
            });
        }

        // ============================================
        // SETTINGS & PANELS
        // ============================================
        
        // Notifications panel
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                ui.openPanel('notificationsPanel');
            });
        }

        const closeNotificationsBtn = document.getElementById('closeNotificationsBtn');
        if (closeNotificationsBtn) {
            closeNotificationsBtn.addEventListener('click', () => {
                ui.closePanel('notificationsPanel');
            });
        }

        const markAllReadBtn = document.getElementById('markAllReadBtn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                if (this.modules.admin) {
                    this.modules.admin.markAllNotificationsRead();
                }
            });
        }

        // Settings panel
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                ui.openPanel('settingsPanel');
            });
        }

        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                ui.closePanel('settingsPanel');
            });
        }

        // Settings toggles
        document.querySelectorAll('#settingsPanel input[type="checkbox"]').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.saveSetting(e.target.id, e.target.checked);
            });
        });

        // ============================================
        // PASSWORD VISIBILITY TOGGLES
        // ============================================
        
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                ui.togglePasswordVisibility(e);
            });
        });

        // ============================================
        // PASSWORD STRENGTH INDICATORS
        // ============================================
        
        const regPassword = document.getElementById('regPassword');
        if (regPassword) {
            regPassword.addEventListener('input', (e) => {
                ui.updatePasswordStrength(e.target.value, 'passwordStrength');
            });
        }

        const newPassword = document.getElementById('newPassword');
        if (newPassword) {
            newPassword.addEventListener('input', (e) => {
                ui.updatePasswordStrength(e.target.value, 'newPasswordStrength');
            });
        }

        const forceNewPassword = document.getElementById('forceNewPassword');
        if (forceNewPassword) {
            forceNewPassword.addEventListener('input', (e) => {
                ui.updatePasswordStrength(e.target.value, 'forcePasswordStrength');
            });
        }

        // ============================================
        // NETWORK STATUS
        // ============================================
        
        window.addEventListener('online', this.handleOnlineStatus);
        window.addEventListener('offline', this.handleOnlineStatus);

        // ============================================
        // KEYBOARD SHORTCUTS
        // ============================================
        
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + L to focus on location bar (prevent default)
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
            }
        });

        // Prevent zoom on double tap (mobile)
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    // ============================================
    // ⚙️ SETTINGS MANAGEMENT
    // ============================================

    /**
     * Load user settings from storage
     */
    loadUserSettings() {
        const settings = Utils.loadFromStorage(Constants.storageKeys.SETTINGS, {
            soundEnabled: true,
            vibrationEnabled: true,
            dataSaverMode: false
        });

        // Apply settings to UI
        Object.entries(settings).forEach(([key, value]) => {
            const toggle = document.getElementById(key);
            if (toggle) {
                toggle.checked = value;
            }
        });
    }

    /**
     * Save a setting
     */
    saveSetting(key, value) {
        const settings = Utils.loadFromStorage(Constants.storageKeys.SETTINGS, {});
        settings[key] = value;
        Utils.saveToStorage(Constants.storageKeys.SETTINGS, settings);
        
        console.log(`⚙️ Setting saved: ${key} = ${value}`);
    }

    // ============================================
    // 📱 PWA FEATURES
    // ============================================

    /**
     * Setup Progressive Web App features
     */
    setupPWAFeatures() {
        // Register service worker (if not already registered)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                console.log('✅ Service Worker active:', registration.scope);
            }).catch(error => {
                console.warn('⚠️ SW registration pending:', error);
            });
        }

        // Handle install prompt (for "Add to Home Screen")
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredInstallPrompt = e;
            
            console.log('📲 Install prompt available');
        });

        // Handle successful installation
        window.addEventListener('appinstalled', () => {
            console.log('✅ App installed successfully');
            ui.showSuccess('تم تثبيت التطبيق بنجاح! 🎉');
            this.deferredInstallPrompt = null;
        });

        // Check if running as installed PWA
        if (Utils.isPWAInstalled()) {
            console.log('📱 Running as installed PWA');
        }
    }

    /**
     * Prompt user to install PWA (call from custom button)
     */
    async promptInstall() {
        if (!this.deferredInstallPrompt) {
            ui.showInfo('يمكنك تثبيت التطبيق من قائمة المتصفح');
            return;
        }

        try {
            const result = await this.deferredInstallPrompt.prompt();
            
            if (result.outcome === 'accepted') {
                console.log('User accepted install prompt');
            } else {
                console.log('User dismissed install prompt');
            }
            
            this.deferredInstallPrompt = null;

        } catch (error) {
            console.error('Install prompt error:', error);
        }
    }

    // ============================================
    // 🌐 NETWORK HANDLING
    // ============================================

    /**
     * Handle online/offline status changes
     */
    handleOnlineStatus(event) {
        if (event.type === 'online') {
            ui.hideOfflineIndicator();
            
            // Process any queued offline operations
            this.processOfflineQueue();
            
        } else if (event.type === 'offline') {
            ui.showOfflineIndicator();
        }
    }

    /**
     * Process operations that were queued while offline
     */
    async processOfflineQueue() {
        const queue = Utils.loadFromStorage(Constants.storageKeys.OFFLINE_QUEUE, []);
        
        if (queue.length === 0) return;

        ui.showInfo(`جاري مزامنة ${queue.length} عملية محفوظة...`);

        const remaining = [];

        for (const operation of queue) {
            try {
                switch (operation.type) {
                    case 'attendance':
                        await db.recordAttendance(operation.data);
                        break;
                    // Add more operation types as needed
                }
                
                console.log(`✅ Synced offline operation: ${operation.id}`);
                
            } catch (error) {
                console.error(`Failed to sync: ${operation.id}`, error);
                operation.retries = (operation.retries || 0) + 1;
                
                if (operation.retries < 3) {
                    remaining.push(operation);
                }
            }
        }

        // Save remaining operations
        Utils.saveToStorage(Constants.storageKeys.OFFLINE_QUEUE, remaining);

        if (remaining.length === 0) {
            ui.showSuccess('تمت المزامنة بنجاح ✓');
        } else {
            ui.showWarning(`بعض العمليات فشلت (${remaining.length} متبقية)`);
        }
    }

    // ============================================
    // 🔔 NOTIFICATIONS
    // ============================================

    /**
     * Request notification permission (for push notifications)
     */
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    /**
     * Show browser notification
     */
    showBrowserNotification(title, options = {}) {
        if (Notification.permission !== 'granted') return;

        const notification = new Notification(title, {
            icon: 'icon-192.png',
            badge: 'icon-192.png',
            dir: 'rtl',
            lang: 'ar',
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================

    /**
     * Get current application state
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            currentPage: this.currentPage,
            isAuthenticated: auth.isAuthenticated(),
            currentUser: auth.getCurrentUser(),
            isOnline: Utils.isOnline(),
            isPWAInstalled: Utils.isPWAInstalled()
        };
    }

    /**
     * Log application state (for debugging)
     */
    logState() {
        console.table(this.getState());
    }

    /**
     * Force refresh/reload application
     */
    forceRefresh() {
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        
        window.location.reload(true);
    }

    /**
     * Clear all application data and reset
     */
    async clearAllData() {
        const confirmed = await ui.showConfirmation({
            title: '⚠️ مسح جميع البيانات',
            message: 'سيتم حذف جميع البيانات المحلية والإعدادات. هذا الإجراء لا يمكن التراجع عنه!',
            confirmText: 'نعم، امسح الكل',
            cancelText: 'إلغاء',
            type: 'danger'
        });

        if (confirmed) {
            // Clear storages
            localStorage.clear();
            sessionStorage.clear();

            // Clear caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            // Reload
            window.location.reload();
        }
    }
}

// ============================================
// 🎯 APPLICATION ENTRY POINT
// ============================================

// Create global application instance
const app = new App();

// Export for use in other modules
window.App = App;
window.app = app;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM Ready - Starting Axentro System v' + AppConfig.app.version);
    
    // Start application initialization
    app.init().catch(error => {
        console.error('Fatal error during initialization:', error);
        
        // Fallback: Show basic version without advanced features
        document.getElementById('loadingScreen').style.display = 'flex';
        document.getElementById('loadStatus').textContent = 'جاري تشغيل النظام...';
        
        // Try simpler initialization
        setTimeout(() => {
            ui.hideLoadingScreen();
        }, 2000);
    });
});

// Handle unhandled errors globally
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('🚨 Global Error:', { msg, url, lineNo, columnNo, error });
    
    // Don't show toast for every error (too noisy)
    // But log it for debugging
    
    return false;
};

window.onunhandledrejection = function(event) {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    
    // Show user-friendly message for network errors
    if (event.reason?.message?.includes('fetch')) {
        ui.showError('خطأ في الاتصال بالخادم');
    }
    
    event.preventDefault();
};

// Log app version
console.log(`
%c┌─────────────────────────────────────┐
│  AXENTRO ATTENDANCE SYSTEM v${AppConfig.app.version}  │
│  © ${new Date().getFullYear()} Axentro Team              │
│  Build: ${new Date().toISOString().split('T')[0]}       │
└─────────────────────────────────────┘
`, 'color: #3b82f6; font-weight: bold; font-size: 14px;');
