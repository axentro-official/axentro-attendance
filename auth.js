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
        this.pwChangeMode = '';

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
    // 👤 SESSION MANAGEMENT
    // ============================================

    async checkExistingSession() {
        try {
            const sessionData =
                localStorage.getItem('rememberedUser') ||
                sessionStorage.getItem('user');

            if (!sessionData) return false;

            const session = JSON.parse(sessionData);
            const expiresAt = new Date(session.expiresAt);

            if (expiresAt <= new Date()) {
                this.clearSession();
                return false;
            }

            this.currentUser = session.user;
            window.user = session.user;

            if (typeof db !== 'undefined' && db && 'currentUser' in db) {
                db.currentUser = session.user;
            }

            window.sessionDescriptor = session.user?.face_descriptor || null;
            window.forceFaceEnrollment = !session.user?.face_enrolled;
            if (window.forceFaceEnrollment) {
                window.firstTimeSetupMode = true;
            }

            console.log(`✅ Session restored for: ${this.currentUser.name}`);
            return true;
        } catch (error) {
            console.error('❌ Session check error:', error);
            this.clearSession();
            return false;
        }
    }

    setupActivityTracking() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        events.forEach((eventName) => {
            document.addEventListener(
                eventName,
                () => this.updateLastActivity(),
                { passive: true }
            );
        });

        setInterval(() => this.checkSessionTimeout(), 60000);
    }

    updateLastActivity() {
        localStorage.setItem('axentro_last_activity', Date.now().toString());
    }

    checkSessionTimeout() {
        if (!this.currentUser) return;

        const lastActivity = localStorage.getItem('axentro_last_activity');
        const timeout =
            AppConfig?.security?.session?.timeout ||
            (24 * 60 * 60 * 1000);

        if (lastActivity && (Date.now() - parseInt(lastActivity, 10)) > timeout) {
            console.log('⏰ Session timed out');
            this.logout();

            if (typeof showToast === 'function') {
                showToast('انتهت الجلسة - يرجى تسجيل الدخول مجدداً', 'warning');
            }

            if (typeof app !== 'undefined' && app?.navigateTo) {
                app.navigateTo('loginPage');
            } else {
                this.showLoginPage();
            }
        }
    }

    saveSession(user, rememberMe = false) {
        const duration = rememberMe
            ? (AppConfig?.security?.session?.rememberMeDuration || (7 * 24 * 60 * 60 * 1000))
            : (AppConfig?.security?.session?.timeout || (10 * 60 * 60 * 1000));

        const sessionData = {
            user,
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
        window.sessionDescriptor = user?.face_descriptor || null;
        window.forceFaceEnrollment = !user?.face_enrolled;

        console.log(`👤 User logged in: ${user.name}`);
    }

    updateStoredSession(user) {
        try {
            const remembered = localStorage.getItem('rememberedUser');
            const currentSession = sessionStorage.getItem('user');

            if (remembered) {
                const parsed = JSON.parse(remembered);
                parsed.user = { ...(parsed.user || {}), ...(user || {}) };
                localStorage.setItem('rememberedUser', JSON.stringify(parsed));
            }

            if (currentSession) {
                const parsed = JSON.parse(currentSession);
                parsed.user = { ...(parsed.user || {}), ...(user || {}) };
                sessionStorage.setItem('user', JSON.stringify(parsed));
            }
        } catch (error) {
            console.warn('Session sync warning:', error);
        }
    }

    clearSession() {
        localStorage.removeItem('rememberedUser');
        sessionStorage.removeItem('user');
        localStorage.removeItem('axentro_saved_login');
        localStorage.removeItem('axentro_last_activity');

        this.currentUser = null;
        window.user = null;

        if (typeof db !== 'undefined' && db && 'currentUser' in db) {
            db.currentUser = null;
        }
    }

    // ============================================
    // 🔑 LOGIN OPERATIONS
    // ============================================

    async handleLogin(event) {
        event.preventDefault();

        const codeInput = document.getElementById('loginCode');
        const passwordInput =
            document.getElementById('loginPassword') ||
            document.getElementById('loginPass');
        const rememberMeCheckbox = document.getElementById('rememberMe');

        const code = (codeInput?.value || '').trim().toUpperCase();
        const password = passwordInput?.value || '';
        const rememberMe = rememberMeCheckbox?.checked || false;

        if (!code || !password) {
            return this.toast('يرجى إدخال البيانات', 'error');
        }

        if (this.isAccountLocked(code)) {
            const remainingTime = Math.ceil((this.lockoutUntil[code] - Date.now()) / 1000 / 60);
            return this.toast(`الحساب مغلق مؤقتاً - حاول بعد ${remainingTime} دقيقة`, 'error');
        }

        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        }

        this.setStatus('جاري التحقق...');

        try {
            const result = await this.signIn(code, password);

            if (result.success) {
                if (result.user) {
                    result.user.tempPasswordForFirstLogin = password;
                }
                this.resetLoginAttempts(code);

                if (result.requiresPasswordChange) {
                    this.handleFirstTimeLogin(result.user);
                    return;
                }

                await this.onLoginSuccess(result.user, rememberMe);

                if (result.requiresFaceEnrollment || !result.user.face_enrolled) {
                    window.firstTimeSetupMode = true;
                    this.toast('يجب تسجيل بصمة الوجه قبل استخدام النظام', 'warning');
                }

                if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-success');
                }

                this.toast(
                    typeof SuccessMessages !== 'undefined' && SuccessMessages?.LOGIN_SUCCESS
                        ? SuccessMessages.LOGIN_SUCCESS
                        : 'تم تسجيل الدخول بنجاح',
                    'success'
                );

                setTimeout(async () => {
                    if (typeof showApp === 'function') {
                        showApp();
                    } else if (typeof app !== 'undefined' && app?.navigateTo) {
                        app.navigateTo('dashboardPage');
                        if (typeof app.initializeDashboard === 'function') {
                            app.initializeDashboard();
                        }
                    } else {
                        document.getElementById('loginPage')?.classList.remove('active');
                        document.getElementById('dashboardPage')?.classList.add('active');
                    }

                    if (result.requiresFaceEnrollment || !result.user.face_enrolled) {
                        window.firstTimeSetupMode = true;
                        await openCamera?.();
                    } else if (window.user?.role !== 'admin' && typeof fetchUserDataInBackground === 'function') {
                        fetchUserDataInBackground();
                    } else if (window.user?.role === 'admin' && typeof loadEmployees === 'function') {
                        loadEmployees();
                    }
                }, 500);
            } else {
                this.incrementLoginAttempts(code);

                if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-error');
                }

                this.toast(result.error || 'بيانات خاطئة', 'error');
                this.setStatus('النظام جاهز');

                const form = document.getElementById('loginForm');
                if (form) {
                    form.style.animation = 'shake 0.5s ease';
                    setTimeout(() => {
                        form.style.animation = '';
                    }, 500);
                }
            }
        } catch (error) {
            console.error('❌ Login error:', error);

            if (typeof app !== 'undefined' && app?.playSound) {
                app.playSound('login-error');
            }

            this.toast('خطأ في الاتصال', 'error');
            this.setStatus('غير متصل');
        } finally {
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> تسجيل الدخول';
            }
        }
    }

    async signIn(code, password) {
        try {
            if (typeof db === 'undefined' || !db || typeof db.signIn !== 'function') {
                throw new Error('Database auth service not available');
            }

            const result = await db.signIn(code, password);
            if (result?.success && result.user) {
                const rawUser = result.user;
                const role = rawUser.role || result.role || (rawUser.is_admin ? 'admin' : 'employee');
                const user = {
                    name: rawUser.name || (role === 'admin' ? 'مدير النظام' : ''),
                    code: rawUser.code || null,
                    username: rawUser.username || null,
                    email: rawUser.email || null,
                    role,
                    isAdmin: role === 'admin',
                    isFirstLogin: !!(rawUser.is_first_login ?? rawUser.isFirstLogin),
                    face_enrolled: !!(rawUser.face_enrolled ?? rawUser.faceEnrolled),
                    face_descriptor: rawUser.face_descriptor || null
                };

                return {
                    success: true,
                    user,
                    requiresPasswordChange: !!result.requiresPasswordChange,
                    requiresFaceEnrollment: !!result.requiresFaceEnrollment || !user.face_enrolled
                };
            }

            return { success: false, error: result?.error || 'بيانات خاطئة' };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: 'خطأ في الاتصال' };
        }
    }

    async onLoginSuccess(user, rememberMe) {
        this.saveSession(user, rememberMe);

        if (rememberMe) {
            const codeInput = document.getElementById('loginCode');
            const passInput =
                document.getElementById('loginPassword') ||
                document.getElementById('loginPass');

            localStorage.setItem(
                'axentro_saved_login',
                JSON.stringify({
                    code: user.code || codeInput?.value?.trim()?.toUpperCase(),
                    password: passInput?.value || ''
                })
            );
        }

        this.updateLastActivity();

        if (user.face_descriptor || typeof fetchUserDataInBackground === 'function') {
            window.sessionDescriptor = user.face_descriptor || null;
            window.sessionRole = user.role || (user.isAdmin ? 'admin' : 'employee');

            if (!window.sessionDescriptor) {
                console.log('⚠️ No face descriptor - will prompt for registration');
            }
        }
    }

    handleFirstTimeLogin(user) {
        this.currentUser = user;
        window.user = user;

        const modal = document.getElementById('forcePwModal');
        if (modal) modal.classList.add('active');

        this.setStatus('النظام جاهز');
    }

    // ============================================
    // 🚪 LOGOUT
    // ============================================

    logout() {
        if (typeof app !== 'undefined' && app?.playSound) {
            app.playSound('logout-success');
        }

        if (typeof app !== 'undefined' && typeof app.stopAutoRefresh === 'function') {
            app.stopAutoRefresh();
        }

        this.clearSession();

        window.sessionDescriptor = null;
        window.userImage = '';
        window.forceFaceEnrollment = false;
        window.firstTimeSetupMode = false;

        document.getElementById('dashboardPage')?.classList.remove('active');
        document.getElementById('registerPage')?.classList.remove('active');
        document.getElementById('forgotPasswordPage')?.classList.remove('active');
        document.getElementById('loginPage')?.classList.add('active');

        this.setStatus('النظام جاهز');

        console.log('👋 User logged out');
    }

    // ============================================
    // 🔐 PASSWORD OPERATIONS
    // ============================================

    async submitFirstPwChange() {
        const newPwInput = document.getElementById('firstNewPw');
        const newPw = newPwInput?.value?.trim();
        if (!newPw || newPw.length < 4) {
            return this.toast('كلمة السر ضعيفة (4 أحرف على الأقل)', 'error');
        }
        this.setStatus('جاري التغيير...');
        try {
            if (!window.user) throw new Error('User not available');
            const result = await db.changeOwnPassword(window.user, window.user.tempPasswordForFirstLogin || '', newPw);
            if (!result?.success) {
                throw new Error(result?.error || 'Update failed');
            }
            const modal = document.getElementById('forcePwModal');
            if (modal) modal.classList.remove('active');
            if (this.currentUser) this.currentUser.isFirstLogin = false;
            if (window.user) window.user.isFirstLogin = false;
            this.toast('تم تحديث كلمة السر', 'success');
            if (!window.user.face_enrolled) {
                window.firstTimeSetupMode = true;
                await openCamera?.();
            } else {
                showApp?.();
            }
        } catch (error) {
            console.error('Password change error:', error);
            this.toast(error.message || 'خطأ في التحديث', 'error');
        } finally {
            this.setStatus('النظام جاهز');
        }
    }

    openChangePwModal(mode) {
        this.pwChangeMode = mode;

        const body = document.getElementById('changePwBody');
        const title = document.getElementById('changePwTitle');
        const modal = document.getElementById('changePwModal');

        if (mode === 'own') {
            if (title) title.textContent = 'تغيير كلمة السر الخاصة بي';
            if (body) {
                body.innerHTML = `
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
            }
        } else {
            if (title) title.textContent = 'تغيير كلمة سر موظف';
            if (body) {
                body.innerHTML = `
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
                return this.toast('يرجى ملء الحقول', 'error');
            }

            if (window.sessionDescriptor && typeof openCamera === 'function') {
                window._pendingPwChange = {
                    code: window.user?.code,
                    oldPassword: oldPw,
                    newPassword: newPw
                };

                this.closeChangePwModal();

                window.attMode = true;
                window.attType = 'تغيير كلمة المرور';

                await openCamera();
                return;
            }

            await this.directPasswordChange(window.user?.code, oldPw, newPw);
            return;
        }

        const targetCode = document.getElementById('targetEmpCode')?.value?.trim()?.toUpperCase();
        const newPw = document.getElementById('newPassword')?.value?.trim();

        if (!targetCode || !newPw) {
            return this.toast('يرجى إدخال البيانات', 'error');
        }

        await this.adminPasswordChange(targetCode, newPw);
    }

    async directPasswordChange(code, oldPw, newPw) {
        try {
            if (typeof db === 'undefined' || !db || typeof db.changePassword !== 'function') {
                throw new Error('Database service not available');
            }

            const result = await db.changeOwnPassword(window.user, 
                oldPw,
                newPw
            );

            if (result?.success) {
                if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-success');
                }

                this.toast('تم تغيير كلمة المرور', 'success');
                this.closeChangePwModal();
            } else {
                if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-error');
                }

                this.toast(result?.error || 'كلمة السر الحالية خاطئة', 'error');
            }
        } catch (error) {
            console.error('Password change error:', error);
            this.toast('خطأ في التحديث', 'error');
        }
    }

    async adminPasswordChange(code, newPassword) {
        try {
            if (typeof db === 'undefined' || !db || typeof db.updateEmployee !== 'function') {
                throw new Error('Database service not available');
            }

            const result = await db.adminChangeEmployeePassword((code || '').trim().toUpperCase(), newPassword);

            if (result?.success) {
                if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-success');
                }

                this.toast('تم التغيير بنجاح', 'success');
                this.closeChangePwModal();
            } else {
                if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-error');
                }

                this.toast(result?.error || 'فشل التغيير (تأكد من الكود)', 'error');
            }
        } catch (error) {
            console.error('Admin password change error:', error);
            this.toast('خطأ في التحديث', 'error');
        }
    }

    // ============================================
    // 🔑 FORGOT PASSWORD
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
        const code = codeInput?.value?.trim()?.toUpperCase();

        if (!code) {
            return this.toast('يرجى إدخال الكود', 'error');
        }

        try {
            if (typeof db === 'undefined' || !db || typeof db.requestPasswordReset !== 'function') {
                throw new Error('Database service not available');
            }

            const result = await db.requestPasswordReset(code);

            if (result?.success) {
                if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-success');
                }

                this.toast(
                    result?.message || 'تم إرسال كلمة المرور الجديدة إلى بريدك الإلكتروني',
                    'success'
                );
                this.closeForgotPw();
            } else {
                if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-error');
                }

                this.toast(result?.error || 'الكود غير صحيح', 'error');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.toast('حدث خطأ', 'error');
        }
    }

    // ============================================
    // 📝 REGISTRATION
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
            return this.toast('يرجى إدخال البيانات', 'error');
        }

        window.regData = { name, email };
        window.regMode = true;

        if (typeof openCamera === 'function') {
            const success = await openCamera();
            if (!success) {
                window.regMode = false;
                this.toast('فشل فتح الكاميرا', 'error');
            }
        }
    }

    // ============================================
    // 👆 FINGERPRINT AUTHENTICATION (WebAuthn)
    // ============================================

    async registerFingerprint() {
        try {
            if (!window.PublicKeyCredential || !window.user) return;

            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: 'Axentro System' },
                    user: {
                        id: new Uint8Array(16),
                        name: window.user.code,
                        displayName: window.user.name
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },
                        { alg: -257, type: 'public-key' }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required'
                    },
                    timeout: 60000
                }
            });

            if (credential) {
                const rawId = bufferToBase64(credential.rawId);
                localStorage.setItem('axentro_fp_id', rawId);
                this.toast('تم تسجيل بصمة الإصبع بنجاح!', 'success');
            }
        } catch (error) {
            console.error('Fingerprint registration error:', error);
        }
    }

    async loginWithFingerprint() {
        const savedFpId = localStorage.getItem('axentro_fp_id');
        const savedLogin = localStorage.getItem('axentro_saved_login');

        if (!savedFpId || !savedLogin) {
            return this.toast('سجل دخولك عادياً وفعّل "تذكرني" أولاً', 'error');
        }

        try {
            this.setStatus('جاري التحقق من البصمة...');

            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    allowCredentials: [
                        {
                            id: base64ToBuffer(savedFpId),
                            type: 'public-key'
                        }
                    ],
                    userVerification: 'required'
                }
            });

            if (assertion) {
                this.setStatus('جاري التحقق...');

                const loginData = JSON.parse(savedLogin);
                const result = await this.signIn(loginData.code, loginData.password);

                if (result.success) {
                    await this.onLoginSuccess(result.user, true);

                    if (typeof app !== 'undefined' && app?.playSound) {
                        app.playSound('login-success');
                    }

                    if (typeof showApp === 'function') {
                        showApp();
                    } else {
                        document.getElementById('loginPage')?.classList.remove('active');
                        document.getElementById('dashboardPage')?.classList.add('active');
                    }
                } else {
                    if (typeof app !== 'undefined' && app?.playSound) {
                        app.playSound('login-error');
                    }

                    this.toast('فشل التحقق (بيانات تغيرت)', 'error');
                    this.setStatus('النظام جاهز');
                }
            }
        } catch (error) {
            if (error?.name === 'NotAllowedError') {
                this.toast('تم إلغاء البصمة', 'error');
            } else {
                this.toast('فشل التحقق', 'error');
            }
            this.setStatus('النظام جاهز');
        }
    }

    // ============================================
    // 🔒 SECURITY HELPERS
    // ============================================

    isAccountLocked(code) {
        return !!(this.lockoutUntil[code] && Date.now() < this.lockoutUntil[code]);
    }

    incrementLoginAttempts(code) {
        const maxAttempts = AppConfig?.security?.rateLimit?.maxLoginAttempts || 5;
        const lockoutDuration =
            AppConfig?.security?.rateLimit?.lockoutDuration || (15 * 60 * 1000);

        this.loginAttempts[code] = (this.loginAttempts[code] || 0) + 1;

        if (this.loginAttempts[code] >= maxAttempts) {
            this.lockoutUntil[code] = Date.now() + lockoutDuration;
            this.loginAttempts[code] = 0;

            this.toast(
                `تم حظر الحساب مؤقتاً (${Math.round(lockoutDuration / 60000)} دقيقة)`,
                'error'
            );
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

    showLoginPage() {
        document.getElementById('dashboardPage')?.classList.remove('active');
        document.getElementById('registerPage')?.classList.remove('active');
        document.getElementById('forgotPasswordPage')?.classList.remove('active');
        document.getElementById('loginPage')?.classList.add('active');
    }

    toast(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            alert(message);
        }
    }

    setStatus(message) {
        if (typeof setStatus === 'function') {
            setStatus(message);
        }
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
    forgotPasswordForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        auth.submitForgotPw();
    });

    showRegisterLink?.addEventListener('click', (e) => {
        e.preventDefault();
        auth.showRegisterScreen();
    });

    showForgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.showForgotPasswordScreen === 'function') {
            window.showForgotPasswordScreen();
        } else {
            document.getElementById('loginPage')?.classList.remove('active');
            document.getElementById('registerPage')?.classList.remove('active');
            document.getElementById('dashboardPage')?.classList.remove('active');
            document.getElementById('forgotPasswordPage')?.classList.add('active');
        }
    });

    backToLoginFromRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        auth.showLoginScreen();
    });

    backToLoginFromRegFooter?.addEventListener('click', (e) => {
        e.preventDefault();
        auth.showLoginScreen();
    });

    backToLoginFromForgot?.addEventListener('click', (e) => {
        e.preventDefault();
        auth.showLoginScreen();
    });

    biometricLoginBtn?.addEventListener('click', () => auth.loginWithFingerprint());
    logoutBtn?.addEventListener('click', () => auth.logout());

    window.auth = auth;
    window.handleLogin = (e) => auth.handleLogin(e);
    window.submitForgotPw = () => auth.submitForgotPw();
    window.submitChangePassword = () => auth.submitChangePassword();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
