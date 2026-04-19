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
                global: { headers: { 'x-app-name': 'axentro-attendance', 'x-app-version': AppConfig?.app?.version || '5.0.0' } }
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
            const payload = Array.isArray(data) ? data[0] : data;
            if (!payload?.success) {
                return { success: false, error: payload?.error || ErrorCodes.AUTH_INVALID_CREDENTIALS.message };
            }
            const user = payload.user || {};
            await this.setUserContext(user);
            return {
                success: true,
                user,
                requiresPasswordChange: !!payload.requires_password_change,
                requiresFaceEnrollment: !!payload.requires_face_enrollment,
                role: payload.role || user.role || 'employee'
            };
        } catch (error) {
            console.error('❌ Sign in error:', error);
            return { success: false, error: error.message || ErrorCodes.AUTH_INVALID_CREDENTIALS.message };
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
            const role = user?.role || user?.userType || (user?.isAdmin ? 'admin' : 'employee');
            const identifier = role === 'admin' ? (user.username || user.code || 'admin') : (user.code || '');
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.getFaceContext, {
                p_role: role,
                p_identifier: role === 'admin' ? String(identifier).toLowerCase() : String(identifier).toUpperCase()
            });
            if (error) throw error;
            return Array.isArray(data) ? data[0] : data;
        } catch (error) {
            console.error('❌ Get face context error:', error);
            return null;
        }
    }

    async saveFaceEnrollment(user, descriptor, imageUrl = null) {
        try {
            const role = user?.role || (user?.isAdmin ? 'admin' : 'employee');
            const identifier = role === 'admin' ? (user.username || 'admin') : user.code;
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.enrollFace, {
                p_role: role,
                p_identifier: role === 'admin' ? String(identifier).toLowerCase() : String(identifier).toUpperCase(),
                p_face_descriptor: descriptor,
                p_profile_image_url: imageUrl
            });
            if (error) throw error;
            const payload = Array.isArray(data) ? data[0] : data;
            return payload || { success: true };
        } catch (error) {
            console.error('❌ Save face enrollment error:', error);
            return { success: false, error: error.message };
        }
    }

    async createEmployee(employeeData) {
        try {
            const adminUser = window.user?.username || 'admin';
            const baseParams = {
                p_admin_username: String(adminUser).toLowerCase(),
                p_name: employeeData.name?.trim(),
                p_email: employeeData.email || null
            };

            let data, error;
            ({ data, error } = await this.rpc(AppConfig.supabase.rpc.createEmployee, {
                ...baseParams,
                p_plain_password: employeeData.password || null,
                p_face_descriptor: employeeData.faceDescriptor || null,
                p_profile_image_url: employeeData.profileImageUrl || null
            }));

            if (error && String(error.message || '').includes('Could not find the function')) {
                ({ data, error } = await this.rpc(AppConfig.supabase.rpc.createEmployee, baseParams));
            }
            if (error) throw error;
            const payload = Array.isArray(data) ? data[0] : data;
            return payload || { success: false, error: 'Unknown error' };
        } catch (error) {
            console.error('❌ Create employee error:', error);
            const msg = String(error?.message || '');
            if (msg.includes('password_hash') || msg.includes('null value in column')) {
                return { success: false, error: 'قاعدة البيانات الحالية تحتاج تحديث دالة create_employee_secure حتى تُنشئ password_hash تلقائياً. نفّذ ملف sql-patch-create-employee-secure.sql في Supabase ثم أعد المحاولة.' };
            }
            if (msg.includes('Could not find the function')) {
                return { success: false, error: 'دالة إنشاء الموظف غير موجودة في قاعدة البيانات. نفّذ ملف sql-patch-create-employee-secure.sql ثم أعد المحاولة.' };
            }
            return { success: false, error: msg || 'فشل إنشاء الحساب' };
        }
    }

    async changeOwnPassword(user, currentPassword, newPassword) {
        try {
            const role = user?.role || (user?.isAdmin ? 'admin' : 'employee');
            const identifier = role === 'admin' ? (user.username || 'admin') : user.code;
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.changeOwnPassword, {
                p_role: role,
                p_identifier: role === 'admin' ? String(identifier).toLowerCase() : String(identifier).toUpperCase(),
                p_old_password: currentPassword,
                p_new_password: newPassword
            });
            if (error) throw error;
            return (Array.isArray(data) ? data[0] : data) || { success: false, error: 'Unknown error' };
        } catch (error) {
            console.error('❌ Change own password error:', error);
            return { success: false, error: error.message || 'فشل تغيير كلمة المرور' };
        }
    }

    async adminChangeEmployeePassword(code, newPassword) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.adminChangeEmployeePassword, {
                p_admin_username: String(window.user?.username || 'admin').toLowerCase(),
                p_employee_code: String(code || '').toUpperCase(),
                p_new_password: newPassword
            });
            if (error) throw error;
            return (Array.isArray(data) ? data[0] : data) || { success: false, error: 'Unknown error' };
        } catch (error) {
            console.error('❌ Admin change employee password error:', error);
            return { success: false, error: error.message || 'فشل تغيير كلمة السر' };
        }
    }

    async recordAttendanceSecure(record) {
        try {
            const { data, error } = await this.rpc(AppConfig.supabase.rpc.recordAttendance, {
                p_employee_code: String(record.employee_code || '').toUpperCase(),
                p_type: record.type,
                p_shift: record.shift || 'لم يتم التحديد',
                p_location_link: record.location_link || null,
                p_latitude: record.latitude ?? null,
                p_longitude: record.longitude ?? null,
                p_gps_accuracy: record.gps_accuracy ?? null,
                p_attendance_image_url: record.attendance_image_url || null,
                p_face_verified: record.face_verified !== false
            });
            if (error) throw error;
            return (Array.isArray(data) ? data[0] : data) || { success: false, error: 'Unknown error' };
        } catch (error) {
            console.error('❌ Record attendance secure error:', error);
            return { success: false, error: error.message || 'فشل تسجيل الحضور' };
        }
    }

    async getEmployeeByCode(code) {
        try {
            const { data, error } = await this.from(AppConfig.supabase.tables.employees)
                .select('code,name,email,is_first_login,face_descriptor,profile_image_url,is_deleted,created_at')
                .eq('code', String(code || '').toUpperCase())
                .eq('is_deleted', false)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Get employee error:', error);
            return null;
        }
    }

    async getAllEmployees() {
        try {
            const { data, error } = await this.from(AppConfig.supabase.tables.employees)
                .select('code,name,email,is_first_login,face_descriptor,profile_image_url,is_deleted,created_at')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Get all employees error:', error);
            return [];
        }
    }

    async getEmployeesCount() {
        try {
            const { count, error } = await this.from(AppConfig.supabase.tables.employees)
                .select('code', { count: 'exact', head: true })
                .eq('is_deleted', false);
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('❌ Count employees error:', error);
            return 0;
        }
    }

    async updateEmployee(code, updates) {
        try {
            const sanitized = { ...updates };
            delete sanitized.password;
            const { data, error } = await this.from(AppConfig.supabase.tables.employees)
                .update(sanitized)
                .eq('code', String(code || '').toUpperCase())
                .select('code,name,email,is_first_login,face_descriptor,profile_image_url,is_deleted,created_at')
                .single();
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('❌ Update employee error:', error);
            return { success: false, error: error.message };
        }
    }

    async changePassword(code, currentPassword, newPassword) {
        return this.changeOwnPassword({ role: 'employee', code }, currentPassword, newPassword);
    }

    async requestPasswordReset(code) {
        try {
            const employee = await this.getEmployeeByCode(code);
            if (!employee) {
                return { success: false, error: ErrorCodes.AUTH_USER_NOT_FOUND.message };
            }
            const newPassword = Math.random().toString(36).slice(-8);
            const changed = await this.adminChangeEmployeePassword(code, newPassword);
            if (!changed?.success) return changed;
            if (employee.email && AppConfig?.emailService?.url) {
                await fetch(AppConfig.emailService.url, {
                    method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sendForgotPw', name: employee.name, code: employee.code, email: employee.email, password: newPassword })
                });
            }
            return { success: true, message: 'تم إرسال كلمة المرور الجديدة إلى بريدك الإلكتروني' };
        } catch (error) {
            console.error('❌ Password reset error:', error);
            return { success: false, error: 'فشل طلب استعادة كلمة المرور' };
        }
    }

    async getTodayAttendance(employeeCode) {
        try {
            const today = new Date(); today.setHours(0,0,0,0);
            const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
            const { data, error } = await this.from(AppConfig.supabase.tables.attendance)
                .select('*')
                .eq('employee_code', String(employeeCode || '').toUpperCase())
                .gte('created_at', today.toISOString())
                .lt('created_at', tomorrow.toISOString())
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Get today attendance error:', error);
            return [];
        }
    }

    async getAttendanceByRange(employeeCode, startDate, endDate) {
        try {
            const { data, error } = await this.from(AppConfig.supabase.tables.attendance)
                .select('*')
                .eq('employee_code', String(employeeCode || '').toUpperCase())
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Get attendance range error:', error);
            return [];
        }
    }

    async getTodayAttendanceForAll() {
        try {
            const today = new Date(); today.setHours(0,0,0,0);
            const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
            const { data, error } = await this.from(AppConfig.supabase.tables.attendance)
                .select('*')
                .gte('created_at', today.toISOString())
                .lt('created_at', tomorrow.toISOString());
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Get all today attendance error:', error);
            return [];
        }
    }

    async getSystemStats() {
        try {
            const [totalEmployees, todayAttendance] = await Promise.all([this.getEmployeesCount(), this.getTodayAttendanceForAll()]);
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
            const { error } = await this.storage.from(bucketName).upload(filePath, blob, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            const { data } = this.storage.from(bucketName).getPublicUrl(filePath);
            return data?.publicUrl || null;
        } catch (error) {
            console.error('❌ Upload image error:', error);
            return null;
        }
    }

    async deleteEmployee(code) {
        return this.updateEmployee(code, { is_deleted: true });
    }
}

let db;
document.addEventListener('DOMContentLoaded', () => {
    db = new SupabaseClient();
    window.db = db;
    console.log('🗄️ Database module loaded');
});

console.log('✅ supabase-client.js v5.0 loaded successfully');
