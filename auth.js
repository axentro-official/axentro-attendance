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
        this.pendingLoginUser = null;
        this.pendingRememberMe = false;

        console.log('🔐 Auth Manager initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    init() {
        // Session restore is handled centrally in app.init() to avoid duplicated UI navigation
        this.setupActivityTracking();
        this.ensurePasswordModals();
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

            if (!session.user?.face_enrolled || session.user?.isFirstLogin || session.user?.is_first_login) {
                console.warn('⚠️ Saved session rejected because onboarding is incomplete');
                this.clearSession();
                return false;
            }

            this.currentUser = session.user;
            window.user = session.user;

            if (typeof db !== 'undefined' && db && 'currentUser' in db) {
                db.currentUser = session.user;
            }

            window.sessionDescriptor = session.user?.face_descriptor || null;
            window.forceFaceEnrollment = false;
            window.firstTimeSetupMode = false;

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
        this.pendingLoginUser = null;
        this.pendingRememberMe = false;
        window.user = null;
        window.sessionDescriptor = null;
        window.forceFaceEnrollment = false;
        window.firstTimeSetupMode = false;

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

            if (!result.success) {
                this.incrementLoginAttempts(code);

                if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

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
                return;
            }

            if (result.user) {
                result.user.tempPasswordForFirstLogin = password;
            }
            this.resetLoginAttempts(code);

            this.currentUser = result.user;
            window.user = result.user;
            window.sessionDescriptor = result.user?.face_descriptor || null;
            window.sessionRole = result.user?.role || (result.user?.isAdmin ? 'admin' : 'employee');
            this.pendingLoginUser = result.user;
            this.pendingRememberMe = rememberMe;

            if (result.requiresPasswordChange) {
                this.handleFirstTimeLogin(result.user);
                return;
            }

            if (result.requiresFaceEnrollment || !result.user.face_enrolled) {
                window.forceFaceEnrollment = true;
                window.firstTimeSetupMode = true;
                this.pendingLoginUser = result.user;
                this.pendingRememberMe = rememberMe;

                if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

        if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-success');
                }

                this.setStatus('تم التحقق من البيانات - مطلوب تسجيل بصمة الوجه');
                if (typeof showAppDialog === 'function') {
                    showAppDialog('تم التحقق من بيانات الدخول بنجاح، لكن يلزم تسجيل بصمة الوجه أولاً قبل الدخول للنظام.', 'إعداد إلزامي');
                }
                this.toast('تم التحقق من بيانات الدخول. سجّل بصمة الوجه لإكمال الدخول.', 'warning');

                const opened = typeof openCamera === 'function' ? await openCamera() : false;
                if (!opened) {
                    this.toast('تعذر فتح الكاميرا لإكمال تسجيل بصمة الوجه', 'error');
                    this.setStatus('تعذر فتح الكاميرا');
                }
                return;
            }

            await this.onLoginSuccess(result.user, rememberMe);

            if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
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

            setTimeout(() => {
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

                if (window.user?.role !== 'admin' && typeof fetchUserDataInBackground === 'function') {
                    fetchUserDataInBackground();
                } else if (window.user?.role === 'admin' && typeof loadEmployees === 'function') {
                    loadEmployees();
                }
            }, 500);
        } catch (error) {
            console.error('❌ Login error:', error);

            if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

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
                    requiresPasswordChange: !!(result.requiresPasswordChange ?? result.requires_password_change),
                    requiresFaceEnrollment: !!(result.requiresFaceEnrollment ?? result.requires_face_enrollment) || !user.face_enrolled
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

    async finalizePendingLogin(user = null) {
        const finalUser = user || this.pendingLoginUser || this.currentUser || window.user;
        if (!finalUser) {
            throw new Error('No pending user to finalize');
        }

        await this.onLoginSuccess(finalUser, !!this.pendingRememberMe);
        this.pendingLoginUser = null;
        this.pendingRememberMe = false;
        window.forceFaceEnrollment = false;
        window.firstTimeSetupMode = false;
    }

    handleFirstTimeLogin(user) {
        this.currentUser = user;
        window.user = user;
        this.ensurePasswordModals();

        const modal = document.getElementById('forcePwModal');
        if (modal) modal.classList.add('active');

        const input = document.getElementById('firstNewPw');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 60);
        }

        this.toast('تم التحقق من بيانات الدخول. يجب تغيير كلمة المرور أولاً.', 'warning');
        this.setStatus('مطلوب تغيير كلمة المرور');
    }

    ensurePasswordModals() {
        if (!document.getElementById('forcePwModal')) {
            const modal = document.createElement('div');
            modal.id = 'forcePwModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:520px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-shield-halved"></i> إجراء أمني مطلوب</h3>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom:14px;color:#cbd5e1;line-height:1.8;">تم التحقق من بيانات الدخول، ولكن يجب تغيير كلمة المرور الحالية أولاً، ثم سيتم استكمال تسجيل بصمة الوجه إذا لزم.</p>
                        <div class="password-wrapper">
                            <input type="password" id="firstNewPw" placeholder="أدخل كلمة المرور الجديدة">
                            <button class="toggle-password" onclick="togglePassword('firstNewPw')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div style="display:flex;gap:12px;justify-content:center;margin-top:18px;">
                            <button class="btn btn-primary" onclick="submitFirstPwChange()">حفظ ومتابعة</button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        if (!document.getElementById('changePwModal')) {
            const modal = document.createElement('div');
            modal.id = 'changePwModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:520px;">
                    <div class="modal-header">
                        <h3 id="changePwTitle">تغيير كلمة المرور</h3>
                        <button class="close-modal" onclick="auth.closeChangePwModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="changePwBody"></div>
                </div>`;
            document.body.appendChild(modal);
        }
    }

    // ============================================
    // 🚪 LOGOUT
    // ============================================

    async logout(force = false) {
        if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

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

        document.body.classList.add('login-active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('👋 User logged out');
        return true;
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
                this.pendingLoginUser = window.user;
                window.forceFaceEnrollment = true;
                window.firstTimeSetupMode = true;
                await openCamera?.();
            } else {
                await this.finalizePendingLogin(window.user);
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

            const result = await db.changeOwnPassword(window.user, oldPw, newPw);

            if (result?.success) {
                if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

        if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-success');
                }

                this.toast('تم تغيير كلمة المرور', 'success');
                this.closeChangePwModal();
            } else {
                if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

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
                if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

        if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-success');
                }

                this.toast('تم التغيير بنجاح', 'success');
                this.closeChangePwModal();
            } else {
                if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

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
        const identifier = codeInput?.value?.trim();

        if (!identifier) {
            return this.toast('يرجى إدخال كود الموظف أو اسم مستخدم الأدمن', 'error');
        }

        try {
            if (typeof db === 'undefined' || !db || typeof db.requestPasswordReset !== 'function') {
                throw new Error('Database service not available');
            }

            const result = await db.requestPasswordReset(identifier);

            if (result?.success) {
                if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

        if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-success');
                }

                this.toast(
                    result?.message || 'تم إرسال كلمة المرور الجديدة إلى بريدك الإلكتروني',
                    'success'
                );
                this.closeForgotPw();
            } else {
                if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

        if (typeof app !== 'undefined' && app?.playSound) {
                    app.playSound('login-error');
                }

                this.toast(result?.error || 'تعذر إرسال كلمة المرور', 'error');
            }
        } catch (error) {
            console.error('Forgot password error:', error);

            if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

        if (typeof app !== 'undefined' && app?.playSound) {
                app.playSound('login-error');
            }

            this.toast('حدث خطأ أثناء استعادة كلمة المرور', 'error');
        }
    }

    // ============================================
    // 📝 REGISTRATION
    // ============================================

    showRegisterScreen() {
        if (typeof app !== 'undefined' && app?.hideAllPages) {
            app.hideAllPages();
        }
        ['loginPage', 'forgotPasswordPage', 'dashboardPage', 'adminPage'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) { el.classList.remove('active'); el.style.display = 'none'; }
        });
        const registerPage = document.getElementById('registerPage');
        if (registerPage) {
            registerPage.style.display = 'block';
            registerPage.classList.add('active');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showLoginScreen() {
        if (typeof app !== 'undefined' && app?.hideAllPages) {
            app.hideAllPages();
        }
        ['registerPage', 'forgotPasswordPage', 'dashboardPage', 'adminPage'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) { el.classList.remove('active'); el.style.display = 'none'; }
        });
        const loginPage = document.getElementById('loginPage');
        if (loginPage) {
            loginPage.style.display = 'block';
            loginPage.classList.add('active');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async startRegistration(event) {
        event.preventDefault();

        const nameInput = document.getElementById('regName');
        const emailInput = document.getElementById('regEmail');
        const registerBtn = document.getElementById('registerBtn');

        const name = nameInput?.value?.trim();
        const email = emailInput?.value?.trim();

        if (!name || !email) {
            return this.toast('يرجى إدخال الاسم والبريد الإلكتروني', 'error');
        }

        if (registerBtn) {
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>جاري إنشاء الحساب...</span>';
        }

        try {
            if (typeof db === 'undefined' || !db || typeof db.createEmployee !== 'function') {
                throw new Error('خدمة إنشاء الحساب غير متاحة');
            }

            const result = await db.createEmployee({ name, email });
            if (!result?.success) {
                throw new Error(result?.error || 'فشل إنشاء الحساب');
            }

            this.toast('تم إنشاء الحساب بنجاح. سيتم إرسال الكود وكلمة المرور المؤقتة إلى البريد الإلكتروني.', 'success');
            document.getElementById('registerForm')?.reset();
            setTimeout(() => this.showLoginScreen(), 900);
        } catch (error) {
            console.error('Registration error:', error);
            this.toast(error.message || 'فشل إنشاء الحساب', 'error');
        } finally {
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>إنشاء الحساب</span><span class="btn-loader hidden"></span>';
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

                    if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

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
                    if (!force) {
            const confirmed = await (window.ui?.showConfirmation ? window.ui.showConfirmation({
                title: 'تأكيد تسجيل الخروج',
                message: 'هل تريد تسجيل الخروج الآن؟',
                type: 'warning',
                confirmText: 'تسجيل الخروج',
                cancelText: 'إلغاء'
            }) : Promise.resolve(confirm('هل تريد تسجيل الخروج الآن؟')));
            if (!confirmed) return false;
        }

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
            const forgot = document.getElementById('forgotPasswordPage');
            if (forgot) {
                forgot.style.display = 'block';
                forgot.classList.add('active');
            }
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
    window.submitFirstPwChange = () => auth.submitFirstPwChange();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}

window.confirmLogout = () => window.auth?.logout?.();
