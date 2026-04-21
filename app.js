/**
 * ============================================
 * 🎯 AXENTRO APPLICATION v4.2 - MAIN CONTROLLER
 * ✅ Core Application Logic & Initialization
 * 🔥 Enhanced with All Legacy Features
 * ============================================
 */

// ============================================
// 🛡️ GLOBAL ERROR HANDLER
// ============================================

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Unhandled Promise Rejection:', event.reason);
});

window.addEventListener('error', function(event) {
    console.error('❌ Global Error:', event.error);
    
    if (document.getElementById('splashScreen')?.style.display !== 'none') {
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
        this.maxRetries = AppConfig?.retry?.maxAttempts || 3;
        
        // Module references
        this.modules = {};
        
        // Bind methods
        this.init = this.init.bind(this);
        this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
        
        console.log('🏗️ App constructor initialized');
    }

    handleOnlineStatus() {
        const isOnline = navigator.onLine;
        window.isOnline = isOnline;

        const connDot = document.getElementById('connDot');
        const connText = document.getElementById('connText');

        if (connDot) {
            connDot.classList.toggle('online', isOnline);
            connDot.classList.toggle('offline', !isOnline);
        }

        if (connText) {
            connText.textContent = isOnline ? 'متصل' : 'غير متصل';
        }
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    async init() {
        console.log(`🚀 Starting Axentro Application v${AppConfig?.app?.version || '4.2.0'}`);
        
        try {
            // Step 1: Update progress
            this.updateProgress(10, 'تهيئة الواجهة...');
            await this.sleep(100);

            // Step 2: Verify dependencies
            this.updateProgress(20, 'التحقق من المكونات...');
            
            if (!this.verifyDependencies()) {
                throw new Error('بعض المكونات الأساسية غير متوفرة');
            }

            // Step 3: Setup global events
            this.setupGlobalEventListeners();
            this.updateProgress(30, 'إعداد المستمعين...');

            // Step 4: Initialize database (من الكود القديم)
            this.updateProgress(40, 'الاتصال بقاعدة البيانات...');
            await this.initializeDatabase();

            // Step 5: Load face recognition models (من الكود القديم)
            this.updateProgress(50, 'جاري تحميل نماذج الذكاء الاصطناعي...');
            
            const faceRecognitionLoaded = await this.loadFaceRecognitionWithFallback();
            
            if (!faceRecognitionLoaded) {
                console.warn('⚠️ Face recognition not available - continuing in basic mode');
                window.faceRecognitionAvailable = false;
            } else {
                window.faceRecognitionAvailable = true;
                console.log('✅ Face recognition loaded successfully');
            }

            // Step 6: Check for existing session (من الكود القديم)
            this.updateProgress(70, 'التحقق من الجلسة...');
            
            let hasSession = false;
            if (typeof auth !== 'undefined' && auth.checkExistingSession) {
                hasSession = await auth.checkExistingSession();
            } else {
                // Fallback to legacy session check
                hasSession = this.restoreLegacySession();
            }

            // Step 7: Load user settings
            this.updateProgress(80, 'تحميل الإعدادات...');
            this.loadUserSettings();

            // Step 8: Setup PWA features
            this.updateProgress(90, 'إعداد التطبيق...');
            try {
                this.setupPWAFeatures();
            } catch (pwaError) {
                console.warn('⚠️ PWA setup failed:', pwaError.message);
            }

            // Step 9: SUCCESS!
            this.updateProgress(100, 'تم التحميل بنجاح ✓');
            
            setTimeout(() => {
                this.hideSplashScreen();
                this.hideAllPages();
                
                if (hasSession && this.isAuthenticated() && !window.forceFaceEnrollment && !window.firstTimeSetupMode) {
                    this.navigateTo(window.user?.role === 'admin' || window.user?.isAdmin ? 'adminPage' : 'dashboardPage');
                    this.initializeDashboard();
                } else {
                    this.navigateTo('loginPage');
                }
                
                this.isInitialized = true;
                this.retryCount = 0;
                
                console.log('✅ Application initialized successfully!');
                
                // Play success sound (من الكود القديم)
                if (typeof ui !== 'undefined' && ui.playSound) {
                    ui.playSound('loginSuccess', 0.5);
                }

            }, 800);

        } catch (error) {
            console.error('❌ Application initialization FAILED:', error);
            this.handleInitializationFailure(error);
        }
    }

    // ============================================
    // 🔧 HELPER METHODS
    // ============================================

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
        
        if (typeof ui !== 'undefined' && ui.updateLoadingProgress) {
            ui.updateLoadingProgress(percent, statusText);
        }
    }

    verifyDependencies() {
        const requiredDeps = [
            { name: 'AppConfig', obj: typeof AppConfig !== 'undefined' },
            { name: 'ui', obj: typeof ui !== 'undefined', optional: true },
            { name: 'Utils', obj: typeof Utils !== 'undefined', optional: true },
            { name: 'Constants', obj: true, optional: true },
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

    async initializeDatabase() {
        try {
            if (typeof db !== 'undefined' && db.isConnectedToSupabase) {
                if (!db.isConnectedToSupabase()) {
                    console.warn('⚠️ Supabase client not fully initialized');
                } else {
                    console.log('✅ Supabase connected successfully');
                }
            }
        } catch (dbError) {
            console.warn('⚠️ Database initialization warning:', dbError.message);
        }
    }

    async loadFaceRecognitionWithFallback() {
        if (window.skipFaceApi === true) {
            console.log('⏭️ Face recognition skipped by user or system');
            return false;
        }

        if (typeof faceapi === 'undefined') {
            console.warn('⚠️ face-api.js library not loaded');
            if (!window.faceApiLoadError) {
                return await this.tryAlternativeFaceApiCdn();
            }
            return false;
        }

        if (typeof faceRecognition === 'undefined') {
            console.warn('⚠️ Face Recognition module not found');
            return false;
        }

        try {
            await (faceRecognition.init ? faceRecognition.init() : Promise.resolve(true));
            window.faceRecognitionAvailable = true;
            window.modelsLoaded = !!(faceRecognition.areModelsLoaded && faceRecognition.areModelsLoaded());

            setTimeout(() => {
                try {
                    if (faceRecognition?.loadModelsWithSafetyNet && !faceRecognition.areModelsLoaded?.()) {
                        faceRecognition.loadModelsWithSafetyNet().catch((e) => {
                            console.warn('⚠️ Background model prefetch skipped:', e?.message || e);
                        });
                    }
                } catch (e) {
                    console.warn('⚠️ Background model prefetch error:', e?.message || e);
                }
            }, 1200);

            return true;
        } catch (error) {
            console.error('❌ Face recognition init failed:', error.message || error);
            window.modelsLoaded = false;
            return false;
        }
    }

    async loadModelsDirectly() {
        // Direct model loading (من الكود القديم)
        try {
            const MODELS_URL = AppConfig?.faceRecognition?.models?.baseUrl || AppConfig?.faceRecognition?.models?.fallbackUrl || (AppConfig?.faceRecognition?.models?.baseUrl || './models');
            
            setStatus('جاري تحميل الذكاء الاصطناعي (1/3)...');
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
            window.lightModels = true;

            setStatus('جاري تحميل الذكاء الاصطناعي (2/3)...');
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);

            setStatus('جاري تحميل الذكاء الاصطناعي (3/3)...');
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
            window.heavyModels = true;

            setStatus('النظام جاهز');
            return true;

        } catch(e) {
            console.error('Model loading error:', e);
            throw e;
        }
    }

    hideSplashScreen() {
        const splash = document.getElementById('loadingScreen') || document.getElementById('splashScreen');
        const appRoot = document.getElementById('app');

        if (splash) {
            splash.classList.add('hidden');
            splash.style.display = 'none';
        }

        if (appRoot) {
            appRoot.classList.remove('hidden');
            appRoot.style.display = 'block';
        }
    }

    showLoadingError(message) {
        const errorBox = document.getElementById('loadingError') || document.getElementById('errorActions');
        if (errorBox) {
            errorBox.style.display = 'block';
            errorBox.classList.add('show');
            const msgEl = errorBox.querySelector('p');
            if (msgEl && message) msgEl.textContent = message;
        }
    }

    handleInitializationFailure(error) {
        console.error('❌ Init failed:', error);
        this.showLoadingError(error.message);
        
        this.retryCount++;
        if (this.retryCount < this.maxRetries) {
            setTimeout(() => this.init(), 2000 * this.retryCount);
        }
    }

    retryLoading() {
        const actions = document.getElementById('errorActions');
        if (actions) {
            actions.classList.remove('show');
        }
        this.retryCount = 0;
        this.init();
    }

    skipFaceRecognition() {
        window.skipFaceApi = true;
        this.hideSplashScreen();
        showToast('تم تشغيل النظام بدون التعرف على الوجه', 'warning');
    }

    // ============================================
    // 👤 SESSION MANAGEMENT (من الكود القديم)
    // ============================================

    restoreLegacySession() {
        const savedSessionStr = localStorage.getItem('rememberedUser');
        const savedTempStr = sessionStorage.getItem('user');
        const savedLogin = localStorage.getItem('axentro_saved_login');
        
        let savedUser = null;
        
        if (savedLogin) {
            try {
                const ld = JSON.parse(savedLogin);
                const loginCodeInput = document.getElementById('loginCode');
                const loginPassInput = document.getElementById('loginPassword') || document.getElementById('loginPass');
                const rememberMeCheckbox = document.getElementById('rememberMe');
                
                if (loginCodeInput) loginCodeInput.value = ld.code || '';
                if (loginPassInput) loginPassInput.value = ld.pass || '';
                if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
            } catch(e) {}
        }
        
        if (savedSessionStr) {
            try {
                const s = JSON.parse(savedSessionStr);
                // 10 hours timeout (من الكود القديم)
                if (Date.now() - s.timestamp < 10 * 60 * 60 * 1000) {
                    savedUser = s.data;
                    this.hideLoginScreen();
                    this.showMainApp();
                } else {
                    localStorage.removeItem('rememberedUser');
                }
            } catch(e) {
                localStorage.removeItem('rememberedUser');
            }
        } else if (savedTempStr) {
            try {
                savedUser = JSON.parse(savedTempStr);
                this.hideLoginScreen();
                this.showMainApp();
            } catch(e) {
                sessionStorage.removeItem('user');
            }
        }
        
        if (savedUser) {
            window.user = savedUser;
            return true;
        }
        
        return false;
    }

    isAuthenticated() {
        return window.user !== null && window.user !== undefined;
    }

    // ============================================
    // 📍 LOCATION TRACKING (من الكود القديم)
    // ============================================

    setupLocationTracking() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    window.currentLat = pos.coords.latitude;
                    window.currentLon = pos.coords.longitude;
                    window.currentAccuracy = pos.coords.accuracy || 0;
                    window.currentLoc = `https://maps.google.com/?q=${window.currentLat},${window.currentLon}`;
                    
                    const locBar = document.getElementById('locationStatus') || document.getElementById('locBar');
                    if (locBar) {
                        locBar.innerHTML = `
                            <i class="fas fa-map-marker-alt" style="color:#10b981;"></i> 
                            <a href="${window.currentLoc}" target="_blank" style="color:#38bdf8; text-decoration:none;">
                                الموقع محدد
                            </a>
                        `;
                    }
                },
                () => {
                    const locBar = document.getElementById('locationStatus') || document.getElementById('locBar');
                    if (locBar) {
                        locBar.innerHTML = `
                            <i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i> 
                            <span style="color:#94a3b8;">تعذر تحديد الموقع</span>
                        `;
                    }
                    window.currentLoc = 'غير متوفر';
                    window.currentLat = null;
                    window.currentLon = null;
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        }
    }


    async verifyRealConnection(expectedOnline = true) {
        try {
            if (expectedOnline && navigator.onLine === false) return false;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3500);
            const testUrl = `${AppConfig?.supabase?.url || window.location.origin}/rest/v1/?ping=${Date.now()}`;
            await fetch(testUrl, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timer);
            return true;
        } catch (_error) {
            return false;
        }
    }

    // ============================================
    // 🌐 ONLINE/OFFLINE DETECTION (من الكود القديم)
    // ============================================

    setupGlobalEventListeners() {
        // Online/Offline detection
        let offlineToastTimer = null;
        const markConnectionState = async (expectedOnline) => {
            const connDot = document.getElementById('connDot');
            const connText = document.getElementById('connText');
            const pingOk = await this.verifyRealConnection(expectedOnline);

            window.isOnline = pingOk;
            if (connDot) {
                connDot.classList.toggle('online', pingOk);
                connDot.classList.toggle('offline', !pingOk);
            }
            if (connText) connText.textContent = pingOk ? 'متصل' : 'غير متصل';

            if (!pingOk) {
                if (offlineToastTimer) clearTimeout(offlineToastTimer);
                offlineToastTimer = setTimeout(() => {
                    if (window.isOnline === false) {
                        showToast('تعذر التحقق من الاتصال حالياً، جاري المحاولة مجدداً...', 'warning');
                    }
                }, 3500);
            } else if (offlineToastTimer) {
                clearTimeout(offlineToastTimer);
                offlineToastTimer = null;
            }
        };

        window.addEventListener('online', () => markConnectionState(true));
        window.addEventListener('offline', () => markConnectionState(false));

        // Unlock audio on first interaction (من الكود القديم)
        document.addEventListener('click', () => this.unlockAudio(), { once: true });
        document.addEventListener('touchstart', () => this.unlockAudio(), { once: true });

        // Keyboard shortcuts
        document.addEventListener('DOMContentLoaded', () => {
            // Fingerprint button visibility
            if (window.PublicKeyCredential && localStorage.getItem('axentro_fp_id')) {
                const fpBtn = document.getElementById('biometricLoginBtn') || document.getElementById('fingerprintLoginBtn');
                if (fpBtn) fpBtn.style.display = 'flex';
            }

            // Enter key handlers
            const loginCode = document.getElementById('loginCode');
            const loginPass = document.getElementById('loginPassword') || document.getElementById('loginPass');
            const forgotCode = document.getElementById('forgotCode');

            if (loginCode) {
                loginCode.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (loginPass) loginPass.focus();
                    }
                });
            }

            if (loginPass) {
                loginPass.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        // Trigger login
                        if (typeof handleLogin === 'function') {
                            handleLogin(new Event('submit'));
                        }
                    }
                });
            }

            if (forgotCode) {
                forgotCode.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (typeof submitForgotPw === 'function') submitForgotPw();
                    }
                });
            }
        });
    }

    // ============================================
    // 🔊 AUDIO SYSTEM (من الكود القديم)
    // ============================================

    unlockAudio() {
        if (window.audioUnlocked) return;
        
        try {
            const audio = document.getElementById('login-success');
            if (audio) {
                audio.play().then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    window.audioUnlocked = true;
                }).catch(() => {});
            }
        } catch(e) {}
    }

    playSound(id) {
        if (!window.audioUnlocked) {
            this.unlockAudio();
            return;
        }
        
        try {
            const audio = document.getElementById(id);
            if (!audio) return;
            
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } catch(e) {}
    }

    // ============================================
    // 🎨 UI HELPERS
    // ============================================

    hideAllPages() {
        const pages = ['loginPage', 'registerPage', 'forgotPasswordPage', 'dashboardPage', 'adminPage'];
        pages.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove('active');
            el.style.display = 'none';
        });
    }


    navigateTo(pageId) {
        const appRoot = document.getElementById('app');
        if (appRoot) {
            appRoot.classList.remove('hidden');
            appRoot.style.display = 'block';
        }

        this.hideAllPages();

        if (pageId === 'loginPage') {
            this.showLoginScreen();
        } else if (pageId === 'registerPage') {
            this.showRegisterScreen();
        } else if (pageId === 'forgotPasswordPage') {
            window.showForgotPasswordScreen?.();
        } else if (pageId === 'dashboardPage' || pageId === 'adminPage') {
            this.showMainApp();
        }
    }

    showLoginScreen() {
        this.hideAllPages();
        const loginPage = document.getElementById('loginPage');
        if (loginPage) {
            loginPage.style.display = 'block';
            loginPage.classList.add('active');
        }
    }

    showMainApp() {
        if (window.forceFaceEnrollment || window.firstTimeSetupMode) {
            this.showLoginScreen();
            return;
        }
        this.applyUserContextToDashboard();
        this.hideAllPages();

        const dashboardPage = document.getElementById('dashboardPage');
        const adminPage = document.getElementById('adminPage');

        if (window.user?.role === 'admin' || window.user?.isAdmin) {
            if (adminPage) {
                adminPage.style.display = 'block';
                adminPage.classList.add('active');
            }
            if (typeof loadEmployees === 'function') {
                Promise.resolve(loadEmployees()).catch(err => console.warn('loadEmployees failed:', err));
            }
        } else {
            if (dashboardPage) {
                dashboardPage.style.display = 'block';
                dashboardPage.classList.add('active');
            }
        }
    }

    applyUserContextToDashboard() {
        const user = window.user || {};
        const isAdmin = user.role === 'admin' || user.isAdmin === true;
        const displayName = isAdmin ? (user.name || 'مدير النظام') : (user.name || 'موظف');
        const displayCode = isAdmin ? (user.username || 'admin') : (user.code || '----');

        const userName = document.getElementById('userName');
        const userCodeDisplay = document.getElementById('userCodeDisplay');
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        const adminLogoutBtn = document.getElementById('adminLogoutBtn');
        const adminHeaderName = document.getElementById('adminHeaderName');
        const adminHeaderCode = document.getElementById('adminHeaderCode');
        const totalEmployeesStat = document.getElementById('totalEmployeesStat');

        if (userName) {
            userName.textContent = `مرحباً، ${displayName}`;
        }

        if (userCodeDisplay) {
            userCodeDisplay.textContent = `CODE: ${displayCode}`;
        }

        if (adminPanelBtn) {
            adminPanelBtn.style.display = isAdmin ? 'inline-flex' : 'none';
            adminPanelBtn.onclick = (e) => {
                e?.preventDefault?.();
                this.navigateTo(isAdmin ? 'adminPage' : 'dashboardPage');
            };
        }

        if (adminHeaderName) adminHeaderName.textContent = displayName;
        if (adminHeaderCode) adminHeaderCode.textContent = isAdmin ? `ADMIN: ${displayCode}` : `CODE: ${displayCode}`;
        if (adminLogoutBtn) adminLogoutBtn.style.display = isAdmin ? 'inline-flex' : 'none';

        document.querySelectorAll('.admin-only').forEach((el) => {
            el.style.display = isAdmin ? '' : 'none';
        });

        const attendanceSection = document.querySelector('.attendance-section');
        const statsGrid = document.querySelector('.stats-grid');
        if (attendanceSection) attendanceSection.style.display = isAdmin ? 'none' : '';
        if (statsGrid && isAdmin && totalEmployeesStat) {
            totalEmployeesStat.textContent = totalEmployeesStat.textContent || '0';
        }

        document.querySelectorAll('.nav-link').forEach((link) => {
            const target = link.getAttribute('data-page');
            const shouldBeActive = isAdmin ? target === 'adminPage' : target === 'dashboardPage';
            link.classList.toggle('active', !!shouldBeActive);
        });
    }

    hideLoginScreen() {
        const loginPage = document.getElementById('loginPage');
        if (loginPage) loginPage.classList.remove('active');
    }

    showRegisterScreen() {
        this.hideAllPages();
        const registerPage = document.getElementById('registerPage');
        if (registerPage) {
            registerPage.style.display = 'block';
            registerPage.classList.add('active');
        }
    }

    // ============================================
    // 🔄 AUTO-REFRESH (من الكود القديم)
    // ============================================

    startAutoRefresh() {
        const interval = AppConfig?.attendance?.autoRefreshInterval || 30000;
        
        if (window.autoRefreshTimer) clearInterval(window.autoRefreshTimer);
        
        window.autoRefreshTimer = setInterval(() => {
            if (window.user) this.refreshData(true);
        }, interval);
    }

    stopAutoRefresh() {
        if (window.autoRefreshTimer) {
            clearInterval(window.autoRefreshTimer);
            window.autoRefreshTimer = null;
        }
    }

    async refreshData(silent = false) {
        const refreshBtn = document.getElementById('refreshBtn');
        
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.style.animation = 'spin 0.5s linear';
                setTimeout(() => icon.style.animation = '', 600);
            }
        }
        
        if (window.user?.isAdmin) {
            if (typeof loadEmployees === 'function') await loadEmployees();
        } else if (window.user) {
            if (typeof fetchUserDataInBackground === 'function') fetchUserDataInBackground();
        }
        
        if (!silent) showToast('تم التحديث', 'success');
    }

    // ============================================
    // 👤 USER SETTINGS
    // ============================================

    loadUserSettings() {
        // Load sound preferences
        const soundEnabled = localStorage.getItem('axentro_sound_enabled');
        if (soundEnabled !== null) {
            window.soundEnabled = soundEnabled === 'true';
        } else {
            window.soundEnabled = true;
        }

        // Load vibration preferences
        const vibrationEnabled = localStorage.getItem('axentro_vibration_enabled');
        if (vibrationEnabled !== null) {
            window.vibrationEnabled = vibrationEnabled === 'true';
        } else {
            window.vibrationEnabled = true;
        }
    }

    // ============================================
    // 📱 PWA FEATURES
    // ============================================

    setupPWAFeatures() {
        // Register service worker if available
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('✅ Service Worker registered'))
                .catch(err => console.warn('⚠️ SW registration failed:', err));
        }
    }

    // ============================================
    // ⏰ UTILITY
    // ============================================

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async tryAlternativeFaceApiCdn() {
        console.log('🔄 Trying alternative CDN...');
        // Implementation for fallback CDN
        return false;
    }

    initializeDashboard() {
        if (typeof showApp === 'function') {
            showApp();
        }
    }
}

// ============================================
// 🌍 GLOBAL FUNCTIONS (من الكود القديم - للتوافق)
// ============================================

// Toast notification
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log('[TOAST]', type, msg);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `app-toast app-toast-${type}`;
    const iconMap = { success: 'check-circle', error: 'triangle-exclamation', warning: 'circle-exclamation', info: 'circle-info' };
    toast.innerHTML = `<div class="app-toast-icon"><i class="fas fa-${iconMap[type] || iconMap.info}"></i></div><div class="app-toast-body"><strong>${type === 'success' ? 'تم بنجاح' : type === 'error' ? 'تنبيه مهم' : type === 'warning' ? 'ملاحظة' : 'إشعار'}</strong><span>${msg}</span></div><button class="app-toast-close" aria-label="close">&times;</button>`;
    const close = () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 240); };
    toast.querySelector('.app-toast-close')?.addEventListener('click', close);
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(close, (AppConfig?.ui?.toast?.defaultDuration || 4500));
}

function showAppDialog(message, title = 'تنبيه') {
    let modal = document.getElementById('appDialog');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'appDialog';
        modal.className = 'app-dialog-backdrop';
        modal.innerHTML = `<div class="app-dialog"><div class="app-dialog-header"><i class="fas fa-shield-halved"></i><strong id="appDialogTitle"></strong></div><div class="app-dialog-message" id="appDialogMessage"></div><div class="app-dialog-actions"><button id="appDialogOk" class="btn btn-primary">حسنًا</button></div></div>`;
        document.body.appendChild(modal);
        modal.querySelector('#appDialogOk')?.addEventListener('click', () => modal.classList.remove('show'));
    }
    modal.querySelector('#appDialogTitle').textContent = title;
    modal.querySelector('#appDialogMessage').textContent = message;
    modal.classList.add('show');
}
if (typeof window !== 'undefined') { window.alert = (msg) => showAppDialog(String(msg || ''), 'رسالة النظام'); }

// Status update
function setStatus(txt) {
    const el = document.getElementById('connText');
    if (el) el.textContent = txt;
}

// Password toggle
function togglePassword(id) {
    const i = document.getElementById(id);
    if (i) {
        i.type = i.type === 'password' ? 'text' : 'password';
    }
}

// Shift selection
function selectShift(element) {
    document.querySelectorAll('.shift-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    const input = element.querySelector('input');
    if (input) input.checked = true;
}

// ============================================
// 🚀 INITIALIZE APP
// ============================================

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app;
    
    // Initialize location tracking
    if (typeof app.setupLocationTracking === 'function') {
        app.setupLocationTracking();
    }
    
    // Start the app
    app.init();
});

// Make globally available
if (typeof window !== 'undefined') {
    window.App = App;
    window.app = app;
}


if (typeof window !== 'undefined') {
    window.retryLoading = () => window.app?.retryLoading?.();
    window.skipFaceRecognition = () => window.app?.skipFaceRecognition?.();
    window.showLoadingError = (message) => window.app?.showLoadingError?.(message);
    window.showLoginScreen = () => window.app?.showLoginScreen?.();
    window.showRegisterScreen = () => window.app?.showRegisterScreen?.();
    window.showForgotPasswordScreen = () => {
        const loginPage = document.getElementById('loginPage');
        const registerPage = document.getElementById('registerPage');
        const forgotPasswordPage = document.getElementById('forgotPasswordPage');
        const dashboardPage = document.getElementById('dashboardPage');
        const appRoot = document.getElementById('app');
        if (appRoot) appRoot.classList.remove('hidden');
        [loginPage, registerPage, dashboardPage].forEach(el => el?.classList.remove('active'));
        forgotPasswordPage?.classList.add('active');
    };
    window.showApp = () => window.app?.showMainApp?.();
}
