/**
 * ============================================
 * 👨‍💼 AXENTRO ADMIN MANAGER v4.0
 * ✅ System Administration & Employee Management
 * ============================================
 */

class AdminManager {
    constructor() {
        this.employees = [];
        this.selectedEmployee = null;
        this.filters = {
            search: '',
            status: 'all',
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        
        this.init();
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize admin manager
     */
    init() {
        console.log('👨‍💼 Admin Manager initialized');
        
        // Only initialize if user is admin
        if (auth.isAdmin()) {
            this.setupAdminFeatures();
        }
    }

    /**
     * Setup admin-specific features and UI
     */
    setupAdminFeatures() {
        console.log('✅ Admin features enabled');
        
        // Add admin panel button to header (if not exists)
        this.addAdminPanelButton();
        
        // Load initial data
        this.loadDashboardStats();
    }

    /**
     * Add admin panel access button
     */
    addAdminPanelButton() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions || document.getElementById('adminPanelBtn')) return;

        const adminBtn = document.createElement('button');
        adminBtn.id = 'adminPanelBtn';
        adminBtn.className = 'icon-btn warning';
        adminBtn.title = 'لوحة التحكم';
        adminBtn.innerHTML = '<i class="fas fa-user-shield"></i>';
        adminBtn.addEventListener('click', () => this.openAdminPanel());
        
        headerActions.insertBefore(adminBtn, headerActions.firstChild);
    }

    // ============================================
    // 📊 DASHBOARD STATISTICS
    // ============================================

    /**
     * Load dashboard statistics for admin view
     */
    async loadDashboardStats() {
        try {
            const [totalEmployees, todayRecords] = await Promise.all([
                db.getEmployeesCount(),
                db.getTodayAttendance('ADMIN') // Get all records for admin
            ]);

            // Update stats display
            ui.animateStatValue('totalEmployeesStat', totalEmployees);

            console.log(`📊 Dashboard: ${totalEmployees} employees`);

        } catch (error) {
            console.error('Load dashboard stats error:', error);
        }
    }

    // ============================================
    // 👥 EMPLOYEE MANAGEMENT
    // ============================================

    /**
     * Load all employees list
     */
    async loadEmployees() {
        try {
            ui.showElementLoading('#employeesListContainer', 'جاري تحميل الموظفين...');
            
            this.employees = await db.getAllEmployees();
            
            this.renderEmployeesList();
            
            ui.hideElementLoading('#employeesListContainer');

        } catch (error) {
            console.error('Load employees error:', error);
            ui.showError('فشل تحميل قائمة الموظفين');
        }
    }

    /**
     * Filter and sort employees based on current filters
     * @returns {Array} Filtered and sorted employees
     */
    getFilteredEmployees() {
        let filtered = [...this.employees];

        // Apply search filter
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(emp => 
                emp.name.toLowerCase().includes(searchTerm) ||
                emp.code.toLowerCase().includes(searchTerm) ||
                (emp.email && emp.email.toLowerCase().includes(searchTerm))
            );
        }

        // Apply status filter
        switch (this.filters.status) {
            case 'active':
                filtered = filtered.filter(emp => !emp.is_deleted);
                break;
            case 'deleted':
                filtered = filtered.filter(emp => emp.is_deleted);
                break;
            case 'admins':
                filtered = filtered.filter(emp => emp.is_admin);
                break;
        }

        // Apply sorting
        filtered = Utils.sortBy(filtered, this.filters.sortBy, this.filters.sortOrder);

        return filtered;
    }

    /**
     * Render employees list in UI
     */
    renderEmployeesList() {
        const container = document.getElementById('employeesList');
        if (!container) return;

        const filtered = this.getFilteredEmployees();

        if (filtered.length === 0) {
            ui.showEmptyState(container, 'لا يوجد موظفون', 'fas fa-users');
            return;
        }

        container.innerHTML = filtered.map(emp => this.createEmployeeCard(emp)).join('');
        
        // Attach event listeners
        container.querySelectorAll('.employee-card').forEach(card => {
            card.addEventListener('click', () => this.selectEmployee(card.dataset.code));
        });
    }

    /**
     * Create employee card HTML
     * @param {object} emp - Employee data
     * @returns {string} HTML string
     */
    createEmployeeCard(emp) {
        const statusClass = emp.is_deleted ? 'deleted' : '';
        const adminBadge = emp.is_admin ? '<span class="badge badge-admin">👨‍💼 أدمن</span>' : '';
        const firstLoginBadge = emp.is_first_login ? '<span class="badge badge-warning">جديد</span>' : '';

        return `
            <div class="employee-card ${statusClass}" data-code="${emp.code}">
                <div class="employee-avatar">
                    ${emp.profile_image_url 
                        ? `<img src="${emp.profile_image_url}" alt="${emp.name}">`
                        : `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="employee-info">
                    <h4>${Utils.truncate(emp.name, 25)}</h4>
                    <p class="employee-code">${emp.code}</p>
                    <p class="employee-email">${emp.email || 'لا يوجد بريد'}</p>
                    <div class="employee-badges">
                        ${adminBadge}
                        ${firstLoginBadge}
                        ${emp.is_deleted ? '<span class="badge badge-danger">محذوف</span>' : ''}
                    </div>
                </div>
                <div class="employee-actions">
                    <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); admin.viewEmployee('${emp.code}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); admin.editEmployee('${emp.code}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Select an employee from the list
     * @param {string} code - Employee code
     */
    selectEmployee(code) {
        this.selectedEmployee = this.employees.find(emp => emp.code === code);
        
        // Highlight selected card
        document.querySelectorAll('.employee-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.code === code);
        });

        // Show details panel
        this.showEmployeeDetails(this.selectedEmployee);
    }

    /**
     * Show employee details panel
     * @param {object} emp - Employee data
     */
    showEmployeeDetails(emp) {
        if (!emp) return;

        const panel = document.getElementById('employeeDetailsPanel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="details-header">
                <h3>تفاصيل الموظف</h3>
                <button class="icon-btn" onclick="admin.closeEmployeeDetails()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="details-content">
                <div class="detail-avatar">
                    ${emp.profile_image_url 
                        ? `<img src="${emp.profile_image_url}" alt="${emp.name}">`
                        : `<i class="fas fa-user"></i>`
                    }
                </div>
                <h2>${emp.name}</h2>
                <p class="code">${emp.code}</p>
                
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">البريد الإلكتروني</span>
                        <span class="value">${emp.email || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">تاريخ التسجيل</span>
                        <span class="value">${Utils.formatDate(emp.created_at)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">آخر تحديث</span>
                        <span class="value">${Utils.formatDate(emp.updated_at)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">الحالة</span>
                        <span class="value">${emp.is_deleted ? 'محذوف' : 'نشط'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">نوع الحساب</span>
                        <span class="value">${emp.is_admin ? 'أدمن' : 'موظف'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">تسجيل أولي</span>
                        <span class="value">${emp.is_first_login ? 'نعم' : 'لا'}</span>
                    </div>
                </div>

                <div class="details-actions">
                    <button class="btn btn-primary" onclick="admin.editEmployee('${emp.code}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-warning" onclick="admin.resetPassword('${emp.code}')">
                        <i class="fas fa-key"></i> إعادة تعيين كلمة المرور
                    </button>
                    <button class="btn btn-danger" onclick="admin.deleteEmployee('${emp.code}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;

        panel.classList.remove('hidden');
    }

    /**
     * Close employee details panel
     */
    closeEmployeeDetails() {
        const panel = document.getElementById('employeeDetailsPanel');
        if (panel) {
            panel.classList.add('hidden');
        }
        this.selectedEmployee = null;
    }

    // ============================================
    // ✏️ EMPLOYEE CRUD OPERATIONS
    // ============================================

    /**
     * Open add new employee modal
     */
    async addNewEmployee() {
        const confirmed = await ui.showConfirmation({
            title: '➕ إضافة موظف جديد',
            message: 'سيتم فتح صفحة التسجيل للموظف الجديد',
            confirmText: 'فتح صفحة التسجيل',
            type: 'success'
        });

        if (confirmed) {
            ui.navigateTo('registerPage');
        }
    }

    /**
     * Edit existing employee
     * @param {string} code - Employee code
     */
    async editEmployee(code) {
        const emp = this.employees.find(e => e.code === code);
        if (!emp) return;

        // For now, show a simple edit form modal
        // In production, this would be a full form
        const newName = prompt('الاسم الجديد:', emp.name);
        
        if (newName && newName !== emp.name && newName.trim()) {
            const result = await db.updateEmployee(code, { name: newName.trim() });
            
            if (result.success) {
                ui.showSuccess('تم تحديث بيانات الموظف');
                await this.loadEmployees(); // Refresh list
            } else {
                ui.showError(result.error || 'فشل التحديث');
            }
        }
    }

    /**
     * Delete employee (soft delete)
     * @param {string} code - Employee code
     */
    async deleteEmployee(code) {
        const emp = this.employees.find(e => e.code === code);
        if (!emp) return;

        // Prevent deleting ADMIN account
        if (code === 'ADMIN') {
            ui.showError('لا يمكن حذف حساب الأدمن الرئيسي');
            return;
        }

        const confirmed = await ui.showConfirmation({
            title: '⚠️ تأكيد الحذف',
            message: `هل أنت متأكد من حذف الموظف "${emp.name}"؟\n\n⚠️ هذا الإجراء قابل للعكس.`,
            confirmText: 'نعم، احذف',
            cancelText: 'إلغاء',
            type: 'danger'
        });

        if (confirmed) {
            const result = await db.updateEmployee(code, { is_deleted: true });
            
            if (result.success) {
                ui.showSuccess('تم حذف الموظف بنجاح');
                this.closeEmployeeDetails();
                await this.loadEmployees(); // Refresh list
            } else {
                ui.showError(result.error || 'فشل الحذف');
            }
        }
    }

    /**
     * Reset employee password
     * @param {string} code - Employee code
     */
    async resetPassword(code) {
        const emp = this.employees.find(e => e.code === code);
        if (!emp) return;

        const confirmed = await ui.showConfirmation({
            title: '🔑 إعادة تعيين كلمة المرور',
            message: `سيتم إنشاء كلمة مرور جديدة لـ "${emp.name}" وإرسالها إلى بريده.`,
            confirmText: 'نعم، أعد التعيين',
            cancelText: 'إلغاء',
            type: 'warning'
        });

        if (confirmed) {
            ui.showInfo('جاري إرسال كلمة المرور الجديدة...');
            
            const result = await db.requestPasswordReset(code);
            
            if (result.success) {
                ui.showSuccess('تم إرسال كلمة المرور الجديدة ✓');
            } else {
                ui.showError(result.error || 'فشل في إرسال كلمة المرور');
            }
        }
    }

    // ============================================
    // 📈 REPORTS & ANALYTICS
    // ============================================

    /**
     * Generate attendance report for all employees
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     */
    async generateCompanyReport(startDate, endDate) {
        try {
            ui.showElementLoading('#reportContent', 'جاري إنشاء التقرير...');

            // Get all attendance records in date range
            const allRecords = [];
            
            for (const emp of this.employees) {
                if (emp.is_deleted || emp.is_admin) continue;
                
                const records = await db.getAttendanceHistory(
                    emp.code,
                    startDate,
                    endDate
                );
                
                allRecords.push(...records.map(r => ({ ...r, employeeName: emp.name })));
            }

            // Sort by date
            const sortedRecords = Utils.sortBy(allRecords, 'created_at', 'asc');

            // Calculate statistics
            const stats = {
                totalRecords: sortedRecords.length,
                totalCheckIns: sortedRecords.filter(r => r.type === 'حضور').length,
                totalCheckOuts: sortedRecords.filter(r => r.type === 'انصراف').length,
                uniqueEmployees: new Set(sortedRecords.map(r => r.employee_code)).size,
                averageHours: 0
            };

            // Calculate average hours
            const hoursArray = sortedRecords
                .filter(r => r.hours_worked)
                .map(r => parseFloat(r.hours_worked));
            
            if (hoursArray.length > 0) {
                stats.averageHours = (
                    hoursArray.reduce((a, b) => a + b, 0) / hoursArray.length
                ).toFixed(2);
            }

            // Display report
            this.displayReport(sortedRecords, stats);

            ui.hideElementLoading('#reportContent');

        } catch (error) {
            console.error('Generate report error:', error);
            ui.showError('فشل إنشاء التقرير');
            ui.hideElementLoading('#reportContent');
        }
    }

    /**
     * Display report data in UI
     * @param {Array} records - Attendance records
     * @param {object} stats - Statistics object
     */
    displayReport(records, stats) {
        const container = document.getElementById('reportData');
        if (!container) return;

        // Update statistics cards
        document.getElementById('reportTotalRecords') && 
            (document.getElementById('reportTotalRecords').textContent = stats.totalRecords);
        
        document.getElementById('reportTotalEmployees') &&
            (document.getElementById('reportTotalEmployees').textContent = stats.uniqueEmployees);
        
        document.getElementById('reportAverageHours') &&
            (document.getElementById('reportAverageHours').textContent = `${stats.averageHours} ساعة`);

        // Create table
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>الموظف</th>
                        <th>الكود</th>
                        <th>التاريخ</th>
                        <th>الحالة</th>
                        <th>الوردية</th>
                        <th>الساعات</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(record => `
                        <tr>
                            <td>${record.employee_name || '-'}</td>
                            <td>${record.employee_code}</td>
                            <td>${Utils.formatDate(record.created_at)}</td>
                            <td>
                                <span class="badge ${record.type === 'حضور' ? 'badge-in' : 'badge-out'}">
                                    ${record.type}
                                </span>
                            </td>
                            <td>${record.shift || '-'}</td>
                            <td>${record.hours_worked || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML || '<p class="empty-state">لا توجد سجلات</p>';
    }

    // ============================================
    // 🔔 NOTIFICATIONS & ALERTS
    // ============================================

    /**
     * Show system notification to admin
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(title, message, type = 'info') {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        const notification = document.createElement('div');
        notification.className = 'notification-item unread';
        
        const icons = {
            success: 'fa-check-circle text-success',
            error: 'fa-exclamation-circle text-danger',
            warning: 'fa-exclamation-triangle text-warning',
            info: 'fa-info-circle text-primary'
        };

        notification.innerHTML = `
            <div class="icon"><i class="fas ${icons[type] || icons.info}"></i></div>
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <small>${new Date().toLocaleTimeString('ar-EG')}</small>
            </div>
        `;

        notificationsList.insertBefore(notification, notificationsList.firstChild);

        // Update badge count
        this.updateNotificationBadge();

        // Auto-remove after some time (optional)
        setTimeout(() => {
            notification.classList.remove('unread');
        }, 5000);
    }

    /**
     * Update notification badge count
     */
    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        const unreadCount = document.querySelectorAll('.notification-item.unread').length;

        if (badge) {
            badge.textContent = unreadCount;
            badge.classList.toggle('hidden', unreadCount === 0);
        }
    }

    /**
     * Mark all notifications as read
     */
    markAllNotificationsRead() {
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
        });
        
        this.updateNotificationBadge();
        ui.showSuccess('تم تعيين الكل كمقروء');
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================

    /**
     * Open admin panel
     */
    openAdminPanel() {
        // This would open a full admin dashboard
        // For now, we'll navigate to a simple admin view
        console.log('Opening admin panel...');
        
        ui.showInfo('لوحة التحكم قيد التطوير');
        
        // Future: Navigate to dedicated admin page
        // ui.navigateTo('adminPage');
    }

    /**
     * Export data in various formats
     * @param {string} format - Export format
     * @param {Array} data - Data to export
     */
    exportData(format, data) {
        attendance.exportData(format, data);
    }

    /**
     * Search employees
     * @param {string} query - Search query
     */
    searchEmployees(query) {
        this.filters.search = query;
        this.renderEmployeesList();
    }

    /**
     * Sort employees by field
     * @param {string} field - Field to sort by
     */
    sortEmployees(field) {
        if (this.filters.sortBy === field) {
            // Toggle sort order
            this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.filters.sortBy = field;
            this.filters.sortOrder = 'asc';
        }
        
        this.renderEmployeesList();
    }

    /**
     * Get system health status
     * @returns {Promise<object>} Health status
     */
    async getSystemHealth() {
        return {
            databaseConnected: db.isConnectedToSupabase(),
            modelsLoaded: faceRecognition.areModelsLoaded(),
            cameraActive: faceRecognition.isCameraRunning(),
            knownFaces: faceRecognition.getKnownFacesCount(),
            totalEmployees: this.employees.length,
            timestamp: new Date().toISOString()
        };
    }
}

// Create global instance
const admin = new AdminManager();

// Export for use in other modules
window.AdminManager = AdminManager;
window.admin = admin;
