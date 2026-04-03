/**
 * ============================================
 * 🔐 AXENTRO AUTHENTICATION v4.0
 * ✅ Login, Register & Session Management
 * ============================================
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = null;
        this.loginAttempts = 0;
        this.lockoutUntil = null;
        
        this.init();
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
        
        console.log('✅ Auth Manager initialized');
    }

    /**
     * Check for existing valid session
     */
    async checkExistingSession() {
        const sessionData = Utils.loadFromStorage(Constants.storageKeys.USER_SESSION);
        
        if (sessionData?.user) {
            const expiresAt = new Date(sessionData.expiresAt);
            
            if (expiresAt > new Date()) {
                // Session still valid
                this.currentUser = sessionData.user;
                db.currentUser = sessionData.user;
                
                console.log(`✅ Session restored for: ${this.currentUser.name}`);
                return true;
            } else {
                // Session expired
                this.clearSession();
                return false;
            }
        }
        
        return false;
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
        Utils.saveToStorage(Constants.storageKeys.LAST_ACTIVITY, Date.now());
    }

    /**
     * Check if session has timed out
     */
    checkSessionTimeout() {
        if (!this.currentUser) return;

        const lastActivity = Utils.loadFromStorage(Constants.storageKeys.LAST_ACTIVITY);
        const timeout = AppConfig.security.session.timeout;
        
        if (lastActivity && (Date.now() - lastActivity) > timeout) {
            console.log('⏰ Session timed out');
            this.logout();
            ui.showWarning('انتهت الجلسة - يرجى تسجيل الدخول مجدداً');
            
            // Redirect to login
            ui.navigateTo('loginPage');
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
        const code = document.getElementById('loginCode').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // Validate form
        const validation = validator.validateForm(form, {
            code: ['required', 'employeeCode'],
            password: ['required', 'password']
        });

        if (!validation.isValid) return;

        // Check if account is locked out
        if (this.isAccountLocked()) {
            const remainingTime = Math.ceil((this.lockoutUntil - Date.now()) / 1000 / 60);
            ui.showError(`الحساب مغلق مؤقتاً - حاول بعد ${remainingTime} دقيقة`);
            return;
        }

        // Show loading state
        ui.showButtonLoading(document.getElementById('loginBtn'), 'جاري تسجيل الدخول...');

        try {
            // Attempt sign in
            const result = await db.signIn(code, password);

            if (result.success) {
                // Reset login attempts on success
                this.resetLoginAttempts();

                // Handle first-time login (password change required)
                if (result.requiresPasswordChange) {
                    this.handleFirstTimeLogin(result.user);
                    return;
                }

                // Successful login
                await this.onLoginSuccess(result.user, rememberMe);
                
                ui.playSuccessFeedback();
                ui.showSuccess(SuccessMessages.LOGIN_SUCCESS);
                
                // Navigate to dashboard
                setTimeout(() => {
                    ui.navigateTo('dashboardPage');
                    app.initializeDashboard();
                }, 1000);

            } else {
                // Failed login
                this.handleLoginFailure(result.error);
            }

        } catch (error) {
            console.error('Login error:', error);
            ui.showError(ErrorCodes.UNKNOWN_ERROR.message);
        } finally {
            ui.hideButtonLoading(document.getElementById('loginBtn'));
        }
    }

    /**
     * Handle successful login
     * @param {object} user - User data
     * @param {boolean} rememberMe - Remember me option
     */
    async onLoginSuccess(user, rememberMe) {
        this.currentUser = user;
        db.currentUser = user;

        // Save session
        const sessionDuration = rememberMe 
            ? AppConfig.security.session.rememberMeDuration 
            : AppConfig.security.session.timeout;

        Utils.saveToStorage(Constants.storageKeys.USER_SESSION, {
            user: user,
            accessToken: 'local_session',
            expiresAt: new Date(Date.now() + sessionDuration).toISOString()
        });

        // Save remember me preference
        Utils.saveToStorage(Constants.storageKeys.REMEMBER_ME, rememberMe);

        // Update last activity
        this.updateLastActivity();
    }

    /**
     * Handle login failure
     * @param {string} errorMessage - Error message
     */
    handleLoginFailure(errorMessage) {
        this.incrementLoginAttempts();
        
        ui.playErrorFeedback();
        ui.showError(errorMessage);

        // Shake the form
        const form = document.getElementById('loginForm');
        form.style.animation = 'shake 0.5s ease';
        setTimeout(() => form.style.animation = '', 500);
    }

    /**
     * Handle first-time login (force password change)
     * @param {object} user - User data
     */
    handleFirstTimeLogin(user) {
        this.currentUser = user;
        ui.openModal('forcePasswordModal');
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

        const form = e.target;
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        // Get captured face descriptor from session
        const faceDescriptor = Utils.loadFromSession(Constants.sessionKeys.TEMP_FACE_DESCRIPTOR);

        // Validate form
        const validation = validator.validateForm(form, {
            name: ['required', 'name'],
            email: ['email'], // Optional
            password: ['required', 'password']
        });

        if (!validation.isValid) return;

        // Check if face was captured
        if (!faceDescriptor) {
            ui.showWarning('يرجى التقاط الوجه أولاً');
            return;
        }

        // Show loading state
        ui.showButtonLoading(document.getElementById('registerBtn'), 'جاري إنشاء الحساب...');

        try {
            // Register employee
            const result = await db.registerEmployee({
                name,
                email: email || null,
                password,
                faceDescriptor
            });

            if (result.success) {
                ui.playSuccessFeedback();
                ui.showSuccess(SuccessMessages.REGISTER_SUCCESS);
                
                // Clear temporary face descriptor
                Utils.removeFromSession(Constants.sessionKeys.TEMP_FACE_DESCRIPTOR);

                // Show generated credentials
                await ui.showConfirmation({
                    title: '✅ تم إنشاء الحساب بنجاح',
                    message: `
                        <div style="text-align: left; direction: ltr;">
                            <p><strong>الكود:</strong> <span style="color: var(--primary-400); font-size: 18px;">${result.employee.code}</span></p>
                            <p><strong>كلمة السر:</strong> <span style="color: var(--success-500); font-size: 18px;">${result.generatedPassword}</span></p>
                            <p style="margin-top: 10px; color: var(--text-muted); font-size: 12px;">
                                ⚠️ تم إرسال هذه البيانات إلى بريدك الإلكتروني
                            </p>
                        </div>
                    `,
                    confirmText: 'حسناً، سجل دخولي الآن',
                    type: 'success'
                }).then(() => {
                    // Navigate to login
                    ui.navigateTo('loginPage');
                    
                    // Pre-fill the code field
                    document.getElementById('loginCode').value = result.employee.code;
                });

            } else {
                ui.showError(result.error || 'فشل في إنشاء الحساب');
            }

        } catch (error) {
            console.error('Registration error:', error);
            ui.showError(ErrorCodes.UNKNOWN_ERROR.message);
        } finally {
            ui.hideButtonLoading(document.getElementById('registerBtn'));
        }
    }

    // ============================================
    // 🔐 PASSWORD MANAGEMENT
    // ============================================

    /**
     * Handle force password change (first time login)
     * @param {Event} e - Form submit event
     */
    async handleForcePasswordChange(e) {
        e.preventDefault();

        const newPassword = document.getElementById('forceNewPassword').value;
        const confirmPassword = document.getElementById('confirmForcePassword')?.value || newPassword;

        // Validate password
        const validation = validator.validateField(newPassword, ['required', 'password']);
        if (!validation.valid) {
            ui.showError(validation.message);
            return;
        }

        if (newPassword !== confirmPassword) {
            ui.showError(ErrorCodes.VALIDATION_PASSWORD_MISMATCH.message);
            return;
        }

        ui.showButtonLoading(e.target.querySelector('.btn'));

        try {
            const result = await db.changePassword(
                this.currentUser.code,
                this.currentUser.password, // Current temporary password
                newPassword
            );

            if (result.success) {
                ui.playSuccessFeedback();
                ui.showSuccess(SuccessMessages.PASSWORD_CHANGED);
                
                ui.closeModal('forcePasswordModal');
                
                // Complete login with new password
                const loginResult = await db.signIn(this.currentUser.code, newPassword);
                if (loginResult.success) {
                    await this.onLoginSuccess(loginResult.user, true);
                    ui.navigateTo('dashboardPage');
                    app.initializeDashboard();
                }
            } else {
                ui.showError(result.error);
            }

        } catch (error) {
            console.error('Password change error:', error);
            ui.showError('فشل تغيير كلمة المرور');
        } finally {
            ui.hideButtonLoading(e.target.querySelector('.btn'));
        }
    }

    /**
     * Handle normal password change
     * @param {Event} e - Form submit event
     */
    async handleChangePassword(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate all fields
        const validation = validator.validateForm(e.target, {
            currentPassword: ['required'],
            newPassword: ['required', 'password'],
            confirmPassword: [`match:newPassword`]
        });

        if (!validation.isValid) return;

        ui.showButtonLoading(document.getElementById('changePasswordBtn'));

        try {
            const result = await db.changePassword(
                this.currentUser.code,
                currentPassword,
                newPassword
            );

            if (result.success) {
                ui.playSuccessFeedback();
                ui.showSuccess(SuccessMessages.PASSWORD_CHANGED);
                
                // Clear form
                e.target.reset();
                
                // Update current user's password locally
                this.currentUser.password = newPassword;

            } else {
                ui.showError(result.error);
                ui.playErrorFeedback();
            }

        } catch (error) {
            console.error('Change password error:', error);
            ui.showError('فشل تغيير كلمة المرور');
        } finally {
            ui.hideButtonLoading(document.getElementById('changePasswordBtn'));
        }
    }

    /**
     * Handle forgot password request
     * @param {Event} e - Form submit event
     */
    async handleForgotPassword(e) {
        e.preventDefault();

        const code = document.getElementById('forgotCode').value.trim().toUpperCase();

        // Validate
        const validation = validator.validateField(code, ['required', 'employeeCode']);
        if (!validation.valid) {
            ui.showError(validation.message);
            return;
        }

        ui.showButtonLoading(document.getElementById('forgotPasswordBtn'));

        try {
            const result = await db.requestPasswordReset(code);

            if (result.success) {
                ui.playSuccessFeedback();
                ui.showSuccess(SuccessMessages.PASSWORD_RESET_SENT);
                
                // Go back to login after delay
                setTimeout(() => {
                    ui.navigateTo('loginPage');
                }, 2000);
            } else {
                ui.showError(result.error);
            }

        } catch (error) {
            console.error('Forgot password error:', error);
            ui.showError('فشل في طلب استعادة كلمة المرور');
        } finally {
            ui.hideButtonLoading(document.getElementById('forgotPasswordBtn'));
        }
    }

    // ============================================
    // 🚪 LOGOUT
    // ============================================

    /**
     * Handle logout
     */
    async logout() {
        const confirmed = await ui.showConfirmation({
            title: 'تسجيل الخروج',
            message: 'هل أنت متأكد من تسجيل الخروج؟',
            confirmText: 'نعم، خروج',
            cancelText: 'إلغاء',
            type: 'danger'
        });

        if (confirmed) {
            await this.performLogout();
        }
    }

    /**
     * Perform logout operations
     */
    async performLogout() {
        try {
            // Sign out from database client
            await db.signOut();
            
            // Clear local session
            this.clearSession();
            
            // UI feedback
            ui.playSound('logoutSound', 0.6);
            ui.showInfo(SuccessMessages.LOGOUT_SUCCESS);
            
            // Navigate to login
            ui.navigateTo('loginPage');
            
            // Reset forms
            document.getElementById('loginForm')?.reset();
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            document.getElementById('loginPage')?.classList.add('active');

        } catch (error) {
            console.error('Logout error:', error);
            // Force clear anyway
            this.clearSession();
            ui.navigateTo('loginPage');
        }
    }

    /**
     * Clear all session data
     */
    clearSession() {
        this.currentUser = null;
        db.currentUser = null;
        
        Utils.removeFromStorage(Constants.storageKeys.USER_SESSION);
        Utils.removeFromStorage(Constants.storageKeys.REMEMBER_ME);
        Utils.removeFromStorage(Constants.storageKeys.LAST_ACTIVITY);
        Utils.removeFromSession(Constants.sessionKeys.TEMP_FACE_DESCRIPTOR);
        Utils.removeFromSession(Constants.sessionKeys.LOGIN_ATTEMPTS);
        Utils.removeFromSession(Constants.sessionKeys.LOCKOUT_UNTIL);
    }

    // ============================================
    // 🔒 SECURITY METHODS
    // ============================================

    /**
     * Increment failed login attempts
     */
    incrementLoginAttempts() {
        this.loginAttempts++;
        
        // Store attempts in session storage
        Utils.saveToSession(Constants.sessionKeys.LOGIN_ATTEMPTS, this.loginAttempts);

        // Check if should lock account
        if (this.loginAttempts >= AppConfig.security.rateLimit.maxLoginAttempts) {
            this.lockAccount();
        }
    }

    /**
     * Reset login attempts on successful login
     */
    resetLoginAttempts() {
        this.loginAttempts = 0;
        this.lockoutUntil = null;
        Utils.removeFromSession(Constants.sessionKeys.LOGIN_ATTEMPTS);
        Utils.removeFromSession(Constants.sessionKeys.LOCKOUT_UNTIL);
    }

    /**
     * Lock account after too many failed attempts
     */
    lockAccount() {
        this.lockoutUntil = Date.now() + AppConfig.security.rateLimit.lockoutDuration;
        Utils.saveToSession(Constants.sessionKeys.LOCKOUT_UNTIL, this.lockoutUntil);
        
        console.warn(`🔒 Account locked until ${new Date(this.lockoutUntil)}`);
    }

    /**
     * Check if account is currently locked
     * @returns {boolean} Locked status
     */
    isAccountLocked() {
        if (!this.lockoutUntil) {
            // Check session storage
            const storedLockout = Utils.loadFromSession(Constants.sessionKeys.LOCKOUT_UNTIL);
            if (storedLockout) {
                this.lockoutUntil = storedLockout;
            }
        }

        if (this.lockoutUntil && Date.now() < this.lockoutUntil) {
            return true;
        }

        // Lockout period expired
        if (this.lockoutUntil && Date.now() >= this.lockoutUntil) {
            this.resetLoginAttempts();
        }

        return false;
    }

    // ============================================
    // 👤 BIOMETRIC AUTH (Fingerprint)
    // ============================================

    /**
     * Attempt biometric authentication
     */
    async attemptBiometricAuth() {
        // Check if Web Authentication API is available
        if (!window.PublicKeyCredential) {
            ui.showWarning('متصفحك لا يدعم المصادقة البيومترية');
            return;
        }

        try {
            // Check for platform authenticator availability
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            
            if (!available) {
                ui.showWarning('لم يتم العثور على قارئ بصمة');
                return;
            }

            ui.showInfo('ضع إصبعك على قارئ البصمة...');

            // In a real implementation, you would create and use WebAuthn credentials
            // For now, we'll simulate with a prompt
            await new Promise(resolve => setTimeout(resolve, 2000));

            // For demo purposes, fall back to regular login with pre-filled code
            ui.showInfo('سيتم استخدام تسجيل الدخول العادي');
            
        } catch (error) {
            console.error('Biometric auth error:', error);
            ui.showError('فشل المصادقة البيومترية');
        }
    }

    // ============================================
    // 📊 GETTERS & HELPERS
    // ============================================

    /**
     * Get current authenticated user
     * @returns {object|null} Current user or null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Check if current user is admin
     * @returns {boolean} Admin status
     */
    isAdmin() {
        return this.currentUser?.is_admin === true;
    }

    /**
     * Get user display name
     * @returns {string} User name or default
     */
    getUserName() {
        return this.currentUser?.name || 'موظف';
    }

    /**
     * Get user code
     * @returns {string} User code
     */
    getUserCode() {
        return this.currentUser?.code || '';
    }
}

// Create global instance
const auth = new AuthManager();

// Export for use in other modules
window.AuthManager = AuthManager;
window.auth = auth;
