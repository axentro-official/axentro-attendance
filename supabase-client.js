/**
 * ============================================
 * 🗄️ AXENTRO SUPABASE CLIENT v4.1 - ROBUST
 * ✅ Database Connection & Operations
 * 🔌 محسّن مع Error Handling و Retry Logic
 * ============================================
 */

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.currentUser = null;
        this.retryCount = 0;
        this.maxRetries = AppConfig?.retry?.maxAttempts || 3;
        
        // Initialize immediately
        this.init();
        
        console.log('🗄️ Supabase Client initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize Supabase client with error handling
     */
    init() {
        try {
            // Check if Supabase library is loaded
            if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
                console.error('❌ Supabase library not loaded');
                this.isConnected = false;
                return;
            }

            // Get configuration with fallbacks
            const config = AppConfig?.supabase;
            
            if (!config?.url || !config?.anonKey) {
                console.error('❌ Supabase configuration missing');
                this.isConnected = false;
                return;
            }

            // Create Supabase client
            this.client = window.supabase.createClient(
                config.url,
                config.anonKey,
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: false
                    },
                    db: {
                        schema: 'public'
                    },
                    global: {
                        headers: {
                            'x-app-name': 'axentro-attendance',
                            'x-app-version': AppConfig?.app?.version || '4.1.0'
                        }
                    }
                }
            );

            // Setup authentication listeners
            this.setupAuthListeners();

            this.isConnected = true;
            
            console.log('✅ Supabase client created successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Supabase client:', error);
            this.isConnected = false;
        }
    }

    /**
     * Setup authentication state change listeners
     */
    setupAuthListeners() {
        if (!this.client) return;

        // Listen for auth state changes
        this.client.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 Auth event: ${event}`);

            switch (event) {
                case 'SIGNED_IN':
                    this.handleSignIn(session);
                    break;

                case 'SIGNED_OUT':
                    this.handleSignOut();
                    break;

                case 'TOKEN_REFRESHED':
                    console.log('✅ Auth token refreshed');
                    break;

                case 'USER_UPDATED':
                    console.log('👤 User profile updated');
                    break;

                default:
                    console.log(`ℹ️ Unhandled auth event: ${event}`);
            }
        });
    }

    /**
     * Handle successful sign in event
     * @param {object} session - Session object from Supabase
     */
    handleSignIn(session) {
        if (session?.user) {
            this.currentUser = session.user;
            
            // Save session to local storage for persistence
            Utils.saveToStorage(
                Constants?.storageKeys?.USER_SESSION || 'axentro_user_session',
                {
                    user: session.user,
                    accessToken: session.access_token,
                    expiresAt: new Date((session.expires_at || 0) * 1000).toISOString()
                }
            );

            console.log(`✅ Signed in as: ${session.user.email || session.user.id}`);
        }
    }

    /**
     * Handle sign out event
     */
    handleSignOut() {
        this.currentUser = null;
        
        Utils.removeFromStorage(Constants?.storageKeys?.USER_SESSION);
        
        console.log('👋 Signed out');
    }

    // ============================================
    // 🔗 CONNECTION STATUS
    // ============================================

    /**
     * Check if connected to Supabase
     * @returns {boolean}
     */
    isConnectedToSupabase() {
        return this.isConnected && !!this.client;
    }

    /**
     * Attempt to reconnect if disconnected
     * @returns {Promise<boolean>}
     */
    async attemptReconnect() {
        if (this.isConnected) return true;

        console.log('🔄 Attempting to reconnect to Supabase...');
        
        try {
            this.init();
            return this.isConnected;
        } catch (error) {
            console.error('❌ Reconnection failed:', error);
            return false;
        }
    }

    /**
     * Execute operation with automatic retry on failure
     * @param {Function} operation - Async function to execute
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise<*>} Operation result
     */
    async executeWithRetry(operation, maxRetries = null) {
        const retries = maxRetries || this.maxRetries;
        let lastError;

        for (let i = 0; i <= retries; i++) {
            try {
                const result = await operation();
                
                // Reset retry count on success
                this.retryCount = 0;
                
                return result;

            } catch (error) {
                lastError = error;
                this.retryCount++;
                
                console.warn(`⚠️ Operation failed (attempt ${i + 1}/${retries + 1}):`, error.message);

                // Don't retry on certain errors
                if (this.shouldNotRetry(error)) {
                    throw error;
                }

                // Wait before retrying (exponential backoff)
                if (i < retries) {
                    const delay = Math.min(
                        1000 * Math.pow(2, i),
                        AppConfig?.retry?.maxDelay || 10000
                    );
                    
                    await Utils.sleep(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Determine if error should not be retried
     * @param {Error} error - Error object
     * @returns {boolean}
     */
    shouldNotRetry(error) {
        const nonRetryableCodes = [
            '23505', // Unique violation
            '23503', // Foreign key violation
            '42501', // Insufficient privilege
            'PGRST', // PostgREST errors
            'JWT'
        ];

        const errorMessage = error.message || '';
        const errorCode = error.code || '';

        return nonRetryableCodes.some(code => 
            errorMessage.includes(code) || errorCode.includes(code)
        );
    }

    // ============================================
    // 🔐 AUTHENTICATION OPERATIONS
    // ============================================

    /**
     * Sign in with employee code and password (custom implementation)
     * @param {string} code - Employee code
     * @param {string} password - Password
     * @returns {Promise<object>} Result with user data or error
     */
    async signIn(code, password) {
        try {
            if (!this.isConnectedToSupabase()) {
                throw new Error('Database connection not available');
            }

            // Query employees table directly (custom auth)
            const { data, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .select('*')
                    .eq('code', code.toUpperCase().trim())
                    .eq('password', password)
                    .eq('is_deleted', false)
                    .single();
            });

            if (error) throw error;

            if (!data) {
                return {
                    success: false,
                    error: ErrorCodes.AUTH_INVALID_CREDENTIALS.message,
                    code: ErrorCodes.AUTH_INVALID_CREDENTIALS.code
                };
            }

            // Check if password change required
            if (data.is_first_login && !data.is_admin) {
                return {
                    success: true,
                    requiresPasswordChange: true,
                    user: data
                };
            }

            // Set current user context
            await this.setUserContext(data);

            return {
                success: true,
                user: data
            };

        } catch (error) {
            console.error('❌ Sign in error:', error);

            return {
                success: false,
                error: ErrorCodes.AUTH_INVALID_CREDENTIALS.message,
                details: error.message
            };
        }
    }

    /**
     * Set user context for Row Level Security (RLS)
     * @param {object} user - User data object
     */
    async setUserContext(user) {
        try {
            this.currentUser = user;

            // Store context locally for API calls
            Utils.saveToSession('current_user', {
                code: user.code,
                isAdmin: user.is_admin,
                name: user.name
            });

            console.log(`👤 User context set: ${user.code}`);

        } catch (error) {
            console.error('⚠️ Failed to set user context:', error);
        }
    }

    /**
     * Sign out current user
     * @returns {Promise<boolean>}
     */
    async signOut() {
        try {
            // Clear local storage
            Utils.removeFromStorage(Constants?.storageKeys?.USER_SESSION);
            Utils.removeFromStorage(Constants?.storageKeys?.REMEMBER_ME);
            Utils.removeFromSession('current_user');

            // Clear Supabase session if exists
            if (this.client?.auth) {
                await this.client.auth.signOut();
            }

            this.currentUser = null;

            // Play logout sound
            Utils.playSound('logoutSound', 0.6);

            console.log('👋 User signed out');

            return true;

        } catch (error) {
            console.error('❌ Sign out error:', error);
            return false;
        }
    }

    // ============================================
    // 👤 EMPLOYEE OPERATIONS
    // ============================================

    /**
     * Register new employee
     * @param {object} employeeData - Employee information
     * @returns {Promise<object>} Result with new employee or error
     */
    async registerEmployee(employeeData) {
        try {
            if (!this.isConnectedToSupabase()) {
                throw new Error('Database connection not available');
            }

            // Generate unique code if not provided
            const code = employeeData.code || this.generateEmployeeCode();

            // Generate secure password if not provided
            const password = employeeData.password || Utils.generatePassword(10);

            // Prepare new employee object
            const newEmployee = {
                code: code.toUpperCase(),
                name: employeeData.name.trim(),
                email: employeeData.email || null,
                password: password,
                face_descriptor: employeeData.faceDescriptor || null,
                is_admin: false,
                is_first_login: true
            };

            // Insert into database
            const { data, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .insert(newEmployee)
                    .select()
                    .single();
            });

            if (error) {
                // Handle unique constraint violation
                if (error.code === '23505') {
                    return {
                        success: false,
                        error: 'هذا الكود مسجل مسبقاً',
                        code: 'DUPLICATE_CODE'
                    };
                }
                throw error;
            }

            // Send welcome emails via Google Apps Script
            await this.sendNewEmployeeEmails({
                ...newEmployee,
                password: password
            });

            console.log(`✅ New employee registered: ${code}`);

            return {
                success: true,
                employee: data,
                generatedPassword: password
            };

        } catch (error) {
            console.error('❌ Registration error:', error);

            return {
                success: false,
                error: 'فشل في إنشاء الحساب',
                details: error.message
            };
        }
    }

    /**
     * Generate unique employee code
     * @returns {string} Generated code
     */
    generateEmployeeCode() {
        const prefix = 'AX';
        const year = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

        return `${prefix}${year}${random}`;
    }

    /**
     * Get employee by code
     * @param {string} code - Employee code
     * @returns {Promise<object|null>} Employee data or null
     */
    async getEmployeeByCode(code) {
        try {
            const { data, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .select('*')
                    .eq('code', code.toUpperCase().trim())
                    .eq('is_deleted', false)
                    .single();
            });

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('❌ Get employee error:', error);
            return null;
        }
    }

    /**
     * Get all employees (admin only)
     * @returns {Promise<Array>} Array of employees
     */
    async getAllEmployees() {
        try {
            const { data, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .select('*')
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: false });
            });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('❌ Get all employees error:', error);
            return [];
        }
    }

    /**
     * Get total employees count
     * @returns {Promise<number>} Count of employees
     */
    async getEmployeesCount() {
        try {
            const { count, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_deleted', false);
            });

            if (error) throw error;

            return count || 0;

        } catch (error) {
            console.error('❌ Count error:', error);
            return 0;
        }
    }

    /**
     * Update employee profile
     * @param {string} code - Employee code
     * @param {object} updates - Fields to update
     * @returns {Promise<object>} Result
     */
    async updateEmployee(code, updates) {
        try {
            const { data, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .update(updates)
                    .eq('code', code.toUpperCase().trim())
                    .select()
                    .single();
            });

            if (error) throw error;

            return { success: true, data };

        } catch (error) {
            console.error('❌ Update employee error:', error);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Change employee password
     * @param {string} code - Employee code
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<object>} Result
     */
    async changePassword(code, currentPassword, newPassword) {
        try {
            // Verify current password first
            const { data: employee, error: verifyError } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .select('*')
                    .eq('code', code.toUpperCase().trim())
                    .eq('password', currentPassword)
                    .single();
            });

            if (verifyError || !employee) {
                return {
                    success: false,
                    error: 'كلمة المرور الحالية غير صحيحة'
                };
            }

            // Update password
            const { error: updateError } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .update({
                        password: newPassword,
                        is_first_login: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('code', code);
            });

            if (updateError) throw updateError;

            return { success: true };

        } catch (error) {
            console.error('❌ Change password error:', error);

            return {
                success: false,
                error: 'فشل تغيير كلمة المرور'
            };
        }
    }

    /**
     * Request password reset
     * @param {string} code - Employee code
     * @returns {Promise<object>} Result
     */
    async requestPasswordReset(code) {
        try {
            // Get employee info
            const employee = await this.getEmployeeByCode(code);

            if (!employee) {
                return {
                    success: false,
                    error: ErrorCodes.AUTH_USER_NOT_FOUND.message
                };
            }

            if (!employee.email) {
                return {
                    success: false,
                    error: 'لا يوجد بريد إلكتروني مسجل لهذا الحساب',
                    skipped: true
                };
            }

            // Generate new password
            const newPassword = Utils.generatePassword(10);

            // Update password in database
            const { error: updateError } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .update({ password: newPassword })
                    .eq('code', code);
            });

            if (updateError) throw updateError;

            // Send email notification
            await this.sendPasswordResetEmail({
                ...employee,
                password: newPassword
            });

            return {
                success: true,
                message: 'تم إرسال كلمة المرور الجديدة إلى بريدك الإلكتروني'
            };

        } catch (error) {
            console.error('❌ Password reset error:', error);

            return {
                success: false,
                error: 'فشل طلب استعادة كلمة المرور'
            };
        }
    }

    // ============================================
    // ⏰ ATTENDANCE OPERATIONS
    // ============================================

    /**
     * Record attendance (check-in/check-out)
     * @param {object} attendanceData - Attendance record data
     * @returns {Promise<object>} Result
     */
    async recordAttendance(attendanceData) {
        try {
            if (!this.isConnectedToSupabase()) {
                throw new Error('Database connection not available');
            }

            // Prepare attendance record
            const record = {
                employee_code: attendanceData.employee_code,
                employee_name: attendanceData.employee_name,
                type: attendanceData.type,
                location_link: attendanceData.location_link || null,
                shift: attendanceData.shift || 'لم يتم التحديد',
                hours_worked: attendanceData.hours_worked || null,
                overtime: attendanceData.overtime || '0 دقيقة',
                ip_address: null, // Can be added later
                user_agent: navigator.userAgent,
                gps_accuracy: attendanceData.gps_accuracy || null,
                attendance_image_url: attendanceData.image_url || null
            };

            // Insert into database
            const { data, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.attendance || 'attendance')
                    .insert(record)
                    .select()
                    .single();
            });

            if (error) throw error;

            // Send attendance alert email
            await this.sendAttendanceAlert({
                ...attendanceData,
                datetime: new Date().toISOString(),
                id: data.id
            });

            console.log(`✅ Attendance recorded: ${attendanceData.type}`);

            return {
                success: true,
                record: data
            };

        } catch (error) {
            console.error('❌ Record attendance error:', error);

            return {
                success: false,
                error: 'فشل تسجيل الحضور',
                details: error.message
            };
        }
    }

    /**
     * Get today's attendance records for specific employee
     * @param {string} employeeCode - Employee code
     * @returns {Promise<Array>} Today's records
     */
    async getTodayAttendance(employeeCode) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { data, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.attendance || 'attendance')
                    .select('*')
                    .eq('employee_code', employeeCode)
                    .gte('created_at', today.toISOString())
                    .lt('created_at', tomorrow.toISOString())
                    .order('created_at', { ascending: true });
            });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('❌ Get today attendance error:', error);
            return [];
        }
    }

    /**
     * Get attendance records by date range
     * @param {string} employeeCode - Employee code
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Records array
     */
    async getAttendanceByRange(employeeCode, startDate, endDate) {
        try {
            const { data, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.attendance || 'attendance')
                    .select('*')
                    .eq('employee_code', employeeCode)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString())
                    .order('created_at', { ascending: false });
            });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('❌ Get attendance range error:', error);
            return [];
        }
    }

    // ============================================
    // 📤 EMAIL OPERATIONS (via Google Apps Script)
    // ============================================

    /**
     * Send new employee welcome emails
     * @param {object} data - Employee data including password
     */
    async sendNewEmployeeEmails(data) {
        try {
            const emailServiceUrl = AppConfig?.emailService?.url;

            if (!emailServiceUrl) {
                console.warn('⚠️ Email service URL not configured');
                return;
            }

            const payload = {
                action: 'sendNewEmpEmails',
                name: data.name,
                code: data.code,
                email: data.email,
                password: data.password
            };

            const response = await fetch(emailServiceUrl, {
                method: 'POST',
                mode: 'no-cors', // Required for cross-origin requests
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('✅ New employee emails triggered');

        } catch (error) {
            console.warn('⚠️ Failed to trigger new employee emails:', error.message);
            // Don't throw - email failure shouldn't block registration
        }
    }

    /**
     * Send attendance alert email
     * @param {object} data - Attendance data
     */
    async sendAttendanceAlert(data) {
        try {
            const emailServiceUrl = AppConfig?.emailService?.url;

            if (!emailServiceUrl) return;

            const payload = {
                action: 'sendAttAlert',
                name: data.employee_name,
                code: data.employee_code,
                type: data.type,
                datetime: data.datetime,
                location: data.location_link,
                shift: data.shift,
                hoursWorked: data.hours_worked,
                overtime: data.overtime,
                imgBase64: null // Can be added later if needed
            };

            await fetch(emailServiceUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('✅ Attendance alert email triggered');

        } catch (error) {
            console.warn('⚠️ Failed to send attendance alert:', error.message);
        }
    }

    /**
     * Send password reset email
     * @param {object} data - User data with new password
     */
    async sendPasswordResetEmail(data) {
        try {
            const emailServiceUrl = AppConfig?.emailService?.url;

            if (!emailServiceUrl) return;

            const payload = {
                action: 'sendForgotPw',
                name: data.name,
                code: data.code,
                email: data.email,
                password: data.password
            };

            await fetch(emailServiceUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('✅ Password reset email triggered');

        } catch (error) {
            console.warn('⚠️ Failed to send password reset email:', error.message);
        }
    }

    // ============================================
    // 🖼️ STORAGE OPERATIONS (Supabase Storage)
    // ============================================

    /**
     * Upload face image to Supabase Storage
     * @param {string} base64Image - Base64 encoded image
     * @param {string} fileName - File name
     * @returns {Promise<string|null>} Public URL or null
     */
    async uploadFaceImage(base64Image, fileName) {
        try {
            if (!this.client?.storage) {
                console.warn('⚠️ Storage not available');
                return null;
            }

            const bucketName = AppConfig?.supabase?.storage?.bucketName || 'faces';

            // Convert base64 to blob
            const response = await fetch(base64Image);
            const blob = await response.blob();

            // Generate unique file path
            const filePath = `${fileName}_${Date.now()}.jpg`;

            // Upload to storage
            const { data, error } = await this.client.storage
                .from(bucketName)
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = this.client.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            console.log('✅ Image uploaded successfully');

            return urlData?.publicUrl || null;

        } catch (error) {
            console.error('❌ Upload image error:', error);
            return null;
        }
    }

    // ============================================
    // 📊 ADMIN OPERATIONS
    // ============================================

    /**
     * Delete employee (soft delete)
     * @param {string} code - Employee code
     * @returns {Promise<object>} Result
     */
    async deleteEmployee(code) {
        try {
            const { error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.employees || 'employees')
                    .update({ is_deleted: true })
                    .eq('code', code);
            });

            if (error) throw error;

            return { success: true };

        } catch (error) {
            console.error('❌ Delete employee error:', error);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get system statistics (admin only)
     * @returns {Promise<object>} Statistics
     */
    async getSystemStats() {
        try {
            const [employeesResult, todayAttendanceResult] = await Promise.all([
                this.getEmployeesCount(),
                this.getTodayAttendanceForAll()
            ]);

            return {
                totalEmployees: employeesResult,
                todayCheckIns: todayAttendanceResult.filter(r => r.type === 'حضور').length,
                todayCheckOuts: todayAttendanceResult.filter(r => r.type === 'انصراف').length
            };

        } catch (error) {
            console.error('❌ Get stats error:', error);
            return {
                totalEmployees: 0,
                todayCheckIns: 0,
                todayCheckOuts: 0
            };
        }
    }

    /**
     * Get all today's attendance records (admin)
     * @returns {Promise<Array>}
     */
    async getTodayAttendanceForAll() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { data, error } = await this.executeWithRetry(async () => {
                return await this.client
                    .from(AppConfig?.supabase?.tables?.attendance || 'attendance')
                    .select('*')
                    .gte('created_at', today.toISOString())
                    .lt('created_at', tomorrow.toISOString());
            });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('❌ Get all today attendance error:', error);
            return [];
        }
    }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================

/**
 * Global database instance
 */
let db;

// Initialize when DOM is ready (and after config loads)
document.addEventListener('DOMContentLoaded', () => {
    db = new SupabaseClient();
    
    console.log('🗄️ Database module loaded');
});

console.log('✅ supabase-client.js v4.1 loaded successfully');
