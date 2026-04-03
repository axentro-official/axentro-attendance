/**
 * ============================================
 * 🗄️ AXENTRO SUPABASE CLIENT v4.0
 * ✅ Database Connection & Operations
 * ============================================
 */

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.currentUser = null;
        this.retryCount = 0;
        
        this.init();
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize Supabase client
     */
    init() {
        try {
            // Create Supabase client
            this.client = window.supabase.createClient(
                AppConfig.supabase.url,
                AppConfig.supabase.anonKey,
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
                            'x-app-version': AppConfig.app.version
                        }
                    }
                }
            );

            this.setupAuthListeners();
            this.isConnected = true;
            
            console.log('✅ Supabase client initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Supabase client:', error);
            this.isConnected = false;
        }
    }

    /**
     * Setup authentication state listeners
     */
    setupAuthListeners() {
        if (!this.client) return;

        // Listen for auth changes
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
                    console.log('✅ Token refreshed');
                    break;
                    
                case 'USER_UPDATED':
                    console.log('👤 User updated');
                    break;
            }
        });
    }

    /**
     * Handle sign in event
     * @param {object} session - Auth session
     */
    handleSignIn(session) {
        if (session?.user) {
            this.currentUser = session.user;
            Utils.saveToStorage(Constants.storageKeys.USER_SESSION, {
                user: session.user,
                accessToken: session.access_token,
                expiresAt: session.expires_at
            });
        }
    }

    /**
     * Handle sign out event
     */
    handleSignOut() {
        this.currentUser = null;
        Utils.removeFromStorage(Constants.storageKeys.USER_SESSION);
    }

    // ============================================
    // 🔐 AUTHENTICATION OPERATIONS
    // ============================================

    /**
     * Sign in with employee code and password
     * @param {string} code - Employee code
     * @param {string} password - Password
     * @returns {Promise<object>} Result with user data or error
     */
    async signIn(code, password) {
        try {
            // Custom sign in using RPC or direct query
            const { data, error } = await this.client
                .from(AppConfig.supabase.tables.employees)
                .select('*')
                .eq('code', code.toUpperCase().trim())
                .eq('password', password)
                .eq('is_deleted', false)
                .single();

            if (error) throw error;

            if (!data) {
                return {
                    success: false,
                    error: ErrorCodes.AUTH_INVALID_CREDENTIALS.message,
                    code: ErrorCodes.AUTH_INVALID_CREDENTIALS.code
                };
            }

            // Check if password change is required
            if (data.is_first_login && !data.is_admin) {
                return {
                    success: true,
                    requiresPasswordChange: true,
                    user: data
                };
            }

            // Set current user context for RLS
            await this.setUserContext(data);

            return {
                success: true,
                user: data
            };

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
     * Set user context for Row Level Security
     * @param {object} user - User data
     */
    async setUserContext(user) {
        try {
            // This would typically be done via a server-side function
            // For now, we'll store the context locally
            this.currentUser = user;
            
            // Store in session for API calls
            Utils.saveToSession('current_user', {
                code: user.code,
                isAdmin: user.is_admin
            });

        } catch (error) {
            console.error('Error setting user context:', error);
        }
    }

    /**
     * Sign out current user
     * @returns {Promise<boolean>} Success status
     */
    async signOut() {
        try {
            // Clear local storage
            Utils.removeFromStorage(Constants.storageKeys.USER_SESSION);
            Utils.removeFromStorage(Constants.storageKeys.REMEMBER_ME);
            Utils.removeFromSession('current_user');
            
            this.currentUser = null;
            
            ui.playSound('logoutSound', 0.6);
            
            return true;

        } catch (error) {
            console.error('Sign out error:', error);
            return false;
        }
    }

    /**
     * Register new employee
     * @param {object} employeeData - Employee data
     * @returns {Promise<object>} Result with new employee or error
     */
    async registerEmployee(employeeData) {
        try {
            // Generate unique code if not provided
            const code = employeeData.code || this.generateEmployeeCode();
            
            // Generate secure password if not provided
            const password = employeeData.password || Utils.generatePassword(10);

            const newEmployee = {
                code: code.toUpperCase(),
                name: employeeData.name.trim(),
                email: employeeData.email || null,
                password: password,
                face_descriptor: employeeData.faceDescriptor || null,
                is_admin: false,
                is_first_login: true
            };

            const { data, error } = await this.client
                .from(AppConfig.supabase.tables.employees)
                .insert(newEmployee)
                .select()
                .single();

            if (error) {
                // Check for unique constraint violation
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
                password: password // Send generated password to email service
            });

            return {
                success: true,
                employee: data,
                generatedPassword: password
            };

        } catch (error) {
            console.error('Registration error:', error);
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

    // ============================================
    // 👤 EMPLOYEE OPERATIONS
    // ============================================

    /**
     * Get employee by code
     * @param {string} code - Employee code
     * @returns {Promise<object|null>} Employee data or null
     */
    async getEmployeeByCode(code) {
        try {
            const { data, error } = await this.client
                .from(AppConfig.supabase.tables.employees)
                .select('*')
                .eq('code', code.toUpperCase().trim())
                .eq('is_deleted', false)
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Get employee error:', error);
            return null;
        }
    }

    /**
     * Get all employees (admin only)
     * @returns {Promise<Array>} Array of employees
     */
    async getAllEmployees() {
        try {
            const { data, error } = await this.client
                .from(AppConfig.supabase.tables.employees)
                .select('*')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error('Get all employees error:', error);
            return [];
        }
    }

    /**
     * Get total employees count
     * @returns {Promise<number>} Count
     */
    async getEmployeesCount() {
        try {
            const { count, error } = await this.client
                .from(AppConfig.supabase.tables.employees)
                .select('*', { count: 'exact', head: true })
                .eq('is_deleted', false);

            if (error) throw error;
            return count || 0;

        } catch (error) {
            console.error('Count error:', error);
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
            const { data, error } = await this.client
                .from(AppConfig.supabase.tables.employees)
                .update(updates)
                .eq('code', code.toUpperCase().trim())
                .select()
                .single();

            if (error) throw error;
            
            return { success: true, data };

        } catch (error) {
            console.error('Update employee error:', error);
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
            const { data: employee, error: verifyError } = await this.client
                .from(AppConfig.supabase.tables.employees)
                .select('*')
                .eq('code', code.toUpperCase().trim())
                .eq('password', currentPassword)
                .single();

            if (verifyError || !employee) {
                return {
                    success: false,
                    error: 'كلمة المرور الحالية غير صحيحة'
                };
            }

            // Update password
            const { error: updateError } = await this.client
                .from(AppConfig.supabase.tables.employees)
                .update({ 
                    password: newPassword,
                    is_first_login: false,
                    updated_at: new Date().toISOString()
                })
                .eq('code', code);

            if (updateError) throw updateError;

            return { success: true };

        } catch (error) {
            console.error('Change password error:', error);
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
            const employee = await this.getEmployeeByCode(code);
            
            if (!employee) {
                return {
                    success: false,
                    error: 'الكود غير موجود'
                };
            }

            if (!employee.email) {
                return {
                    success: false,
                    error: 'لا يوجد بريد إلكتروني مسجل لهذا الكود'
                };
            }

            // Generate new password
            const newPassword = Utils.generatePassword(10);

            // Update password in database
            await this.updateEmployee(code, { password: newPassword });

            // Send email with new password
            await this.sendPasswordResetEmail({
                code: code,
                name: employee.name,
                email: employee.email,
                password: newPassword
            });

            return { success: true };

        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                error: 'فشل في إرسال كلمة المرور الجديدة'
            };
        }
    }

    // ============================================
    // 📊 ATTENDANCE OPERATIONS
    // ============================================

    /**
     * Record attendance (check-in/check-out)
     * @param {object} attendanceData - Attendance record data
     * @returns {Promise<object>} Result
     */
    async recordAttendance(attendanceData) {
        try {
            // Validate attendance data
            const validation = validator.validateAttendanceData(attendanceData);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: 'بيانات الحضور غير صحيحة',
                    details: validation.errors
                };
            }

            // Prepare attendance record
            const record = {
                employee_code: attendanceData.employee_code.toUpperCase(),
                employee_name: attendanceData.employee_name,
                type: attendanceData.type, // 'حضور' or 'انصراف'
                location_link: attendanceData.locationLink || null,
                shift: attendanceData.shift || 'لم يتم التحديد',
                hours_worked: attendanceData.hoursWorked || null,
                overtime: attendanceData.overtime || '0 دقيقة',
                ip_address: await this.getClientIP(),
                user_agent: navigator.userAgent,
                gps_accuracy: attendanceData.gpsAccuracy || null,
                attendance_image_url: attendanceData.imageUrl || null
            };

            const { data, error } = await this.client
                .from(AppConfig.supabase.tables.attendance)
                .insert(record)
                .select()
                .single();

            if (error) throw error;

            // Send notification email
            await this.sendAttendanceAlert({
                ...record,
                datetime: Utils.formatDate(new Date(), 'datetime')
            });

            return {
                success: true,
                record: data
            };

        } catch (error) {
            console.error('Record attendance error:', error);
            return {
                success: false,
                error: 'فشل تسجيل الحضور',
                details: error.message
            };
        }
    }

    /**
     * Get today's attendance for employee
     * @param {string} employeeCode - Employee code
     * @returns {Promise<Array>} Today's records
     */
    async getTodayAttendance(employeeCode) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { data, error } = await this.client
                .from(AppConfig.supabase.tables.attendance)
                .select('*')
                .eq('employee_code', employeeCode.toUpperCase())
                .gte('created_at', today.toISOString())
                .lt('created_at', tomorrow.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error('Get today attendance error:', error);
            return [];
        }
    }

    /**
     * Get attendance history with date range
     * @param {string} employeeCode - Employee code
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} Attendance records
     */
    async getAttendanceHistory(employeeCode, startDate, endDate) {
        try {
            const { data, error } = await this.client
                .from(AppConfig.supabase.tables.attendance)
                .select('*')
                .eq('employee_code', employeeCode.toUpperCase())
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error('Get attendance history error:', error);
            return [];
        }
    }

    /**
     * Get monthly summary for employee
     * @param {string} employeeCode - Employee code
     * @param {number} month - Month (1-12)
     * @param {number} year - Year
     * @returns {object} Summary statistics
     */
    async getMonthlySummary(employeeCode, month, year) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const records = await this.getAttendanceHistory(
                employeeCode, 
                startDate, 
                endDate
            );

            // Calculate statistics
            let totalHours = 0;
            let totalOvertime = 0;
            let daysPresent = 0;
            let checkIns = 0;
            let checkOuts = 0;

            records.forEach(record => {
                if (record.type === 'حضور') {
                    checkIns++;
                    daysPresent++;
                } else {
                    checkOuts++;
                }

                // Parse hours
                const hours = parseFloat(record.hours_worked) || 0;
                totalHours += hours;

                // Parse overtime
                const overtimeMatch = record.overtime?.match(/[\d.]+/);
                const overtime = overtimeMatch ? parseFloat(overtimeMatch[0]) : 0;
                totalOvertime += overtime;
            });

            return {
                records,
                summary: {
                    totalRecords: records.length,
                    daysPresent,
                    totalHours: parseFloat(totalHours.toFixed(2)),
                    totalOvertime: parseFloat(totalOvertime.toFixed(2)),
                    averageHoursPerDay: daysPresent > 0 ? parseFloat((totalHours / daysPresent).toFixed(2)) : 0,
                    checkIns,
                    checkOuts
                }
            };

        } catch (error) {
            console.error('Monthly summary error:', error);
            return { records: [], summary: {} };
        }
    }

    // ============================================
    // 📧 EMAIL OPERATIONS (via Google Apps Script)
    // ============================================

    /**
     * Send new employee emails
     * @param {object} data - Employee data
     */
    async sendNewEmployeeEmails(data) {
        try {
            const response = await fetch(AppConfig.emailService.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'sendNewEmpEmails',
                    name: data.name,
                    code: data.code,
                    email: data.email || '',
                    password: data.password
                })
            });

            const result = await response.json();
            console.log('Email result:', result);
            return result.success;

        } catch (error) {
            console.error('Send email error:', error);
            return false;
        }
    }

    /**
     * Send attendance alert email
     * @param {object} data - Attendance data
     */
    async sendAttendanceAlert(data) {
        try {
            const response = await fetch(AppConfig.emailService.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'sendAttAlert',
                    ...data
                })
            });

            const result = await response.json();
            return result.success;

        } catch (error) {
            console.error('Send attendance alert error:', error);
            return false;
        }
    }

    /**
     * Send password reset email
     * @param {object} data - Reset data
     */
    async sendPasswordResetEmail(data) {
        try {
            const response = await fetch(AppConfig.emailService.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'sendForgotPw',
                    ...data
                })
            });

            const result = await response.json();
            return result.success;

        } catch (error) {
            console.error('Send password reset error:', error);
            return false;
        }
    }

    // ============================================
    // 🖼️ STORAGE OPERATIONS (Face Images)
    // ============================================

    /**
     * Upload face image to Supabase Storage
     * @param {string} base64Image - Base64 image string
     * @param {string} fileName - File name
     * @returns {Promise<string|null>} Public URL or null
     */
    async uploadFaceImage(base64Image, fileName) {
        try {
            // Convert base64 to blob
            const base64Response = await fetch(base64Image);
            const blob = await base64Response.blob();

            // Check file size
            if (blob.size > AppConfig.supabase.storage.maxFileSize) {
                throw new Error('File too large');
            }

            const filePath = `faces/${fileName}_${Date.now()}.jpg`;

            const { data, error } = await this.client.storage
                .from(AppConfig.supabase.storage.bucketName)
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { publicURL, error: urlError } = this.client.storage
                .from(AppConfig.supabase.storage.bucketName)
                .getPublicUrl(filePath);

            if (urlError) throw urlError;

            return publicURL;

        } catch (error) {
            console.error('Upload face image error:', error);
            return null;
        }
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================

    /**
     * Get client IP address (approximate)
     * @returns {Promise<string>} IP address
     */
    async getClientIP() {
        try {
            // Using a free IP service
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    }

    /**
     * Check connection status
     * @returns {boolean} Connected status
     */
    isConnectedToSupabase() {
        return this.isConnected && this.client !== null;
    }

    /**
     * Get current user
     * @returns {object|null} Current user object
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Execute query with retry logic
     * @param {Function} queryFn - Query function
     * @param {number} maxRetries - Max retry attempts
     * @returns {Promise<*>} Query result
     */
    async executeWithRetry(queryFn, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await queryFn();
            } catch (error) {
                console.warn(`Query attempt ${attempt + 1} failed:`, error.message);
                
                if (attempt === maxRetries - 1) throw error;
                
                // Exponential backoff
                await Utils.sleep(1000 * Math.pow(2, attempt));
            }
        }
    }
}

// Create global instance
const db = new SupabaseClient();

// Export for use in other modules
window.SupabaseClient = SupabaseClient;
window.db = db;
