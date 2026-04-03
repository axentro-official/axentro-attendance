/**
 * ============================================
 * 🔐 AXENTRO AUTHENTICATION v4.1 - SECURE
 * ✅ Login, Register & Session Management
 * 🔒 محسّن مع Security Best Practices
 * ============================================
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = null;
        this.loginAttempts = 0;
        this.lockoutUntil = null;
        
        // Rate limiting storage
        this.failedAttempts = {};
        
        console.log('🔐 Auth Manager initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize authentication manager
     */
    init() {
        // Check for existing session
        this.checkExistingSession();
        
        // Setup activity tracking
        this.setupActivityTracking();
        
        console.log('✅ Auth Manager ready');
    }

    /**
     * Check for existing valid session
     */
    async checkExistingSession() {
        try {
            const sessionData = Utils.loadFromStorage(Constants?.storageKeys?.USER_SESSION);
            
            if (sessionData?.user) {
                const expiresAt = new Date(sessionData.expiresAt);
                
                if (expiresAt > new Date()) {
                    // Session still valid
                    this.currentUser = sessionData.user;
                    
                    if (typeof db !== 'undefined') {
                        db.currentUser = sessionData.user;
                    }
                    
                    console.log(`✅ Session restored for: ${this.currentUser.name}`);
                    return true;
                } else {
                    // Session expired
                    this.clearSession();
                    return false;
                }
            }
            
            return false;

        } catch (error) {
            console.error('❌ Session check error:', error);
            return false;
        }
    }

    /**
     * Setup user activity tracking for session timeout
     */
    setupActivityTracking() {
        // Track various user activities
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => this.updateLastActivity(), { passive: true });
        });

        // Check session periodically (every minute)
        setInterval(() => this.checkSessionTimeout(), 60000);
    }

    /**
     * Update last activity timestamp
     */
    updateLastActivity() {
        Utils.saveToStorage(Constants?.storageKeys?.LAST_ACTIVITY, Date.now());
    }

    /**
     * Check if session has timed out
     */
    checkSessionTimeout() {
        if (!this.currentUser) return;

        const lastActivity = Utils.loadFromStorage(Constants?.storageKeys?.LAST_ACTIVITY);
        const timeout = AppConfig?.security?.session?.timeout || (24 * 60 * 60 * 1000);

        if (lastActivity && (Date.now() - lastActivity) > timeout) {
            console.log('⏰ Session timed out');
            this.logout();
            
            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('انتهت الجلسة - يرجى تسجيل الدخول مجدداً');
            }
            
            if (typeof app !== 'undefined' && app.navigateTo) {
                app.navigateTo('loginPage');
            }
        }
    }

    // ============================================
    // 🔑 LOGIN OPERATIONS
    // ============================================

    /**
     * Handle login form submission
     * @param {Event} e - Form submit event
     */
    async handleLogin(e) {
        e.preventDefault();

        const form = e.target;
        const codeInput = document.getElementById('loginCode');
        const passwordInput = document.getElementById('loginPassword');
        const rememberMeCheckbox = document.getElementById('rememberMe');

        const code = codeInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        const rememberMe = rememberMeCheckbox?.checked || false;

        // Validate form using validator if available
        if (typeof validator !== 'undefined') {
            const validation = validator.validateForm(form, {
                code: ['required', 'employeeCode'],
                password: ['required', 'password']
            });

            if (!validation.isValid) return;
        } else {
            // Basic manual validation
            if (!code) {
                this.showError('loginCodeError', 'يرجى إدخال كود الموظف');
                return;
            }
            if (!password) {
                this.showError('loginPasswordError', 'يرجى إدخال كلمة السر');
                return;
            }
        }

        // Check if account is locked out
        if (this.isAccountLocked(code)) {
            const remainingTime = Math.ceil((this.lockoutUntil - Date.now()) / 1000 / 60);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(`الحساب مغلق مؤقتاً - حاول بعد ${remainingTime} دقيقة`);
            }
            return;
        }

        // Show loading state
        const loginBtn = document.getElementById('loginBtn');
        if (typeof ui !== 'undefined' && ui.showButtonLoading) {
            ui.showButtonLoading(loginBtn, 'جاري تسجيل الدخول...');
        }

        try {
            // Attempt sign in
            const result = await this.signIn(code, password);

            if (result.success) {
                // Reset login attempts on success
                this.resetLoginAttempts(code);

                // Handle first-time login (password change required)
                if (result.requiresPasswordChange) {
                    this.handleFirstTimeLogin(result.user);
                    return;
                }

                // Successful login
                await this.onLoginSuccess(result.user, rememberMe);

                // Play success feedback
                if (typeof ui !== 'undefined' && ui.playSuccessFeedback) {
                    ui.playSuccessFeedback();
                }

                if (typeof ui !== 'undefined' && ui.showSuccess) {
                    ui.showSuccess(SuccessMessages.LOGIN_SUCCESS);
                }

                // Navigate to dashboard after short delay
                setTimeout(() => {
                    if (typeof app !== 'undefined' && app.navigateTo) {
                        app.navigateTo('dashboardPage');
                        app.initializeDashboard();
                    }
                }, 1000);

            } else {
                // Failed login
                this.incrementLoginAttempts(code);
                this.handleLoginFailure(result.error || ErrorCodes.AUTH_INVALID_CREDENTIALS.message);
            }

        } catch (error) {
            console.error('❌ Login error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(ErrorCodes.UNKNOWN_ERROR.message);
            }
        } finally {
            if (typeof ui !== 'undefined' && ui.hideButtonLoading) {
                ui.hideButtonLoading(loginBtn);
            }
        }
    }

    /**
     * Sign in with employee code and password
     * @param {string} code - Employee code
     * @param {string} password - Password
     * @returns {Promise<object>} Result with user data or error
     */
    async signIn(code, password) {
        try {
            // Check if db module exists
            if (typeof db === 'undefined' || typeof db.signIn !== 'function') {
                throw new Error('Database module not available');
            }

            const result = await db.signIn(code, password);
            return result;

        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: ErrorCodes.AUTH_INVALID_CREDENTIALS.message,
                details: error.message
            };
        }
    }

    /**
     * Handle successful login
     * @param {object} user - User data
     * @param {boolean} rememberMe - Remember me option
     */
    async onLoginSuccess(user, rememberMe) {
        this.currentUser = user;

        // Sync with db module
        if (typeof db !== 'undefined') {
            db.currentUser = user;
        }

        // Save session
        const sessionDuration = rememberMe 
            ? (AppConfig?.security?.session?.rememberMeDuration || (7 * 24 * 60 * 60 * 1000))
            : (AppConfig?.security?.session?.timeout || (24 * 60 * 60 * 1000));

        Utils.saveToStorage(
            Constants?.storageKeys?.USER_SESSION || 'axentro_user_session',
            {
                user: user,
                accessToken: 'local_session',
                expiresAt: new Date(Date.now() + sessionDuration).toISOString()
            }
        );

        // Save remember me preference
        Utils.saveToStorage(
            Constants?.storageKeys?.REMEMBER_ME || 'axentro_remember_me',
            rememberMe
        );

        // Update last activity
        this.updateLastActivity();

        console.log(`👤 User logged in: ${user.name}`);
    }

    /**
     * Handle login failure
     * @param {string} errorMessage - Error message
     */
    handleLoginFailure(errorMessage) {
        // Play error feedback
        if (typeof ui !== 'undefined' && ui.playErrorFeedback) {
            ui.playErrorFeedback();
        }

        if (typeof ui !== 'undefined' && ui.showError) {
            ui.showError(errorMessage);
        }

        // Shake the form animation
        const form = document.getElementById('loginForm');
        if (form) {
            form.style.animation = 'shake 0.5s ease';
            setTimeout(() => form.style.animation = '', 500);
        }
    }

    /**
     * Handle first-time login (force password change)
     * @param {object} user - User data
     */
    handleFirstTimeLogin(user) {
        this.currentUser = user;
        
        if (typeof ui !== 'undefined' && ui.openModal) {
            ui.openModal('forcePasswordModal');
        }
    }

    // ============================================
    // 📝 REGISTRATION OPERATIONS
    // ============================================

    /**
     * Handle registration form submission
     * @param {Event} e - Form submit event
     */
    async handleRegister(e) {
        e.preventDefault();

        const nameInput = document.getElementById('regName');
        const emailInput = document.getElementById('regEmail');
        const passwordInput = document.getElementById('regPassword');

        const name = nameInput?.value?.trim() || '';
        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';

        // Get captured face descriptor from session
        let faceDescriptor = null;
        if (typeof Utils !== 'undefined' && Utils.loadFromSession) {
            faceDescriptor = Utils.loadFromSession(Constants?.sessionKeys?.TEMP_FACE_DESCRIPTOR);
        }

        // Validate form
        if (typeof validator !== 'undefined') {
            const validation = validator.validateForm(e.target, {
                name: ['required', 'name'],
                email: ['email'],
                password: ['required', 'password']
            });

            if (!validation.isValid) return;
        } else {
            // Basic validation
            if (!name || name.length < 3) {
                if (typeof ui !== 'undefined' && ui.showError) {
                    ui.showError('يرجى إدخال اسم صحيح (3 أحرف على الأقل)');
                }
                return;
            }
            if (email && !Utils.isValidEmail(email)) {
                if (typeof ui !== 'undefined' && ui.showError) {
                    ui.showError(ErrorCodes.VALIDATION_INVALID_EMAIL.message);
                }
                return;
            }
            if (!password || password.length < 4) {
                if (typeof ui !== 'undefined' && ui.showError) {
                    ui.showError(ErrorCodes.VALIDATION_WEAK_PASSWORD.message);
                }
                return;
            }
        }

        // Check if face was captured (if required)
        if (!faceDescriptor && window.faceRecognitionAvailable !== false) {
            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('يرجى التقاط الوجه أولاً');
            }
            return;
        }

        // Show loading state
        const registerBtn = document.getElementById('registerBtn');
        if (typeof ui !== 'undefined' && ui.showButtonLoading) {
            ui.showButtonLoading(registerBtn, 'جاري إنشاء الحساب...');
        }

        try {
            // Register employee
            const result = await this.registerEmployee({
                name,
                email: email || null,
                password,
                faceDescriptor
            });

            if (result.success) {
                // Play success feedback
                if (typeof ui !== 'undefined' && ui.playSuccessFeedback) {
                    ui.playSuccessFeedback();
                }

                if (typeof ui !== 'undefined' && ui.showSuccess) {
                    ui.showSuccess(SuccessMessages.REGISTER_SUCCESS);
                }

                // Clear temporary face descriptor
                if (typeof Utils !== 'undefined' && Utils.removeFromSession) {
                    Utils.removeFromSession(Constants?.sessionKeys?.TEMP_FACE_DESCRIPTOR);
                }

                // Show generated credentials
                if (typeof ui !== 'undefined' && ui.showConfirmation) {
                    await ui.showConfirmation({
                        title: '✅ تم إنشاء الحساب بنجاح',
                        message: `
                            <div style="text-align: center; padding: 20px;">
                                <div style="margin-bottom: 15px;">
                                    <strong>الكود:</strong> 
                                    <span style="color: #3b82f6; font-size: 1.2em;">${result.employee.code}</span>
                                </div>
                                <div style="margin-bottom: 15px;">
                                    <strong>كلمة السر:</strong> 
                                    <span style="color: #10b981; font-size: 1.2em;">${result.generatedPassword}</span>
                                </div>
                                <p style="color: #ef4444; font-size: 0.9em;">
                                    ⚠️ تم إرسال هذه البيانات إلى بريدك الإلكتروني
                                </p>
                            </div>
                        `,
                        confirmText: 'حسناً، سجل دخولي الآن',
                        type: 'success'
                    }).then(() => {
                        // Navigate to login
                        if (typeof app !== 'undefined' && app.navigateTo) {
                            app.navigateTo('loginPage');
                            
                            // Pre-fill the code field
                            const loginCodeInput = document.getElementById('loginCode');
                            if (loginCodeInput) {
                                loginCodeInput.value = result.employee.code;
                            }
                        }
                    });
                }

            } else {
                if (typeof ui !== 'undefined' && ui.showError) {
                    ui.showError(result.error || 'فشل في إنشاء الحساب');
                }
            }

        } catch (error) {
            console.error('❌ Registration error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(ErrorCodes.UNKNOWN_ERROR.message);
            }
        } finally {
            if (typeof ui !== 'undefined' && ui.hideButtonLoading) {
                ui.hideButtonLoading(registerBtn);
            }
        }
    }

    /**
     * Register new employee
     * @param {object} employeeData - Employee data
     * @returns {Promise<object>} Result
     */
    async registerEmployee(employeeData) {
        try {
            if (typeof db === 'undefined' || typeof db.registerEmployee !== 'function') {
                throw new Error('Database module not available');
            }

            const result = await db.registerEmployee(employeeData);
            return result;

        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: 'فشل في إنشاء الحساب',
                details: error.message
            };
        }
    }

    // ============================================
    // 🚪 LOGOUT OPERATIONS
    // ============================================

    /**
     * Logout current user
     */
    async logout() {
        try {
            // Clear local storage
            Utils.removeFromStorage(Constants?.storageKeys?.USER_SESSION);
            Utils.removeFromStorage(Constants?.storageKeys?.REMEMBER_ME);
            Utils.removeFromSession(Constants?.sessionKeys?.CURRENT_USER);

            // Clear current user reference
            this.currentUser = null;

            if (typeof db !== 'undefined') {
                db.currentUser = null;
            }

            // Play logout sound
            if (typeof ui !== 'undefined' && ui.playSound) {
                ui.playSound('logoutSound', 0.6);
            }

            console.log('👋 User logged out');

            // Navigate to login page
            if (typeof app !== 'undefined' && app.navigateTo) {
                app.navigateTo('loginPage');
            }

            return true;

        } catch (error) {
            console.error('❌ Logout error:', error);
            return false;
        }
    }

    /**
     * Clear session completely
     */
    clearSession() {
        this.currentUser = null;
        
        Utils.removeFromStorage(Constants?.storageKeys?.USER_SESSION);
        Utils.removeFromStorage(Constants?.storageKeys?.REMEMBER_ME);
        Utils.removeFromStorage(Constants?.storageKeys?.LAST_ACTIVITY);
        Utils.removeFromSession(Constants?.sessionKeys?.CURRENT_USER);

        if (typeof db !== 'undefined') {
            db.currentUser = null;
        }
    }

    // ============================================
    // 🔐 PASSWORD OPERATIONS
    // ============================================

    /**
     * Change password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @param {string} confirmPassword - Confirm new password
     * @returns {Promise<object>} Result
     */
    async changePassword(currentPassword, newPassword, confirmPassword) {
        try {
            // Validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                return { success: false, error: ErrorCodes.VALIDATION_REQUIRED_FIELD.message };
            }

            if (newPassword !== confirmPassword) {
                return { success: false, error: ErrorCodes.VALIDATION_PASSWORD_MISMATCH.message };
            }

            if (newPassword.length < (AppConfig?.security?.password?.minLength || 4)) {
                return { success: false, error: ErrorCodes.VALIDATION_WEAK_PASSWORD.message };
            }

            // Get current user code
            const userCode = this.getUserCode();
            if (!userCode) {
                return { success: false, error: ErrorCodes.AUTH_SESSION_EXPIRED.message };
            }

            // Call database to change password
            if (typeof db === 'undefined' || typeof db.changePassword !== 'function') {
                throw new Error('Database module not available');
            }

            const result = await db.changePassword(userCode, currentPassword, newPassword);

            if (result.success) {
                if (typeof ui !== 'undefined' && ui.showSuccess) {
                    ui.showSuccess(SuccessMessages.PASSWORD_CHANGED);
                }
            }

            return result;

        } catch (error) {
            console.error('❌ Password change error:', error);
            return { success: false, error: 'فشل تغيير كلمة المرور' };
        }
    }

    /**
     * Request password reset
     * @param {string} code - Employee code
     * @returns {Promise<object>} Result
     */
    async requestPasswordReset(code) {
        try {
            if (!code) {
                return { success: false, error: ErrorCodes.VALIDATION_REQUIRED_FIELD.message };
            }

            if (typeof db === 'undefined' || typeof db.requestPasswordReset !== 'function') {
                throw new Error('Database module not available');
            }

            const result = await db.requestPasswordReset(code.trim().toUpperCase());

            if (result.success) {
                if (typeof ui !== 'undefined' && ui.showSuccess) {
                    ui.showSuccess(SuccessMessages.PASSWORD_RESET_SENT);
                }
            }

            return result;

        } catch (error) {
            console.error('❌ Password reset request error:', error);
            return { success: false, error: 'فشل طلب استعادة كلمة المرور' };
        }
    }

    // ============================================
    // 🔒 SECURITY & RATE LIMITING
    // ============================================

    /**
     * Check if account is locked due to too many attempts
     * @param {string} code - Employee code
     * @returns {boolean}
     */
    isAccountLocked(code) {
        if (!this.lockoutUntil) return false;
        
        if (Date.now() < this.lockoutUntil) {
            return true;
        } else {
            // Lockout period expired
            this.lockoutUntil = null;
            return false;
        }
    }

    /**
     * Increment failed login attempts
     * @param {string} code - Employee code
     */
    incrementLoginAttempts(code) {
        this.loginAttempts++;
        
        const maxAttempts = AppConfig?.security?.rateLimit?.maxLoginAttempts || 5;
        const lockoutDuration = AppConfig?.security?.rateLimit?.lockoutDuration || (15 * 60 * 1000);

        if (this.loginAttempts >= maxAttempts) {
            this.lockoutUntil = Date.now() + lockoutDuration;
            console.warn(`🔒 Account locked for ${lockoutDuration / 60000} minutes`);
        }
    }

    /**
     * Reset login attempts on successful login
     * @param {string} code - Employee code
     */
    resetLoginAttempts(code) {
        this.loginAttempts = 0;
        this.lockoutUntil = null;
    }

    // ============================================
    // 👤 USER INFO HELPERS
    // ============================================

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Get current user object
     * @returns {object|null}
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current user's employee code
     * @returns {string|null}
     */
    getUserCode() {
        return this.currentUser?.code || null;
    }

    /**
     * Get current user's name
     * @returns {string|null}
     */
    getUserName() {
        return this.currentUser?.name || null;
    }

    /**
     * Check if current user is admin
     * @returns {boolean}
     */
    isAdmin() {
        return this.currentUser?.is_admin === true;
    }

    /**
     * Check if it's first login (needs password change)
     * @returns {boolean}
     */
    isFirstLogin() {
        return this.currentUser?.is_first_login === true;
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================

    /**
     * Show error message in specified element
     * @param {string} elementId - Error element ID
     * @param {string} message - Error message
     */
    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }

    /**
     * Clear all error messages
     */
    clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
    }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================

/**
 * Global authentication instance
 */
let auth;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    auth = new AuthManager();
    auth.init();
    
    console.log('🔐 Authentication module loaded');
});

console.log('✅ auth.js v4.1 loaded successfully');
