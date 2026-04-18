/**
 * ============================================
 * 🔐 AXENTRO AUTHENTICATION v4.2 - COMPLETE
 * ✅ Login, Register & Session Management
 * 🔒 Enhanced with All Legacy Security Features
 * ============================================
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = null;
        this.loginAttempts = {};
        this.lockoutUntil = {};
        
        console.log('🔐 Auth Manager initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    init() {
        this.checkExistingSession();
        this.setupActivityTracking();
        console.log('✅ Auth Manager ready');
    }

    // ============================================
    // 👤 SESSION MANAGEMENT (من الكود القديم)
    // ============================================

    async checkExistingSession() {
        try {
            const sessionData = localStorage.getItem('rememberedUser') || 
                               sessionStorage.getItem('user');
            
            if (sessionData) {
                const session = JSON.parse(sessionData);
                const expiresAt = new Date(session.expiresAt);
                
                if (expiresAt > new Date()) {
                    this.currentUser = session.user;
                    window.user = session.user;
                    
                    // Sync with global state
                    if (typeof db !== 'undefined' && db.currentUser !== undefined) {
                        db.currentUser = session.user;
                    }
                    
                    console.log(`✅ Session restored for: ${this.currentUser.name}`);
                    return true;
                } else {
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

    setupActivityTracking() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => this.updateLastActivity(), { passive: true });
        });

        // Check session timeout every minute
        setInterval(() => this.checkSessionTimeout(), 60000);
    }

    updateLastActivity() {
        localStorage.setItem('axentro_last_activity', Date.now().toString());
    }

    checkSessionTimeout() {
        if (!this.currentUser) return;

        const lastActivity = localStorage.getItem('axentro_last_activity');
        const timeout = AppConfig?.security?.session?.timeout || (24 * 60 * 60 * 1000);

        if (lastActivity && (Date.now() - parseInt(lastActivity)) > timeout) {
            console.log('⏰ Session timed out');
            this.logout();
            
            showToast('انتهت الجلسة - يرجى تسجيل الدخول مجدداً', 'warning');
            
            if (typeof app !== 'undefined' && app.navigateTo) {
                app.navigateTo('loginPage');
            } else {
                this.showLoginPage();
            }
        }
    }

    saveSession(user, rememberMe = false) {
        const duration = rememberMe ? 
            (AppConfig?.security?.session?.rememberMeDuration || (7 * 24 * 60 * 1000)) : 
            (AppConfig?.security?.session?.timeout || (10 * 60 * 60 * 1000));
        
        const sessionData = {
            user: user,
            accessToken: 'local_session',
            expiresAt: new Date(Date.now() + duration).toISOString()
        };

        if (rememberMe) {
            localStorage.setItem('rememberedUser', JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem('user', JSON.stringify(sessionData));
        }

        this.currentUser = user;
        window.user = user;
        
        console.log(`👤 User logged in: ${user.name}`);
    }

    clearSession() {
        localStorage.removeItem('rememberedUser');
        sessionStorage.removeItem('user');
        localStorage.removeItem('axentro_saved_login');
        localStorage.removeItem('axentro_last_activity');
        
        this.currentUser = null;
        window.user = null;
        
        if (typeof db !== 'undefined' && db.currentUser !== undefined) {
            db.currentUser = null;
        }
    }

    // ============================================
    // 🔑 LOGIN OPERATIONS (من الكود القديم)
    // ============================================

    async handleLogin(event) {
        event.preventDefault();

        const codeInput = document.getElementById('loginCode');
        const passwordInput = document.getElementById('loginPassword') || document.getElementById('loginPass');
        const rememberMeCheckbox = document.getElementById('rememberMe');

        const code = codeInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        const rememberMe = rememberMeCheckbox?.checked || false;

        // Validation
        if (!code || !password) {
            return showToast('يرجى إدخال البيانات', 'error');
        }

        // Check lockout
        if (this.isAccountLocked(code)) {
            const remainingTime = Math.ceil((this.lockoutUntil[code] - Date.now()) / 1000 / 60);
            return showToast(`الحساب مغلق مؤقتاً - حاول بعد ${remainingTime} دقيقة`, 'error');
        }

        // Show loading
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        }

        setStatus('جاري التحقق...');

        try {
            const result = await this.signIn(code, password);

            if (result.success) {
                // Reset attempts on success
                this.resetLoginAttempts(code);

                // Handle first-time login
                if (result.requiresPasswordChange) {
                    this.handleFirstTimeLogin(result.user);
                    return;
                }

                // Successful login
                await this.onLoginSuccess(result.user, rememberMe);

                // Play sound (من الكود القديم)
                if (typeof app !== 'undefined' && app.playSound) {
                    app.playSound('login-success');
                }

                showToast(SuccessMessages?.LOGIN_SUCCESS || 'تم تسجيل الدخول بنجاح', 'success');

                // Navigate to dashboard after short delay
                setTimeout(() => {
                    if (typeof showApp === 'function') {
                        showApp();
                    } else if (typeof app !== 'undefined' && app.navigateTo) {
                        app.navigateTo('dashboardPage');
                        app.initializeDashboard();
                    }
                }, 1000);

            } else {
                // Failed login
                this.incrementLoginAttempts(code);
                
                // Play error sound (من الكود القديم)
                if (typeof app !== 'undefined' && app.playSound) {
                    app.playSound('login-error');
                }
                
                showToast(result.error || 'بيانات خاطئة', 'error');
                setStatus('النظام جاهز');

                // Shake animation
                const form = document.getElementById('loginForm');
                if (form) {
                    form.style.animation = 'shake 0.5s ease';
                    setTimeout(() => form.style.animation = '', 500);
                }
            }

        } catch (error) {
            console.error('❌ Login error:', error);
            
            if (typeof app !== 'undefined' && app.playSound) {
                app.playSound('login-error');
            }
            
            showToast('خطأ في الاتصال', 'error');
            setStatus('غير متصل');
        } finally {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> تسجيل الدخول';
            }
        }
    }

    async signIn(code, password) {
        try {
            if (typeof db === 'undefined') {
                throw new Error('Database module not available');
            }

            const { data: emp, error } = await db.from('employees')
                .select('*')
                .eq('code', code)
                .eq('password', password)
                .single();

            if (!error && emp) {
                const user = {
                    name: emp.name,
                    code: emp.code,
                    isAdmin: emp.is_admin,
                    isFirstLogin: emp.is_first_login
                };

                return {
                    success: true,
                    user: user,
                    requiresPasswordChange: !emp.is_admin && emp.is_first_login
                };
            } else {
                return {
                    success: false,
                    error: 'بيانات خاطئة'
                };
            }

        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: 'خطأ في الاتصال'
            };
        }
    }

    async onLoginSuccess(user, rememberMe) {
        this.saveSession(user, rememberMe);
        
        // Save login credentials for fingerprint (من الكود القديم)
        if (rememberMe) {
            const codeInput = document.getElementById('loginCode');
            const passInput = document.getElementById('loginPassword') || document.getElementById('loginPass');
            
            localStorage.setItem('axentro_saved_login', JSON.stringify({
                code: user.code || codeInput?.value,
                password: passInput?.value
            }));
        }

        this.updateLastActivity();

        // Check face descriptor
        if (user.face_descriptor || typeof fetchUserDataInBackground === 'function') {
            window.sessionDescriptor = user.face_descriptor;
            
            if (!window.sessionDescriptor) {
                // Need to register face
                console.log('⚠️ No face descriptor - will prompt for registration');
            }
        }
    }

    handleFirstTimeLogin(user) {
        this.currentUser = user;
        window.user = user;
        
        const modal = document.getElementById('forcePwModal');
        if (modal) modal.classList.add('active');
        
        setStatus('النظام جاهز');
    }

    // ============================================
    // 🚪 LOGOUT (من الكود القديم)
    // ============================================

    logout() {
        // Play logout sound (من الكود القديم)
        if (typeof app !== 'undefined' && app.playSound) {
            app.playSound('logout-success');
        }

        // Stop auto-refresh
        if (typeof app !== 'undefined' && app.stopAutoRefresh) {
            app.stopAutoRefresh();
        }

        // Clear session
        this.clearSession();

        // Reset UI
        window.sessionDescriptor = null;
        window.userImage = '';

        const dashboardPage = document.getElementById('dashboardPage');
        const registerPage = document.getElementById('registerPage');
        const forgotPasswordPage = document.getElementById('forgotPasswordPage');
        const loginPage = document.getElementById('loginPage');

        dashboardPage?.classList.remove('active');
        registerPage?.classList.remove('active');
        forgotPasswordPage?.classList.remove('active');
        loginPage?.classList.add('active');
        
        setStatus('النظام جاهز');
        
        console.log('👋 User logged out');
    }

    // ============================================
    // 🔐 PASSWORD OPERATIONS (من الكود القديم)
    // ============================================

    async submitFirstPwChange() {
        const newPwInput = document.getElementById('firstNewPw');
        const newPw = newPwInput?.value?.trim();
        
        if (!newPw || newPw.length < 4) {
            return showToast('كلمة السر ضعيفة (4 أحرف على الأقل)', 'error');
        }

        setStatus('جاري التغيير...');

        try {
            if (typeof db === 'undefined') throw new Error('Database not available');

            const { error } = await db.from('employees')
                .update({ 
                    password: newPw, 
                    is_first_login: false 
                })
                .eq('code', this.currentUser?.code || window.user?.code);

            if (!error) {
                // Close modal
                const modal = document.getElementById('forcePwModal');
                if (modal) modal.classList.remove('active');

                // Update user object
                if (this.currentUser) this.currentUser.isFirstLogin = false;
                if (window.user) window.user.isFirstLogin = false;

                // Re-save session
                const savedSession = localStorage.getItem('rememberedUser');
                if (savedSession) {
                    const session = JSON.parse(savedSession);
                    session.user.isFirstLogin = false;
                    localStorage.setItem('rememberedUser', JSON.stringify(session));
                }

                showToast('تم تحديث كلمة السر', 'success');

                // Play success sound
                if (typeof app !== 'undefined' && app.playSound) {
                    app.playSound('login-success');
                }

                // Check if needs face registration
                if (typeof fetchUserDataInBackground === 'function') {
                    await fetchUserDataInBackground();
                }

                // Show dashboard or face registration
                if (typeof showApp === 'function') {
                    showApp();
                }

            } else {
                throw error;
            }

        } catch(e) {
            console.error('Password change error:', e);
            
            if (typeof app !== 'undefined' && app.playSound) {
                app.playSound('login-error');
            }
            
            showToast('خطأ في التحديث', 'error');
        }
    }

    // Change Password Modal Logic
    pwChangeMode = '';

    openChangePwModal(mode) {
        this.pwChangeMode = mode;
        const body = document.getElementById('changePwBody');
        const title = document.getElementById('changePwTitle');
        const modal = document.getElementById('changePwModal');
        
        if (mode === 'own') {
            if (title) title.textContent = 'تغيير كلمة السر الخاصة بي';
            if (body) body.innerHTML = `
                <div class="password-wrapper">
                    <input type="password" id="oldPassword" placeholder="كلمة السر الحالية">
                    <button class="toggle-password" onclick="togglePassword('oldPassword')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="password-wrapper">
                    <input type="password" id="newPassword" placeholder="كلمة السر الجديدة">
                    <button class="toggle-password" onclick="togglePassword('newPassword')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <button class="btn btn-change-pw" onclick="submitChangePassword()">تحديث</button>
            `;
        } else {
            if (title) title.textContent = 'تغيير كلمة سر موظف';
            if (body) body.innerHTML = `
                <input type="text" id="targetEmpCode" placeholder="كود الموظف">
                <div class="password-wrapper">
                    <input type="password" id="newPassword" placeholder="كلمة السر الجديدة">
                    <button class="toggle-password" onclick="togglePassword('newPassword')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <button class="btn btn-change-pw" onclick="submitChangePassword()">تغيير</button>
            `;
        }
        
        if (modal) modal.classList.add('active');
    }

    closeChangePwModal() {
        const modal = document.getElementById('changePwModal');
        if (modal) modal.classList.remove('active');
    }

    async submitChangePassword() {
        if (this.pwChangeMode === 'own') {
            const oldPw = document.getElementById('oldPassword')?.value?.trim();
            const newPw = document.getElementById('newPassword')?.value?.trim();
            
            if (!oldPw || !newPw) {
                return showToast('يرجى ملء الحقول', 'error');
            }

            // Check if we should use face verification (من الكود القديم)
            if (window.sessionDescriptor && typeof openCamera === 'function') {
                window._pendingPwChange = {
                    code: window.user?.code,
                    oldPassword: oldPw,
                    newPassword: newPw
                };
                
                this.closeChangePwModal();
                
                // Open camera for face verification
                window.attMode = true;
                window.attType = 'تغيير كلمة المرور';
                
                if (typeof openCamera === 'function') {
                    await openCamera();
                }
                
                return;
            } else {
                // Direct change without face verification
                await this.directPasswordChange(window.user?.code, oldPw, newPw);
            }
        } else {
            // Admin changing employee password
            const targetCode = document.getElementById('targetEmpCode')?.value?.trim();
            const newPw = document.getElementById('newPassword')?.value?.trim();
            
            if (!targetCode || !newPw) {
                return showToast('يرجى إدخال البيانات', 'error');
            }

            await this.adminPasswordChange(targetCode, newPw);
        }
    }

    async directPasswordChange(code, oldPw, newPw) {
        try {
            if (typeof db === 'undefined') throw new Error('Database not available');

            const { error } = await db.from('employees')
                .update({ password: newPw })
                .eq('code', code)
                .eq('password', oldPw);

            if (!error) {
                if (typeof app !== 'undefined' && app.playSound) {
                    app.playSound('login-success');
                }
                
                showToast('تم تغيير كلمة المرور', 'success');
                this.closeChangePwModal();
            } else {
                if (typeof app !== 'undefined' && app.playSound) {
                    app.playSound('login-error');
                }
                
                showToast('كلمة السر الحالية خاطئة', 'error');
            }

        } catch(e) {
            console.error('Password change error:', e);
            showToast('خطأ في التحديث', 'error');
        }
    }

    async adminPasswordChange(code, newPassword) {
        try {
            if (typeof db === 'undefined') throw new Error('Database not available');

            const { error } = await db.from('employees')
                .update({ password: newPassword, is_first_login: false })
                .eq('code', code);

            if (!error) {
                if (typeof app !== 'undefined' && app.playSound) {
                    app.playSound('login-success');
                }
                
                showToast('تم التغيير بنجاح', 'success');
                this.closeChangePwModal();
            } else {
                if (typeof app !== 'undefined' && app.playSound) {
                    app.playSound('login-error');
                }
                
                showToast('فشل التغيير (تأكد من الكود)', 'error');
            }

        } catch(e) {
            console.error('Admin password change error:', e);
            showToast('خطأ في التحديث', 'error');
        }
    }

    // ============================================
    // 🔑 FORGOT PASSWORD (من الكود القديم)
    // ============================================

    showForgotPw() {
        const modal = document.getElementById('forgotPwModal');
        const codeInput = document.getElementById('forgotCode');
        
        if (modal) modal.classList.add('active');
        if (codeInput) codeInput.value = '';
    }

    closeForgotPw() {
        const modal = document.getElementById('forgotPwModal');
        if (modal) modal.classList.remove('active');
    }

    async submitForgotPw() {
        const codeInput = document.getElementById('forgotCode');
        const code = codeInput?.value?.trim();
        
        if (!code) {
            return showToast('يرجى إدخال الكود', 'error');
        }

        const tempPass = Math.random().toString(36).slice(-8);

        try {
            if (typeof db === 'undefined') throw new Error('Database not available');

            // Get employee info
            const { data: emp } = await db.from('employees')
                .select('name, email')
                .eq('code', code)
                .single();

            // Update password
            const { error } = await db.from('employees')
                .update({ password: tempPass, is_first_login: true })
                .eq('code', code);

            if (!error) {
                // Play success sound
                if (typeof app !== 'undefined' && app.playSound) {
                    app.playSound('login-success');
                }
                
                showToast('تم إعادة تعيين كلمة السر.', 'success');
                this.closeForgotPw();

                // Send email (من الكود القديم)
                if (emp && AppConfig?.emailService?.url) {
                    fetch(AppConfig.emailService.url, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'sendForgotPw',
                            name: emp.name,
                            code: code,
                            password: tempPass,
                            email: emp.email
                        })
                    }).catch(e => console.log('Email error:', e));
                }

            } else {
                if (typeof app !== 'undefined' && app.playSound) {
                    app.playSound('login-error');
                }
                
                showToast('الكود غير صحيح', 'error');
            }

        } catch(e) {
            console.error('Forgot password error:', e);
            showToast('حدث خطأ', 'error');
        }
    }

    // ============================================
    // 📝 REGISTRATION (من الكود القديم)
    // ============================================

    showRegisterScreen() {
        document.getElementById('loginPage')?.classList.remove('active');
        document.getElementById('forgotPasswordPage')?.classList.remove('active');
        document.getElementById('dashboardPage')?.classList.remove('active');
        document.getElementById('registerPage')?.classList.add('active');
    }

    showLoginScreen() {
        document.getElementById('registerPage')?.classList.remove('active');
        document.getElementById('forgotPasswordPage')?.classList.remove('active');
        document.getElementById('dashboardPage')?.classList.remove('active');
        document.getElementById('loginPage')?.classList.add('active');
    }

    async startRegistration(event) {
        event.preventDefault();

        const nameInput = document.getElementById('regName');
        const emailInput = document.getElementById('regEmail');
        
        const name = nameInput?.value?.trim();
        const email = emailInput?.value?.trim();

        if (!name || !email) {
            return showToast('يرجى إدخال البيانات', 'error');
        }

        // Store registration data globally (للاستخدام في face-recognition.js)
        window.regData = { name, email };
        window.regMode = true;

        // Open camera for face capture
        if (typeof openCamera === 'function') {
            const success = await openCamera();
            if (!success) {
                window.regMode = false;
                showToast('فشل فتح الكاميرا', 'error');
            }
        }
    }

    // ============================================
    // 👆 FINGERPRINT AUTHENTICATION (WebAuthn) (من الكود القديم)
    // ============================================

    async registerFingerprint() {
        try {
            if (!window.PublicKeyCredential || !window.user) return;

            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: "Axentro System" },
                    user: {
                        id: new Uint8Array(16),
                        name: window.user.code,
                        displayName: window.user.name
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: "public-key" },
                        { alg: -257, type: "public-key" }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000
                }
            });

            if (credential) {
                const rawId = bufferToBase64(credential.rawId);
                localStorage.setItem('axentro_fp_id', rawId);
                showToast('تم تسجيل بصمة الإصبع بنجاح!', 'success');
            }

        } catch(e) {
            console.error('Fingerprint registration error:', e);
        }
    }

    async loginWithFingerprint() {
        const savedFpId = localStorage.getItem('axentro_fp_id');
        const savedLogin = localStorage.getItem('axentro_saved_login');

        if (!savedFpId || !savedLogin) {
            return showToast('سجل دخولك عادياً وفعّل "تذكرني" أولاً', 'error');
        }

        try {
            setStatus('جاري التحقق من البصمة...');

            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    allowCredentials: [{
                        id: base64ToBuffer(savedFpId),
                        type: 'public-key'
                    }],
                    userVerification: "required"
                }
            });

            if (assertion) {
                setStatus('جاري التحقق...');

                const loginData = JSON.parse(savedLogin);
                
                // Verify credentials with database
                const result = await this.signIn(loginData.code, loginData.password);

                if (result.success) {
                    await this.onLoginSuccess(result.user, true);

                    if (typeof app !== 'undefined' && app.playSound) {
                        app.playSound('login-success');
                    }

                    if (typeof showApp === 'function') {
                        showApp();
                    }
                } else {
                    if (typeof app !== 'undefined' && app.playSound) {
                        app.playSound('login-error');
                    }
                    
                    showToast('فشل التحقق (بيانات تغيرت)', 'error');
                    setStatus('النظام جاهز');
                }
            }

        } catch(e) {
            if (e.name === 'NotAllowedError') {
                showToast('تم إلغاء البصمة', 'error');
            } else {
                showToast('فشل التحقق', 'error');
            }
            setStatus('النظام جاهز');
        }
    }

    // ============================================
    // 🔒 SECURITY HELPERS
    // ============================================

    isAccountLocked(code) {
        if (this.lockoutUntil[code] && Date.now() < this.lockoutUntil[code]) {
            return true;
        }
        return false;
    }

    incrementLoginAttempts(code) {
        const maxAttempts = AppConfig?.security?.rateLimit?.maxLoginAttempts || 5;
        const lockoutDuration = AppConfig?.security?.rateLimit?.lockoutDuration || (15 * 60 * 1000);

        this.loginAttempts[code] = (this.loginAttempts[code] || 0) + 1;

        if (this.loginAttempts[code] >= maxAttempts) {
            this.lockoutUntil[code] = Date.now() + lockoutDuration;
            this.loginAttempts[code] = 0;
            
            showToast(`تم حظر الحساب مؤقتاً (${Math.round(lockoutDuration / 60000)} دقيقة)`, 'error');
        }
    }

    resetLoginAttempts(code) {
        this.loginAttempts[code] = 0;
        delete this.lockoutUntil[code];
    }

    isAdmin() {
        return this.currentUser?.isAdmin === true || window.user?.isAdmin === true;
    }

    getUserCode() {
        return this.currentUser?.code || window.user?.code;
    }

    // Utility methods
    showLoginPage() {
        const dashboardPage = document.getElementById('dashboardPage');
        const registerPage = document.getElementById('registerPage');
        const forgotPasswordPage = document.getElementById('forgotPasswordPage');
        const loginPage = document.getElementById('loginPage');

        dashboardPage?.classList.remove('active');
        registerPage?.classList.remove('active');
        forgotPasswordPage?.classList.remove('active');
        loginPage?.classList.add('active');
    }
}

// ============================================
// 🌍 GLOBAL AUTH INSTANCE
// ============================================

let auth;

document.addEventListener('DOMContentLoaded', () => {
    auth = new AuthManager();
    auth.init();

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showForgotPasswordLink = document.getElementById('showForgotPasswordLink');
    const backToLoginFromRegister = document.getElementById('backToLoginFromRegister');
    const backToLoginFromRegFooter = document.getElementById('backToLoginFromRegFooter');
    const backToLoginFromForgot = document.getElementById('backToLoginFromForgot');
    const biometricLoginBtn = document.getElementById('biometricLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    loginForm?.addEventListener('submit', (e) => auth.handleLogin(e));
    registerForm?.addEventListener('submit', (e) => auth.startRegistration(e));
    forgotPasswordForm?.addEventListener('submit', (e) => { e.preventDefault(); auth.submitForgotPw(); });

    showRegisterLink?.addEventListener('click', (e) => { e.preventDefault(); auth.showRegisterScreen(); });
    showForgotPasswordLink?.addEventListener('click', (e) => { e.preventDefault(); window.showForgotPasswordScreen?.(); });
    backToLoginFromRegister?.addEventListener('click', (e) => { e.preventDefault(); auth.showLoginScreen(); });
    backToLoginFromRegFooter?.addEventListener('click', (e) => { e.preventDefault(); auth.showLoginScreen(); });
    backToLoginFromForgot?.addEventListener('click', (e) => { e.preventDefault(); auth.showLoginScreen(); });
    biometricLoginBtn?.addEventListener('click', () => auth.loginWithFingerprint?.());
    logoutBtn?.addEventListener('click', () => auth.logout());
    
    // Make globally available
    window.auth = auth;
    window.handleLogin = (e) => auth.handleLogin(e);
    window.submitForgotPw = () => auth.submitForgotPw();
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
