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
                
                if (hasSession && this.isAuthenticated()) {
                    this.navigateTo('dashboardPage');
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
            { name: 'Constants', obj: typeof Constants !== 'undefined', optional: true },
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
            const timeoutMs = AppConfig?.faceRecognition?.timeout?.modelLoad || 15000;
            
            const loadPromise = faceRecognition.loadModels ? 
                faceRecognition.loadModels() : 
                this.loadModelsDirectly();
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('تجاوز وقت تحميل النماذج')), timeoutMs)
            );

            const result = await Promise.race([loadPromise, timeoutPromise]);
            return result;

        } catch (error) {
            console.error('❌ Face recognition models failed to load:', error.message);
            window.modelsLoaded = false;
            return false;
        }
    }

    async loadModelsDirectly() {
        // Direct model loading (من الكود القديم)
        try {
            const MODELS_URL = AppConfig?.faceRecognition?.models?.tinyFaceDetector || 
                              'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';
            
            setStatus('جاري تحميل الذكاء الاصطناعي (1/4)...');
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
            window.lightModels = true;

            setStatus('جاري تحميل الذكاء الاصطناعي (2/4)...');
            await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL);

            setStatus('جاري تحميل الذكاء الاصطناعي (3/4)...');
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);

            setStatus('جاري تحميل الذكاء الاصطناعي (4/4)...');
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
        const splash = document.getElementById('splashScreen');
        if (splash) {
            splash.classList.add('hidden');
        }
    }

    showLoadingError(message) {
        const actions = document.getElementById('errorActions');
        if (actions) {
            actions.classList.add('show');
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
                const loginPassInput = document.getElementById('loginPass');
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
                    
                    const locBar = document.getElementById('locBar');
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
                    const locBar = document.getElementById('locBar');
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

    // ============================================
    // 🌐 ONLINE/OFFLINE DETECTION (من الكود القديم)
    // ============================================

    setupGlobalEventListeners() {
        // Online/Offline detection
        window.addEventListener('online', () => {
            window.isOnline = true;
            const connDot = document.getElementById('connDot');
            const connText = document.getElementById('connText');
            
            if (connDot) {
                connDot.classList.remove('offline');
                connDot.classList.add('online');
            }
            if (connText) connText.textContent = 'متصل';
        });

        window.addEventListener('offline', () => {
            window.isOnline = false;
            const connDot = document.getElementById('connDot');
            const connText = document.getElementById('connText');
            
            if (connDot) {
                connDot.classList.remove('online');
                connDot.classList.add('offline');
            }
            if (connText) connText.textContent = 'غير متصل';
            
            showToast('أنت غير متصل بالإنترنت', 'warning');
        });

        // Unlock audio on first interaction (من الكود القديم)
        document.addEventListener('click', () => this.unlockAudio(), { once: true });
        document.addEventListener('touchstart', () => this.unlockAudio(), { once: true });

        // Keyboard shortcuts
        document.addEventListener('DOMContentLoaded', () => {
            // Fingerprint button visibility
            if (window.PublicKeyCredential && localStorage.getItem('axentro_fp_id')) {
                const fpBtn = document.getElementById('fingerprintLoginBtn');
                if (fpBtn) fpBtn.style.display = 'flex';
            }

            // Enter key handlers
            const loginCode = document.getElementById('loginCode');
            const loginPass = document.getElementById('loginPass');
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

    navigateTo(pageId) {
        // Hide all pages
        const pages = ['loginPage', 'registerPage', 'dashboardPage'];
        pages.forEach(p => {
            const el = document.getElementById(p);
            if (el) el.style.display = 'none';
        });

        // Show target page
        if (pageId === 'loginPage') {
            this.showLoginScreen();
        } else if (pageId === 'dashboardPage') {
            this.showMainApp();
        }
    }

    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const registerScreen = document.getElementById('registerScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (registerScreen) registerScreen.classList.add('hidden');
        if (mainApp) mainApp.style.display = 'none';
    }

    showMainApp() {
        const loginScreen = document.getElementById('loginScreen');
        const registerScreen = document.getElementById('registerScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) loginScreen.classList.add('hidden');
        if (registerScreen) registerScreen.classList.add('hidden');
        if (mainApp) mainApp.style.display = 'block';
    }

    hideLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) loginScreen.classList.add('hidden');
    }

    showRegisterScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const registerScreen = document.getElementById('registerScreen');
        
        if (loginScreen) loginScreen.classList.add('hidden');
        if (registerScreen) registerScreen.classList.remove('hidden');
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
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) {
        alert(msg); // Fallback
        return;
    }
    
    t.textContent = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => t.classList.remove('show'), 4500);
}

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
