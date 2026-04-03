/**
 * ============================================
 * 👔 AXENTRO ADMIN PANEL v4.1 - ENHANCED
 * ✅ Employee Management & Admin Features
 * 🔒 محسّن مع Security Checks و Validation
 * ============================================
 */

class AdminManager {
    constructor() {
        this.isAdminMode = false;
        this.selectedEmployee = null;
        this.employeesList = [];
        
        console.log('👔 Admin Manager initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize admin features
     */
    init() {
        this.checkAdminAccess();
        console.log('✅ Admin Manager ready');
    }

    /**
     * Setup admin features if user is admin
     */
    setupAdminFeatures() {
        try {
            // Check if user is admin
            if (!this.canAccessAdmin()) {
                console.warn('⚠️ User is not admin - hiding admin features');
                this.hideAdminElements();
                return;
            }

            this.isAdminMode = true;

            // Show admin-specific UI elements
            this.showAdminElements();

            // Load employees list
            this.loadEmployeesList();

            // Setup admin event listeners
            this.setupAdminEventListeners();

            console.log('👔 Admin mode activated');

        } catch (error) {
            console.error('❌ Admin setup error:', error);
        }
    }

    /**
     * Check if current user can access admin features
     * @returns {boolean}
     */
    canAccessAdmin() {
        return typeof auth !== 'undefined' && auth.isAdmin();
    }

    /**
     * Show admin-only UI elements
     */
    showAdminElements() {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = '';
            el.classList.remove('hidden');
        });
    }

    /**
     * Hide admin-only UI elements
     */
    hideAdminElements() {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
            el.classList.add('hidden');
        });
    }

    // ============================================
    // 👥 EMPLOYEE MANAGEMENT
    // ============================================

    /**
     * Load all employees from database
     */
    async loadEmployeesList() {
        try {
            if (typeof db === 'undefined' || typeof db.getAllEmployees !== 'function') {
                throw new Error('Database not available');
            }

            const employees = await db.getAllEmployees();
            
            this.employeesList = employees || [];
            
            // Update UI with employee count
            this.updateEmployeesCount(employees.length);

            // Populate employees table/list
            this.populateEmployeesTable(employees);

            console.log(`📋 Loaded ${employees.length} employees`);

        } catch (error) {
            console.error('❌ Load employees error:', error);
            this.employeesList = [];
        }
    }

    /**
     * Populate employees management table
     * @param {Array} employees - Array of employee objects
     */
    populateEmployeesTable(employees) {
        const tbody = document.getElementById('adminEmployeesTableBody');
        
        if (!tbody) return; // Not on admin page

        tbody.innerHTML = '';

        if (!employees || !employees.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
                        <i class="fas fa-users-slash"></i>
                        <p>لا يوجد موظفين مسجلين</p>
                    </td>
                </tr>
            `;
            return;
        }

        employees.forEach((employee, index) => {
            const row = document.createElement('tr');
            
            // Format dates
            const createdDate = Utils.formatDate(employee.created_at, 'date');
            const lastLogin = employee.last_login ? 
                             Utils.formatDate(employee.last_login, 'datetime') : 
                             'لم يسجل دخول';

            // Status badge
            const statusClass = employee.is_deleted ? 
                                'badge-danger' : 
                                (employee.is_admin ? 'badge-primary' : 'badge-success');
            const statusText = employee.is_deleted ? 
                               'محذوف' : 
                               (employee.is_admin ? 'أدمن' : 'نشط');

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${employee.code}</strong></td>
                <td>${employee.name}</td>
                <td>${employee.email || '-'}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${createdDate}</td>
                <td>${lastLogin}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-outline" onclick="admin.viewEmployee('${employee.code}')" title="عرض">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="admin.editEmployee('${employee.code}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!employee.is_admin ? `
                        <button class="btn btn-sm btn-danger" onclick="admin.confirmDeleteEmployee('${employee.code}', '${employee.name}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    /**
     * Update employees count display
     * @param {number} count - Total count
     */
    updateEmployeesCount(count) {
        const countEl = document.getElementById('totalEmployeesStat');
        if (countEl) {
            countEl.textContent = count;
        }
    }

    // ============================================
    // 👁️ VIEW EMPLOYEE DETAILS
    // ============================================

    /**
     * View employee details
     * @param {string} code - Employee code
     */
    async viewEmployee(code) {
        try {
            const employee = await db.getEmployeeByCode(code);
            
            if (!employee) {
                throw new Error('الموظف غير موجود');
            }

            this.selectedEmployee = employee;

            // Show details modal or panel
            this.showEmployeeDetailsModal(employee);

        } catch (error) {
            console.error('❌ View employee error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(error.message);
            }
        }
    }

    /**
     * Display employee details in modal
     * @param {object} employee - Employee data
     */
    showEmployeeDetailsModal(employee) {
        const modalContent = `
            <div class="employee-details">
                <div class="detail-header">
                    <div class="avatar">
                        ${employee.profile_image_url ? 
                          `<img src="${employee.profile_image_url}" alt="${employee.name}">` :
                          `<div class="avatar-placeholder">${employee.name.charAt(0)}</div>`
                        }
                    </div>
                    <h3>${employee.name}</h3>
                    <span class="code">${employee.code}</span>
                </div>

                <div class="details-grid">
                    <div class="detail-item">
                        <label>البريد الإلكتروني</label>
                        <value>${employee.email || 'غير مسجل'}</value>
                    </div>
                    <div class="detail-item">
                        <label>تاريخ التسجيل</label>
                        <value>${Utils.formatDate(employee.created_at, 'full')}</value>
                    </div>
                    <div class="detail-item">
                        <label>آخر تسجيل دخول</label>
                        <value>${employee.last_login ? Utils.formatDate(employee.last_login, 'full') : 'لم يسجل بعد'}</value>
                    </div>
                    <div class="detail-item">
                        <label>الحالة</label>
                        <value>
                            <span class="badge ${employee.is_deleted ? 'badge-danger' : 'badge-success'}">
                                ${employee.is_deleted ? 'محذوف' : 'نشط'}
                            </span>
                        </value>
                    </div>
                    <div class="detail-item">
                        <label>نوع الحساب</label>
                        <value>
                            <span class="badge ${employee.is_admin ? 'badge-primary' : 'badge-secondary'}">
                                ${employee.is_admin ? 'مدير نظام' : 'موظف'}
                            </span>
                        </value>
                    </div>
                    <div class="detail-item">
                        <label>تغيير كلمة المرور</label>
                        <value>${employee.is_first_login ? 'مطلوب' : 'تم التغيير'}</value>
                    </div>
                </div>

                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="admin.editEmployee('${employee.code}')">
                        <i class="fas fa-edit"></i> تعديل البيانات
                    </button>
                    <button class="btn btn-outline" onclick="admin.viewEmployeeAttendance('${employee.code}')">
                        <i class="fas fa-chart-line"></i> سجل الحضور
                    </button>
                    ${!employee.is_admin ? `
                        <button class="btn btn-danger" onclick="admin.confirmDeleteEmployee('${employee.code}', '${employee.name}')">
                            <i class="fas fa-trash"></i> حذف الموظف
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        // Show in modal (if modal system exists)
        if (typeof ui !== 'undefined' && ui.showConfirmation) {
            // For now, just log it - you can implement a custom modal
            console.log('📋 Employee Details:', employee);
            
            if (typeof ui !== 'undefined' && ui.showInfo) {
                ui.showInfo(`عرض بيانات: ${employee.name}`);
            }
        }
    }

    // ============================================
    // ✏️ EDIT EMPLOYEE
    // ============================================

    /**
     * Open edit form for employee
     * @param {string} code - Employee code
     */
    async editEmployee(code) {
        try {
            const employee = await db.getEmployeeByCode(code);
            
            if (!employee) {
                throw new Error('الموظف غير موجود');
            }

            this.selectedEmployee = employee;

            // Show edit form (implementation depends on your UI)
            this.showEditForm(employee);

        } catch (error) {
            console.error('❌ Edit employee error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(error.message);
            }
        }
    }

    /**
     * Show edit form populated with employee data
     * @param {object} employee - Employee data
     */
    showEditForm(employee) {
        // This would typically open a modal or navigate to edit page
        // For now, we'll use a confirmation dialog as placeholder
        
        const formHTML = `
            <form id="editEmployeeForm" class="auth-form">
                <div class="input-group">
                    <label>الاسم</label>
                    <input type="text" id="editName" value="${employee.name}" required>
                </div>
                <div class="input-group">
                    <label>البريد الإلكتروني</label>
                    <input type="email" id="editEmail" value="${employee.email || ''}">
                </div>
                <div class="input-group">
                    <label>كلمة السر الجديدة (اتركها فارغة للإبقاء)</label>
                    <input type="password" id="editPassword" placeholder="كلمة سر جديدة">
                </div>
                <div class="checkbox-wrapper">
                    <input type="checkbox" id="editIsAdmin" ${employee.is_admin ? 'checked' : ''}>
                    <span>صلاحيات المدير</span>
                </div>
            </form>
        `;

        console.log('📝 Edit form for:', employee.name);
        
        if (typeof ui !== 'undefined' && ui.showInfo) {
            ui.showInfo(`فتح نموذج تعديل: ${employee.name}`);
        }
    }

    /**
     * Save edited employee data
     * @param {object} updatedData - Updated fields
     */
    async saveEmployee(updatedData) {
        try {
            if (!this.selectedEmployee) {
                throw new Error('لم يتم اختيار موظف');
            }

            // Validate required fields
            if (!updatedData.name || updatedData.name.trim().length < 3) {
                throw new Error('الاسم مطلوب ويجب أن يكون 3 أحرف على الأقل');
            }

            // Prepare update object
            const updates = {
                name: updatedData.name.trim(),
                email: updatedData.email?.trim() || null,
                updated_at: new Date().toISOString()
            };

            // Only update password if provided
            if (updatedData.password && updatedData.password.length >= 4) {
                updates.password = updatedData.password;
                updates.is_first_login = false;
            }

            // Update admin status (only if current user is super admin)
            if (updatedData.hasOwnProperty('isAdmin') && auth.getCurrentUser()?.code === 'ADMIN') {
                updates.is_admin = updatedData.isAdmin;
            }

            // Save to database
            const result = await db.updateEmployee(this.selectedEmployee.code, updates);

            if (result.success) {
                if (typeof ui !== 'undefined' && ui.showSuccess) {
                    ui.showSuccess('✅ تم تحديث بيانات الموظف بنجاح');
                }

                // Refresh employees list
                await this.loadEmployeesList();
                
                // Clear selection
                this.selectedEmployee = null;

            } else {
                throw new Error(result.error || 'فشل التحديث');
            }

        } catch (error) {
            console.error('❌ Save employee error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(error.message);
            }
        }
    }

    // ============================================
    // 🗑️ DELETE EMPLOYEE
    // ============================================

    /**
     * Confirm and delete employee
     * @param {string} code - Employee code
     * @param {string} name - Employee name (for display)
     */
    async confirmDeleteEmployee(code, name) {
        try {
            // Prevent self-deletion
            if (typeof auth !== 'undefined' && auth.getUserCode() === code) {
                throw new Error('لا يمكنك حذف حسابك الخاص');
            }

            // Prevent deletion of other admins (unless super admin)
            const employee = await db.getEmployeeByCode(code);
            if (employee?.is_admin && auth.getUserCode() !== 'ADMIN') {
                throw new Error('لا يمكنك حذف حساب مدير آخر');
            }

            // Show confirmation dialog
            const confirmed = await ui.showConfirmation({
                title: '⚠️ تأكيد الحذف',
                message: `
                    <div style="text-align: center;">
                        <p style="margin-bottom: 15px;">هل أنت متأكد من حذف الموظف:</p>
                        <strong style="font-size: 1.2em; color: #ef4444;">${name}</strong>
                        <p style="color: #64748b; margin-top: 10px; font-size: 0.9em;">
                            (الكود: ${code})
                        </p>
                        <p style="color: #dc2626; margin-top: 15px; font-weight: bold;">
                            ⚠️ هذا الإجراء لا يمكن التراجع عنه!
                        </p>
                    </div>
                `,
                confirmText: 'نعم، احذف',
                cancelText 'إلغاء',
                type: 'danger'
            });

            if (confirmed) {
                await this.deleteEmployee(code);
            }

        } catch (error) {
            console.error('❌ Confirm delete error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(error.message);
            }
        }
    }

    /**
     * Delete employee from database (soft delete)
     * @param {string} code - Employee code to delete
     */
    async deleteEmployee(code) {
        try {
            const result = await db.deleteEmployee(code);

            if (result.success) {
                if (typeof ui !== 'undefined' && ui.showSuccess) {
                    ui.showSuccess('🗑️ تم حذف الموظف بنجاح');
                }

                // Refresh list
                await this.loadEmployeesList();

            } else {
                throw new Error(result.error || 'فشل الحذف');
            }

        } catch (error) {
            console.error('❌ Delete employee error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(error.message);
            }
        }
    }

    // ============================================
    // 📊 ADMIN STATISTICS & REPORTS
    // ============================================

    /**
     * Load admin dashboard statistics
     */
    async loadAdminStats() {
        try {
            if (!this.canAccessAdmin()) return;

            const stats = await db.getSystemStats();

            // Update stat displays
            this.updateStatDisplay('adminTotalEmployees', stats.totalEmployees);
            this.updateStatDisplay('adminTodayCheckIns', stats.todayCheckIns);
            this.updateStatDisplay('adminTodayCheckOuts', stats.todayCheckOuts);

        } catch (error) {
            console.error('❌ Load admin stats error:', error);
        }
    }

    /**
     * Update stat display element
     * @param {string} elementId - Element ID
     * @param {*} value - Value to display
     */
    updateStatDisplay(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = value;
        }
    }

    /**
     * View employee attendance history
     * @param {string} code - Employee code
     */
    async viewEmployeeAttendance(code) {
        try {
            const employee = await db.getEmployeeByCode(code);
            
            if (!employee) {
                throw new Error('الموظف غير موجود');
            }

            // Navigate to reports page filtered by this employee
            // Implementation depends on your routing
            
            if (typeof ui !== 'undefined' && ui.showInfo) {
                ui.showInfo(`عرض سجل حضور: ${employee.name}`);
            }

            console.log(`📊 Viewing attendance for: ${employee.name}`);

        } catch (error) {
            console.error('❌ View attendance error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(error.message);
            }
        }
    }

    // ============================================
    // ⚙️ ADMIN SETTINGS
    // ============================================

    /**
     * Load admin settings
     */
    async loadSettings() {
        // Implement settings loading from database or config
        console.log('⚙️ Loading admin settings...');
    }

    /**
     * Save admin settings
     * @param {object} settings - Settings object
     */
    async saveSettings(settings) {
        try {
            // Validate settings
            // Save to database/config
            console.log('💾 Saving settings:', settings);
            
            if (typeof ui !== 'undefined' && ui.showSuccess) {
                ui.showSuccess('✅ تم حفظ الإعدادات');
            }

        } catch (error) {
            console.error('❌ Save settings error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError('فشل حفظ الإعدادات');
            }
        }
    }

    // ============================================
    // 🔧 UTILITY METHODS
    // ============================================

    /**
     * Check admin access and redirect if not authorized
     */
    checkAdminAccess() {
        if (typeof auth === 'undefined' || !this.canAccessAdmin()) {
            console.warn('⚠️ Access denied - Not an admin user');
            return false;
        }
        return true;
    }

    /**
     * Search employees by name or code
     * @param {string} query - Search query
     * @returns {Array} Filtered results
     */
    searchEmployees(query) {
        if (!query || !this.employeesList.length) return [];

        const searchTerm = query.toLowerCase().trim();

        return this.employeesList.filter(emp => 
            emp.name.toLowerCase().includes(searchTerm) ||
            emp.code.toLowerCase().includes(searchTerm) ||
            (emp.email && emp.email.toLowerCase().includes(searchTerm))
        );
    }

    /**
     * Filter employees by status
     * @param {string} status - Status filter ('active', 'deleted', 'admin', 'all')
     * @returns {Array} Filtered employees
     */
    filterEmployees(status) {
        switch (status) {
            case 'active':
                return this.employeesList.filter(emp => !emp.is_deleted);
            case 'deleted':
                return this.employeesList.filter(emp => emp.is_deleted);
            case 'admin':
                return this.employeesList.filter(emp => emp.is_admin);
            case 'all':
            default:
                return this.employeesList;
        }
    }

    /**
     * Export employees list to CSV
     */
    exportEmployeesList() {
        if (!this.employeesList.length) {
            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('لا يوجد موظفين للتصدير');
            }
            return;
        }

        const exportData = this.employeesList.map(emp => ({
            'الكود': emp.code,
            'الاسم': emp.name,
            'البريد': emp.email || '-',
            'نوع الحساب': emp.is_admin ? 'مدير' : 'موظف',
            'الحالة': emp.is_deleted ? 'محذوف' : 'نشط',
            'تاريخ التسجيل': Utils.formatDate(emp.created_at, 'date')
        }));

        Utils.exportToCSV(exportData, `قائمة_الموظفين_${Utils.formatDate(new Date(), 'date')}.csv`);

        if (typeof ui !== 'undefined' && ui.showSuccess) {
            ui.showSuccess('✅ تم تصدير قائمة الموظفين');
        }
    }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================

/**
 * Global admin instance
 */
let admin;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    admin = new AdminManager();
    admin.init();
    
    console.log('👔 Admin module loaded');
});

console.log('✅ admin.js v4.1 loaded successfully');
