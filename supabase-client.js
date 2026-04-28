/**
 * ============================================
 * 🗄️ AXENTRO SUPABASE CLIENT v5.0 - SECURE MODE
 * ============================================
 */

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.currentUser = null;
        this.retryCount = 0;
        this.maxRetries = AppConfig?.retry?.maxAttempts || 3;
        this.init();
        console.log('🗄️ Supabase Client initialized');
    }

    init() {
        try {
            if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
                console.error('❌ Supabase library not loaded');
                this.isConnected = false;
                return;
            }
            const config = AppConfig?.supabase;
            if (!config?.url || !config?.anonKey) {
                console.error('❌ Supabase configuration missing');
                this.isConnected = false;
                return;
            }
            this.client = window.supabase.createClient(config.url, config.anonKey, {
                auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
                db: { schema: 'public' },
                global: {
                    headers: {
                        'x-app-name': 'axentro-attendance',
                        'x-app-version': AppConfig?.app?.version || '5.0.0'
                    }
                }
            });
            this.setupAuthListeners();
            this.isConnected = true;
            console.log('✅ Supabase client created successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Supabase client:', error);
            this.isConnected = false;
        }
    }

    setupAuthListeners() {
        if (!this.client?.auth) return;
        this.client.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 Auth event: ${event}`);
            if (event === 'SIGNED_OUT') {
                this.currentUser = null;
            }
        });
    }

    isConnectedToSupabase() {
        return this.isConnected && !!this.client;
    }

    get storage() {
        return this.client?.storage;
    }

    from(table) {
        if (!this.client) throw new Error('Database client not initialized');
        return this.client.from(table);
    }

    async rpc(fnName, params = {}) {
        if (!this.client) throw new Error('Database client not initialized');
        return this.client.rpc(fnName, params);
    }

    async executeWithRetry(operation, maxRetries = null) {
        const retries = maxRetries ?? this.maxRetries;
        let lastError;
        for (let i = 0; i <= retries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (i < retries) {
                    await new Promise(r => setTimeout(r, Math.min(1000 * (2 ** i), 10000)));
                }
            }
        }
        throw lastError;
    }

    normalizeIdentifier(value) {
        return String(value || '').trim();
    }

    getSessionToken(user = null) {
        const source = user || this.currentUser || window.user;
        return source?.session_token || source?.sessionToken || null;
    }

    getSessionHeaders(user = null) {
        const token = this.getSessionToken(user);
        return token ? { p_session_token: token } : {};
    }

    normalizePayload(data) {
        return Array.isArray(data) ? (data[0] || null) : data;
    }

    async signIn(identifier, password) {
        try {
            if (!this.isConnectedToSupabase()) throw new Error('Database connection not available');
            const normalized = this.normalizeIdentifier(identifier);
            const isAdminLogin = normalized.toLowerCase() === 'admin';
            const fnName = isAdminLogin ? AppConfig.supabase.rpc.adminLogin : AppConfig.supabase.rpc.employeeLogin;
            const params = isAdminLogin
                ? { p_username: normalized.toLowerCase(), p_password: password }
                : { p_code: normalized.toUpperCase(), p_password: password };

            const { data, error } = await this.rpc(fnName, params);
            if (error) throw error;

            const payload = this.normalizePayload(data);
            if (!payload?.success) {
                return {
                    success: false,
                    error: payload?.error || ErrorCodes.AUTH_INVALID_CREDENTIALS.message
                };
            }

            const rawUser = payload.user || {};
            const user = {
                ...rawUser,
                role: payload.role || rawUser.role || (rawUser.is_admin ? 'admin' : 'employee'),
                session_token: payload.session_token || null,
                session_expires_at: payload.session_expires_at || null
            };

            await this.setUserContext(user);

            return {
                success: true,
                user,
                requiresPasswordChange: !!payload.requires_password_change,
                requiresFaceEnrollment: !!payload.requires_face_enrollment,
                role: user.role
            };
        } catch (error) {
            console.error('❌ Sign in error:', error);
            return {
                success: false,
                error: error.message || ErrorCodes.AUTH_INVALID_CREDENTIALS.message
            };
        }
    }

    async setUserContext(user) {
        try {
            this.currentUser = user;
            sessionStorage.setItem('current_user', JSON.stringify(user));
            console.log(`👤 User context set: ${user.username || user.code}`);
        } catch (error) {
            console.error('⚠️ Failed to set user context:', error);
        }
    }

    async signOut() {
        try {
            const sessionToken = this.getSessionToken();
            if (sessionToken) {
                try { await this.rpc(AppConfig.supabase.rpc.logout, { p_session_token: sessionToken }); } catch (_) {}
            }
            sessionStorage.removeItem('current_user');
            if (this.client?.auth) await this.client.auth.signOut();
            this.currentUser = null;
            return true;
        } catch (error) {
            console.error('❌ Sign out error:', error);
            return false;
        }
    }

    async getFaceContext(user) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.getFaceContext, this.getSessionHeaders(user));
            if (error) throw error;
            return this.normalizePayload(data);
        } catch (error) {
            console.error('❌ Get face context error:', error);
            return null;
        }
    }

    async saveFaceEnrollment(user, descriptor, imageUrl = null) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.enrollFace, {
                ...this.getSessionHeaders(user),
                p_face_descriptor: descriptor,
                p_profile_image_url: imageUrl
            });
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload || { success: true };
        } catch (error) {
            console.error('❌ Save face enrollment error:', error);
            return { success: false, error: error.message };
        }
    }

    async createEmployee(employeeData) {
        try {
            const generatedPassword = employeeData.password || ('Ax@' + Math.random().toString(36).slice(-8) + '1!');
            const sessionToken = this.getSessionToken();
            const baseParams = {
                p_name: employeeData.name?.trim(),
                p_email: employeeData.email || null,
                p_plain_password: generatedPassword,
                        apiKey: AppConfig?.emailService?.apiKey || '',
                p_face_descriptor: employeeData.faceDescriptor || null,
                p_profile_image_url: employeeData.profileImageUrl || null
            };

            let response = null;
            if (sessionToken) {
                response = await this.rpc(AppConfig.supabase.rpc.createEmployee, { p_session_token: sessionToken, ...baseParams });
                const sessionError = response?.error?.message || response?.error?.details || '';
                if (response?.error && /invalid_session|forbidden|session/i.test(String(sessionError))) {
                    response = null;
                }
            }
            if (!response) {
                response = await this.rpc(AppConfig.supabase.rpc.createEmployee, baseParams);
            }

            const { data, error } = response;
            if (error) throw error;
            const payload = this.normalizePayload(data);
            if (!payload?.success) return payload || { success: false, error: 'Unknown error' };

            if (employeeData.email && AppConfig?.emailService?.url) {
                await fetch(AppConfig.emailService.url, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'sendNewEmpEmails',
                        name: employeeData.name?.trim(),
                        code: payload.employee_code || payload.employeeCode || payload.code,
                        email: employeeData.email,
                        password: generatedPassword
                    })
                }).catch(() => {});
            }

            return { success: true, employee_code: payload.employee_code || payload.employeeCode || payload.code, generatedPassword };
        } catch (error) {
            console.error('❌ Create employee error:', error);
            return { success: false, error: String(error?.message || 'فشل إنشاء الحساب') };
        }
    }

    async changeOwnPassword(user, currentPassword, newPassword) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.changeOwnPassword, {
                ...this.getSessionHeaders(user),
                p_old_password: currentPassword,
                p_new_password: newPassword
            });
            if (error) throw error;
            return this.normalizePayload(data) || { success: false, error: 'Unknown error' };
        } catch (error) {
            console.error('❌ Change own password error:', error);
            return { success: false, error: error.message || 'فشل تغيير كلمة المرور' };
        }
    }

    async adminChangeEmployeePassword(code, newPassword) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.adminChangeEmployeePassword, {
                ...this.getSessionHeaders(),
                p_employee_code: String(code || '').toUpperCase(),
                p_new_password: newPassword
            });
            if (error) throw error;
            return this.normalizePayload(data) || { success: false, error: 'Unknown error' };
        } catch (error) {
            console.error('❌ Admin change employee password error:', error);
            return { success: false, error: error.message || 'فشل تغيير كلمة السر' };
        }
    }

    async issueLivenessChallenge() {
        try {
            const rpcName = AppConfig?.supabase?.rpc?.issueLivenessChallenge;
            if (!rpcName) return { success: true, challenge_token: null, mode: 'client_only' };
            const { data, error } = await this.rpc(rpcName, this.getSessionHeaders());
            if (error) throw error;
            return this.normalizePayload(data) || { success: false, error: 'Unknown challenge response' };
        } catch (error) {
            console.error('❌ Issue liveness challenge error:', error);
            return { success: false, error: error.message || 'فشل إنشاء تحدي التحقق الحيوي' };
        }
    }

    async recordAttendanceSecure(record) {
        try {
            const params = {
                ...this.getSessionHeaders(),
                p_type: record.type,
                p_shift: record.shift || 'لم يتم التحديد',
                p_location_link: record.location_link || null,
                p_latitude: record.latitude ?? null,
                p_longitude: record.longitude ?? null,
                p_gps_accuracy: record.gps_accuracy ?? null,
                p_attendance_image_url: record.attendance_image_url || null,
                p_face_descriptor: Array.isArray(record.face_descriptor) ? record.face_descriptor : null,
                p_liveness_token: record.liveness_token || null,
                p_liveness_proof: record.liveness_proof || null
            };

            const primaryRpc = AppConfig?.supabase?.rpc?.recordAttendance || 'record_attendance_enterprise';
            let response = await this.rpc(primaryRpc, params);

            if (response?.error && AppConfig?.supabase?.rpc?.recordAttendanceLegacy) {
                const msg = String(response.error.message || response.error.details || '');
                if (/record_attendance_enterprise|function .* does not exist|schema cache|PGRST202/i.test(msg)) {
                    response = await this.rpc(AppConfig.supabase.rpc.recordAttendanceLegacy, {
                        ...this.getSessionHeaders(),
                        p_type: record.type,
                        p_shift: record.shift || 'لم يتم التحديد',
                        p_location_link: record.location_link || null,
                        p_latitude: record.latitude ?? null,
                        p_longitude: record.longitude ?? null,
                        p_gps_accuracy: record.gps_accuracy ?? null,
                        p_attendance_image_url: record.attendance_image_url || null,
                        p_face_verified: false
                    });
                }
            }

            const { data, error } = response;
            if (error) throw error;
            return this.normalizePayload(data) || { success: false, error: 'Unknown error' };
        } catch (error) {
            console.error('❌ Record attendance secure error:', error);
            return { success: false, error: error.message || 'فشل تسجيل الحضور' };
        }
    }


    async getTodayAttendance() {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.getTodayAttendance, this.getSessionHeaders());
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.attendance || payload?.records || [];
        } catch (error) {
            console.error('❌ Get today attendance error:', error);
            return [];
        }
    }

    async getAttendanceByRange(dateFrom = null, dateTo = null) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.getAttendanceByRange, {
                ...this.getSessionHeaders(),
                p_date_from: dateFrom || null,
                p_date_to: dateTo || null
            });
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.attendance || payload?.records || [];
        } catch (error) {
            console.error('❌ Get attendance by range error:', error);
            return [];
        }
    }

    async getEmployeeByCode(code) {
        try {
            const employees = await this.getAllEmployees();
            return employees.find(emp => String(emp.code || '').toUpperCase() === String(code || '').toUpperCase()) || null;
        } catch (error) {
            console.error('❌ Get employee error:', error);
            return null;
        }
    }

    async getAdminByUsername(username) {
        const user = this.currentUser || window.user;
        if (String(username || '').toLowerCase() === String(user?.username || '').toLowerCase()) {
            return user;
        }
        return null;
    }

    async getAllEmployees() {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.listEmployees, this.getSessionHeaders());
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.employees || [];
        } catch (error) {
            console.error('❌ Get all employees error:', error);
            return [];
        }
    }

    async getEmployeesCount() {
        try {
            const employees = await this.getAllEmployees();
            return employees.length || 0;
        } catch (error) {
            console.error('❌ Count employees error:', error);
            return 0;
        }
    }

    async updateEmployee(code, updates) {
        try {
            if (updates?.is_deleted) {
                return await this.deleteEmployee(code);
            }
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.updateEmployee, {
                ...this.getSessionHeaders(),
                p_employee_code: String(code || '').toUpperCase(),
                p_name: updates?.name || null,
                p_email: Object.prototype.hasOwnProperty.call(updates || {}, 'email') ? (updates.email || null) : null,
                p_profile_image_url: Object.prototype.hasOwnProperty.call(updates || {}, 'profile_image_url') ? (updates.profile_image_url || null) : null
            });
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.success ? { success: true, data: payload.employee || payload.data || null } : (payload || { success: false, error: 'Unknown error' });
        } catch (error) {
            console.error('❌ Update employee error:', error);
            return { success: false, error: error.message };
        }
    }

    async changePassword(code, currentPassword, newPassword) {
        return this.changeOwnPassword({ role: 'employee', code }, currentPassword, newPassword);
    }

    async getWorksiteSettings() {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.getWorksiteSettings, this.getSessionHeaders());
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.worksite || payload?.data || payload || null;
        } catch (error) {
            console.error('❌ Get worksite settings error:', error);
            return null;
        }
    }

    getAvatarStorageKey(user) {
        const role = user?.role || (user?.isAdmin ? 'admin' : 'employee');
        const identifier = role === 'admin' ? (user?.username || 'admin') : (user?.code || 'unknown');
        const safeIdentifier = String(identifier).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
        return `avatars/${role}_${safeIdentifier}_avatar.jpg`;
    }

    async uploadProfileImage(user, imageBlob) {
        try {
            if (!this.storage) throw new Error('Storage service not available');
            const bucket = AppConfig?.supabase?.storage?.bucketName || 'faces';
            const fileKey = this.getAvatarStorageKey(user);
            const { error } = await this.storage.from(bucket).upload(fileKey, imageBlob, {
                upsert: true,
                contentType: 'image/jpeg',
                cacheControl: '3600'
            });
            if (error) throw error;
            const { data } = this.storage.from(bucket).getPublicUrl(fileKey);
            return { success: true, imageUrl: data?.publicUrl || null, fileKey };
        } catch (error) {
            console.error('❌ Upload profile image error:', error);
            return { success: false, error: error.message || 'فشل رفع الصورة الشخصية' };
        }
    }

    async updateUserProfileImage(user, imageUrl = null) {
        try {
            const rpcName = AppConfig?.supabase?.rpc?.updateAvatarImage || 'update_avatar_image_secure';
            const { data, error } = await this.rpc(rpcName, {
                ...this.getSessionHeaders(user),
                p_avatar_image_url: imageUrl
            });
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.success ? { success: true, data: payload.user || null } : (payload || { success: false, error: 'فشل تحديث الصورة الشخصية' });
        } catch (error) {
            console.error('❌ Update profile image error:', error);
            return { success: false, error: error.message || 'فشل تحديث الصورة الشخصية' };
        }
    }

    async removeProfileImage(user) {
        try {
            const bucket = AppConfig?.supabase?.storage?.bucketName || 'faces';
            const fileKey = this.getAvatarStorageKey(user);
            if (this.storage) {
                try { await this.storage.from(bucket).remove([fileKey]); } catch (_) {}
            }
            return await this.updateUserProfileImage(user, null);
        } catch (error) {
            console.error('❌ Remove profile image error:', error);
            return { success: false, error: error.message || 'فشل إزالة الصورة الشخصية' };
        }
    }

    async updateWorksiteSettings(worksiteId, updates) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.saveWorksiteSettings, {
                ...this.getSessionHeaders(),
                p_name: updates?.name || 'المقر الرئيسي',
                p_map_url: updates?.map_url || null,
                p_latitude: updates?.latitude,
                p_longitude: updates?.longitude,
                p_allowed_radius_meters: updates?.allowed_radius_meters,
                p_max_accuracy_meters: updates?.max_accuracy_meters,
                p_is_active: updates?.is_active !== false
            });
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.success ? { success: true, data: payload.worksite || payload.data || null } : (payload || { success: false, error: 'فشل تحديث إعدادات المقر' });
        } catch (error) {
            console.error('❌ Update worksite settings error:', error);
            return { success: false, error: error.message || 'فشل تحديث إعدادات المقر' };
        }
    }

    async requestPasswordReset(identifier) {
        try {
            const normalized = String(identifier || '').trim();
            if (!normalized) return { success: false, error: 'يرجى إدخال الكود أو اسم المستخدم' };

            const fnName = AppConfig?.supabase?.functions?.requestPasswordResetEmail;
            if (fnName && this.client?.functions?.invoke) {
                const { data, error } = await this.client.functions.invoke(fnName, {
                    body: { identifier: normalized }
                });
                if (error) throw error;
                return data || { success: true, message: 'إذا كان الحساب موجودًا وتم تسجيل بريد له فسيتم إرسال رمز إعادة التعيين' };
            }

            // Fallback only for maintenance mode
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.requestPasswordReset, { p_identifier: normalized, p_debug: false });
            if (error) throw error;
            return this.normalizePayload(data) || { success: false, error: 'فشل طلب الاستعادة' };
        } catch (error) {
            console.error('❌ Password reset request error:', error);
            return { success: false, error: error.message || 'فشل طلب استعادة كلمة المرور' };
        }
    }

    async completePasswordReset(identifier, resetToken, newPassword) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.completePasswordReset, {
                p_identifier: String(identifier || '').trim(),
                p_reset_token: String(resetToken || '').trim(),
                p_new_password: String(newPassword || '')
            });
            if (error) throw error;
            return this.normalizePayload(data) || { success: false, error: 'فشل إكمال الاستعادة' };
        } catch (error) {
            console.error('❌ Complete password reset error:', error);
            return { success: false, error: error.message || 'فشل إكمال استعادة كلمة المرور' };
        }
    }

    async getTodayAttendance(employeeCode) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.getTodayAttendance, {
                ...this.getSessionHeaders(),
                p_employee_code: employeeCode ? String(employeeCode).toUpperCase() : null
            });
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.attendance || [];
        } catch (error) {
            console.error('❌ Get today attendance error:', error);
            return [];
        }
    }

    async getAttendanceByRange(employeeCode, startDate, endDate) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.getAttendanceByRange, {
                ...this.getSessionHeaders(),
                p_employee_code: employeeCode ? String(employeeCode).toUpperCase() : null,
                p_start_date: startDate?.toISOString?.() || startDate,
                p_end_date: endDate?.toISOString?.() || endDate
            });
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.attendance || [];
        } catch (error) {
            console.error('❌ Get attendance range error:', error);
            return [];
        }
    }

    async getTodayAttendanceForAll() {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.getTodayAttendance, { ...this.getSessionHeaders(), p_employee_code: null });
            if (error) throw error;
            const payload = this.normalizePayload(data);
            return payload?.attendance || [];
        } catch (error) {
            console.error('❌ Get all today attendance error:', error);
            return [];
        }
    }

    async getSystemStats() {
        try {
            const [totalEmployees, todayAttendance] = await Promise.all([
                this.getEmployeesCount(),
                this.getTodayAttendanceForAll()
            ]);
            return {
                totalEmployees,
                todayCheckIns: todayAttendance.filter(r => r.type === 'حضور').length,
                todayCheckOuts: todayAttendance.filter(r => r.type === 'انصراف').length
            };
        } catch (error) {
            console.error('❌ Get stats error:', error);
            return { totalEmployees: 0, todayCheckIns: 0, todayCheckOuts: 0 };
        }
    }

    async uploadFaceImage(base64Image, fileName) {
        try {
            if (!this.storage) return null;
            const bucketName = AppConfig?.supabase?.storage?.bucketName || 'faces';
            const response = await fetch(base64Image);
            const blob = await response.blob();
            const filePath = `${fileName}_${Date.now()}.jpg`;
            const { error } = await this.storage.from(bucketName).upload(filePath, blob, {
                cacheControl: '3600',
                upsert: true
            });
            if (error) throw error;
            const { data } = this.storage.from(bucketName).getPublicUrl(filePath);
            return data?.publicUrl || null;
        } catch (error) {
            console.error('❌ Upload image error:', error);
            return null;
        }
    }

    async deleteEmployee(code) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.deleteEmployee, {
                ...this.getSessionHeaders(),
                p_employee_code: String(code || '').toUpperCase()
            });
            if (error) throw error;
            return this.normalizePayload(data) || { success: false, error: 'فشل حذف الموظف' };
        } catch (error) {
            console.error('❌ Delete employee error:', error);
            return { success: false, error: error.message || 'فشل حذف الموظف' };
        }
    }
}

let db;
document.addEventListener('DOMContentLoaded', () => {
    db = new SupabaseClient();
    window.db = db;
    console.log('🗄️ Database module loaded');
});

console.log('✅ supabase-client.js v5.0 loaded successfully');
