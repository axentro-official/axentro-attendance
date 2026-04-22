/**
 * ============================================
 * 👔 AXENTRO ADMIN PANEL v4.2 - COMPLETE
 * ✅ Employee Management & Admin Features
 * 🔒 Enhanced with Face Verification for Security
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

    init() {
        this.checkAdminAccess();
        this.bindAdminUi();
        console.log('✅ Admin Manager ready');
    }

    bindAdminUi() {
        const form = document.getElementById('addEmployeeModalForm');
        const searchInput = document.getElementById('adminSearchInput');

        if (form && !form.dataset.bound) {
            form.addEventListener('submit', (e) => this.handleAddEmployeeForm(e));
            form.dataset.bound = '1';
        }

        if (searchInput && !searchInput.dataset.bound) {
            searchInput.addEventListener('input', () => {
                this.populateEmployeesTable(this.searchEmployees(searchInput.value));
            });
            searchInput.dataset.bound = '1';
        }
    }

    checkAdminAccess() {
        if (!this.canAccessAdmin()) {
            console.warn('⚠️ User is not admin - hiding admin features');
            this.hideAdminElements();
        } else {
            this.isAdminMode = true;
            this.showAdminElements();
        }
    }

    canAccessAdmin() {
        return window.user?.role === 'admin' || window.user?.isAdmin === true || 
               (typeof auth !== 'undefined' && auth?.isAdmin?.());
    }

    showAdminElements() {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = '';
            el.classList.remove('hidden');
        });
    }

    hideAdminElements() {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
            el.classList.add('hidden');
        });
    }

    // ============================================
    // 👥 EMPLOYEE MANAGEMENT
    // ============================================

    async loadEmployeesList() {
        try {
            if (typeof db === 'undefined') {
                throw new Error('Database not available');
            }

            const employees = await db.getAllEmployees();
            this.employeesList = Array.isArray(employees) ? employees : [];

            const count = this.employeesList.length;
            const countEl = document.getElementById('totalEmployeesStat');
            const adminTotalEmp = document.getElementById('adminTotalEmp');
            if (countEl) countEl.textContent = count;
            if (adminTotalEmp) adminTotalEmp.textContent = count;

            this.populateEmployeesTable(this.employeesList);
            await this.updateDashboardStats();

            console.log(`📋 Loaded ${count} employees`);
        } catch (error) {
            console.error('❌ Load employees error:', error);
            this.employeesList = [];
            this.populateEmployeesTable([]);
        }
    }

    populateEmployeesTable(employees) {
        const tbody = document.getElementById('adminEmployeesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!employees || !employees.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; color:#64748b; padding:30px;">
                        لا يوجد موظفين مسجلين
                    </td>
                </tr>
            `;
            return;
        }

        employees.forEach((employee, index) => {
            const row = document.createElement('tr');
            const createdDate = employee.created_at ? new Date(employee.created_at).toLocaleDateString('ar-EG', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            }) : '-';

            let statusClass = 'badge-success', statusText = 'نشط';
            if (employee.is_deleted) {
                statusClass = 'badge-danger';
                statusText = 'محذوف';
            } else if (employee.is_admin) {
                statusClass = 'badge-primary';
                statusText = 'أدمن';
            }

            row.innerHTML = `
                <td style="font-weight:bold;">${index + 1}</td>
                <td style="color:#3b82f6;font-weight:bold;font-family:monospace;">${employee.code || '-'}</td>
                <td><strong>${employee.name || '-'}</strong></td>
                <td>${employee.email || '-'}</td>
                <td><span class="${statusClass}" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;display:inline-block;">${statusText}</span></td>
                <td style="font-size:12px;color:#94a3b8;">${createdDate}</td>
                <td>
                    ${!employee.is_admin ? `
                    <button class="btn btn-sm btn-outline" onclick="openEmployeeActionsModal('${employee.code}', '${(employee.name || '').replace(/'/g, "&#39;")}')" title="إعدادات الموظف" style="margin:2px;">
                        <i class="fas fa-gear"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminDeleteEmp('${employee.code}', '${(employee.name || '').replace(/'/g, "&#39;")}')" title="حذف الموظف" style="margin:2px;">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : '<span style="color:#64748b;font-size:11px;">—</span>'}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async updateDashboardStats() {
        const stats = await this.getDashboardStats();
        if (!stats) return;
        const mappings = {
            adminTotalEmp: stats.totalEmployees,
            adminTodayCheckIns: stats.todayCheckIns,
            adminTodayCheckOuts: stats.todayCheckOuts,
            adminNewThisMonth: stats.registeredThisMonth
        };
        Object.entries(mappings).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value ?? 0;
        });
    }

    async refreshData() {
        await this.loadEmployeesList();
        showToast?.('تم تحديث بيانات لوحة التحكم', 'success');
    }

    exportEmployeesList() {
        try {
            const data = this.employeesList.map((emp, index) => ({
                index: index + 1,
                code: emp.code || '',
                name: emp.name || '',
                email: emp.email || '',
                status: emp.is_admin ? 'أدمن' : (emp.is_deleted ? 'محذوف' : 'نشط'),
                created_at: emp.created_at || ''
            }));
            if (!data.length) throw new Error('لا توجد بيانات للتصدير');
            Utils.exportToCSV(data, `employees-list-${new Date().toISOString().slice(0,10)}.csv`);
            showToast?.('تم تصدير قائمة الموظفين', 'success');
        } catch (error) {
            console.error('Export employee list error:', error);
            showToast?.(error.message || 'فشل تصدير القائمة', 'error');
        }
    }

    openAddEmployeeModal() {
        const modal = document.getElementById('addEmployeeModal');
        const form = document.getElementById('addEmployeeModalForm');
        form?.reset?.();
        if (modal) {
            if (typeof ui !== 'undefined' && ui?.openModal) ui.openModal('addEmployeeModal');
            else modal.classList.add('active');
            modal.style.display = '';
        }
    }

    openEmployeeActionsModal(code, name) {
        window.selectedEmployeeAdminAction = { code, name };
        const nameEl = document.getElementById('employeeActionsName');
        const codeEl = document.getElementById('employeeActionsCode');
        if (nameEl) nameEl.textContent = name || 'الموظف';
        if (codeEl) codeEl.textContent = code || '-';
        if (typeof ui !== 'undefined' && ui?.openModal) ui.openModal('employeeActionsModal');
    }

    closeAddEmployeeModal() {
        const modal = document.getElementById('addEmployeeModal');
        if (modal) {
            if (typeof ui !== 'undefined' && ui?.closeModal) ui.closeModal('addEmployeeModal');
            else modal.classList.remove('active');
            modal.style.display = '';
        }
    }

    async handleAddEmployeeForm(event) {
        event.preventDefault();
        const name = document.getElementById('newEmpName')?.value?.trim();
        const email = document.getElementById('newEmpEmail')?.value?.trim() || null;
        if (!name) {
            showToast?.('الاسم الكامل مطلوب', 'error');
            return;
        }
        const submitBtn = event.submitter || event.target.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        try {
            const result = await db.createEmployee({ name, email });
            if (!result?.success) throw new Error(result?.error || 'فشل إنشاء الحساب');
            const successMessage = email
                ? `تم إنشاء الموظف بنجاح، وتم إرسال الكود وكلمة المرور المؤقتة إلى البريد: ${email}`
                : `تم إنشاء الموظف بنجاح. الكود: ${result.employee_code || '-'}`;
            showToast?.(successMessage, 'success');
            this.closeAddEmployeeModal();
            await this.loadEmployeesList();
        } catch (error) {
            console.error('Add employee error:', error);
            showToast?.(error.message || 'فشل إنشاء الموظف', 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    updateEmployeesCount(count) {
        const countEl = document.getElementById('totalEmployeesStat');
        if (countEl) countEl.textContent = count;
    }

    // ============================================
    // 👁️ VIEW EMPLOYEE DETAILS
    // ============================================

    async viewEmployee(code) {
        try {
            if (typeof db === 'undefined') throw new Error('Database not available');

            const { data: employee, error } = await db.from('employees')
                .select('*')
                .eq('code', code)
                .single();

            if (error || !employee) throw new Error('الموظف غير موجود');

            this.selectedEmployee = employee;
            
            // Show details modal or panel
            this.showEmployeeDetailsModal(employee);

        } catch (error) {
            console.error('❌ View employee error:', error);
            showToast?.(error.message || 'حدث خطأ', 'error');
        }
    }

    showEmployeeDetailsModal(employee) {
        // This would typically open a modal with full details
        console.log('📋 Employee Details:', employee);
        
        if (typeof ui !== 'undefined' && ui.showInfo) {
            ui.showInfo(`عرض بيانات: ${employee.name}`);
        }
    }

    // ============================================
    // 🎯 ADMIN OPERATIONS WITH FACE VERIFICATION (من الكود القديم)
    // ============================================

    async handleAdminVerification(descriptor) {
        if (!descriptor) {
            playSound?.('faceid-error');
            showToast?.('فشل استخراج البصمة', 'error');
            closeCamera?.();
            return;
        }

        if (!window.sessionDescriptor) {
            playSound?.('faceid-error');
            showToast?.('لا توجد بصمة أدمن مسجلة!', 'error');
            closeCamera?.();
            return;
        }

        // Verify admin face matches
        const distance = typeof euclideanDistance === 'function' ?
            euclideanDistance(descriptor, window.sessionDescriptor) :
            this.euclideanDistance(descriptor, window.sessionDescriptor);

        const threshold = AppConfig?.security?.adminVerification?.matchThreshold || 0.55;

        if (distance >= threshold) {
            // Admin face doesn't match!
            playSound?.('faceid-error');
            showMatchResult?.(false);
            showToast?.('وجه الأدمن غير مطابق! - انتحال هوية مرفوض', 'error');
            setCamStatus?.('<i class="fas fa-ban" style="color:#ef4444;"></i> انتحال هوية مرفوض!');
            faceRecognition?.restartCamLoop();
            return;
        }

        // Admin face verified!
        showMatchResult?.(true);
        setCamStatus?.('<i class="fas fa-check-circle" style="color:#10b981;"></i> تم التحقق من هوية الأدمن ✓');

        // Now perform the requested operation
        await this.executeVerifiedOperation();
    }

    async executeVerifiedOperation() {
        const targetEmp = window.targetEmpForAdmin;
        
        if (!targetEmp) {
            closeCamera?.();
            return;
        }

        try {
            if (typeof db === 'undefined') throw new Error('Database not available');

            if (targetEmp.type === 'حذف موظف') {
                await this.deleteEmployeeWithVerification(targetEmp);
            } else if (targetEmp.type === 'حضور' || targetEmp.type === 'انصراف') {
                await this.recordManualAttendance(targetEmp);
            } else if (targetEmp.type === 'تغيير كلمة السر') {
                const newPassword = await ui?.showPrompt?.({
                    title: 'تغيير كلمة سر الموظف',
                    message: `أدخل كلمة السر الجديدة للموظف ${targetEmp.name}.`,
                    placeholder: 'كلمة السر الجديدة',
                    confirmText: 'حفظ',
                    cancelText: 'إلغاء',
                    type: 'warning',
                    inputType: 'password',
                    errorMessage: 'كلمة السر الجديدة مطلوبة'
                });
                if (!newPassword) { closeCamera?.(); return; }
                const result = await db.adminChangeEmployeePassword(targetEmp.code, String(newPassword).trim());
                if (!result?.success) throw new Error(result?.error || 'فشل تغيير كلمة السر');
                playSound?.('faceid-success');
                showToast?.(`تم تغيير كلمة سر ${targetEmp.name} بنجاح`, 'success');
                closeCamera?.();
            } else if (targetEmp.type === 'تحديث بصمة الوجه') {
                closeCamera?.();
                window.faceUpdateTargetUser = { role: 'employee', code: targetEmp.code, name: targetEmp.name };
                window.updateFaceMode = false;
                window.attMode = false;
                window.adminVerifyMode = false;
                window.firstTimeSetupMode = false;
                window.adminResetFaceMode = true;
                await openCamera?.();
            }

        } catch(e) {
            console.error('❌ Verified operation error:', e);
            playSound?.('faceid-error');
            showToast?.('فشل تنفيذ العملية', 'error');
            faceRecognition?.restartCamLoop();
        }
    }

    async deleteEmployeeWithVerification(targetEmp) {
        try {
            const result = await db.updateEmployee(targetEmp.code, { is_deleted: true });
            if (!result?.success) throw new Error(result?.error || 'فشل حذف الموظف');

            try {
                if (typeof db !== 'undefined' && db.storage) {
                    await db.storage.from('faces').remove([
                        `${targetEmp.code}_face.jpg`,
                        `employee_${targetEmp.code}_face.jpg`,
                        `${targetEmp.code}.jpg`
                    ]);
                }
            } catch(storageError) {
                console.warn('⚠️ Could not delete storage image:', storageError.message);
            }

            playSound?.('faceid-success');
            showToast?.(`تم حذف ${targetEmp.name} بنجاح`, 'success');

            setTimeout(async () => {
                closeCamera?.();
                if (typeof loadEmployees === 'function') {
                    await loadEmployees();
                } else if (typeof attendance !== 'undefined') {
                    await attendance.loadEmployees();
                }
            }, 800);
        } catch(e) {
            console.error('❌ Delete employee error:', e);
            playSound?.('faceid-error');
            showToast?.(e.message || 'فشل حذف الموظف', 'error');
            faceRecognition?.restartCamLoop();
        }
    }

    async recordManualAttendance(targetEmp) {
        try {
            if (typeof attendance !== 'undefined' && attendance.getCurrentLocation) {
                await attendance.getCurrentLocation();
            }

            const result = await db.recordAttendanceSecure({
                employee_code: targetEmp.code,
                type: targetEmp.type,
                shift: 'تسجيل يدوي بواسطة الأدمن',
                location_link: window.currentLoc || null,
                latitude: window.currentLat ?? null,
                longitude: window.currentLon ?? null,
                gps_accuracy: window.currentAccuracy ?? null,
                face_verified: true
            });

            if (!result?.success) {
                throw new Error(result?.error || 'فشل التسجيل اليدوي');
            }

            playSound?.('faceid-success');
            showToast?.(`تم تسجيل ${targetEmp.type} لـ ${targetEmp.name} بنجاح`, 'success');

            setTimeout(async () => {
                closeCamera?.();
                if (typeof loadEmployees === 'function') {
                    await loadEmployees();
                }
            }, 800);
        } catch(e) {
            console.error('❌ Manual attendance error:', e);
            playSound?.('faceid-error');
            showToast?.(e.message || 'فشل التسجيل اليدوي', 'error');
            faceRecognition?.restartCamLoop();
        }
    }

    // ============================================
    // 🔧 PASSWORD MANAGEMENT (للأدمن)
    // ============================================

    async changeEmployeePassword(code, newPassword) {
        try {
            if (typeof db === 'undefined') throw new Error('Database not available');
            const result = await db.adminChangeEmployeePassword(code, newPassword);
            if (!result?.success) throw new Error(result?.error || 'فشل تغيير كلمة السر');
            playSound?.('login-success');
            showToast?.('تم تغيير كلمة سر الموظف بنجاح', 'success');
            return true;
        } catch (e) {
            console.error('❌ Password change error:', e);
            playSound?.('login-error');
            showToast?.(e.message || 'فشل تغيير كلمة السر', 'error');
            return false;
        }
    }

    async resetEmployeePassword(code) {
        // Generate random password
        const tempPass = Math.random().toString(36).slice(-8);
        
        const success = await this.changeEmployeePassword(code, tempPass);
        
        if (success) {
            // Send email notification
            if (AppConfig?.emailService?.url) {
                try {
                    const { data: emp } = await db.from('employees')
                        .select('name, email')
                        .eq('code', code)
                        .single();

                    if (emp) {
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
                } catch(emailError) {
                    console.warn('Could not send email notification');
                }
            }
        }

        return success;
    }

    // ============================================
    // 📊 STATISTICS & REPORTING
    // ============================================

    async getDashboardStats() {
        try {
            if (typeof db === 'undefined') return null;

            const today = new Date().toISOString().split('T')[0];
            const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

            // Today's stats
            const { data: todayAtt, count: todayCount } = await db.from('attendance')
                .select('type', { count: 'exact' })
                .gte('created_at', today);

            const todayCheckIns = todayAtt?.filter(a => a.type === 'حضور').length || 0;
            const todayCheckOuts = todayAtt?.filter(a => a.type === 'انصراف').length || 0;

            // This month stats
            const { data: monthData } = await db.from('employees')
                .select('code', { count: 'exact' })
                .eq('is_deleted', false);

            return {
                totalEmployees: monthData?.length || 0,
                todayCheckIns,
                todayCheckOuts,
                registeredThisMonth: monthData?.length || 0
            };

        } catch(e) {
            console.error('❌ Stats error:', e);
            return null;
        }
    }

    // ============================================
    // 🔍 SEARCH & FILTER
    // ============================================

    searchEmployees(query) {
        if (!query || !this.employeesList.length) {
            return this.employeesList;
        }

        const lowerQuery = query.toLowerCase().trim();
        
        return this.employeesList.filter(emp =>
            emp.name.toLowerCase().includes(lowerQuery) ||
            emp.code.toLowerCase().includes(lowerQuery) ||
            (emp.email && emp.email.toLowerCase().includes(lowerQuery))
        );
    }

    filterByStatus(status) {
        if (!status || status === 'all') {
            return this.employeesList;
        }

        switch(status) {
            case 'active':
                return this.employeesList.filter(emp => !emp.is_deleted && !emp.is_admin);
            case 'admin':
                return this.employeesList.filter(emp => emp.is_admin && !emp.is_deleted);
            case 'deleted':
                return this.employeesList.filter(emp => emp.is_deleted);
            default:
                return this.employeesList;
        }
    }

    // ============================================
    // 🛡️ SECURITY HELPERS
    // ============================================

    requireAdminVerification(action) {
        // Check if admin has face descriptor
        if (!window.sessionDescriptor) {
            return {
                required: true,
                reason: 'no_face_descriptor'
            };
        }

        // Check if action requires verification based on config
        const sensitiveActions = ['delete_employee', 'manual_attendance'];
        
        if (sensitiveActions.includes(action)) {
            const requireVerify = AppConfig?.security?.adminVerification?.requiredForDelete === true ||
                                  AppConfig?.security?.adminVerification?.requiredForManualAtt === true;
            
            return {
                required: requireVerify,
                reason: requireVerify ? 'policy' : null
            };
        }

        return {
            required: false,
            reason: null
        };
    }

    // Utility functions
    euclideanDistance(desc1, desc2) {
        if (!desc1 || !desc2 || desc1.length !== desc2.length) return Infinity;
        
        let sum = 0;
        for (let i = 0; i < desc1.length; i++) {
            sum += (desc1[i] - desc2[i]) ** 2;
        }
        return Math.sqrt(sum);
    }
}

// ============================================
// 🌍 GLOBAL ADMIN INSTANCE
// ============================================

let adminManager;

document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
    
    // Make globally available
    window.adminManager = adminManager;
    window.admin = adminManager;
    window.openAddEmployeeModal = () => adminManager.openAddEmployeeModal();
    
    // Auto-init if user is admin
    if (window.user?.isAdmin || window.user?.role === 'admin') {
        adminManager.init();
    }
    
    console.log('👔 Admin Manager initialized');
});

// Global functions for use by other modules
window.handleRegistrationCapture = async function(descriptor) {
    try {
        if (!descriptor || !window.regData) throw new Error('Missing data');
        setCamStatus?.('<i class="fas fa-upload"></i> جاري حفظ البيانات...');
        if (typeof db === 'undefined') throw new Error('Database not available');
        const tempPass = (window.regData.password || Math.random().toString(36).slice(-8)).trim();
        let imageUrl = null;
        if (typeof faceRecognition !== 'undefined') {
            const imgBlob = await faceRecognition.createStorageImageBlob();
            if (imgBlob) {
                const tempName = `emp_${Date.now()}_face.jpg`;
                await db.storage.from('faces').upload(tempName, imgBlob, { upsert: true });
                const { data: imgData } = db.storage.from('faces').getPublicUrl(tempName);
                imageUrl = imgData?.publicUrl || null;
            }
        }
        const result = await db.createEmployee({
            name: window.regData.name,
            email: window.regData.email,
            password: tempPass,
            faceDescriptor: descriptor,
            profileImageUrl: imageUrl
        });
        if (!result?.success) throw new Error(result?.error || 'فشل إنشاء الحساب');
        playSound?.('faceid-success');
        showToast?.(`تم إنشاء الحساب! (الكود: ${result.employee_code || result.code})`, 'success');
        closeCamera?.();
        showLoginScreen?.();
    } catch (e) {
        console.error('❌ Registration error:', e);
        playSound?.('faceid-error');
        showToast?.(e.message || 'حدث خطأ أثناء التسجيل', 'error');
        closeCamera?.();
    }
};

window.handleFirstTimeSetupCapture = async function(descriptor) {
    try {
        if (!descriptor || !window.user) throw new Error('Missing data');
        setCamStatus?.('<i class="fas fa-upload"></i> جاري حفظ البصمة...');
        let imageUrl = null;
        if (typeof faceRecognition !== 'undefined') {
            const imgBlob = await faceRecognition.createStorageImageBlob();
            if (imgBlob) {
                const faceKey = `${window.user.role || 'employee'}_${window.user.username || window.user.code}_face.jpg`;
                await db.storage.from('faces').upload(faceKey, imgBlob, { upsert: true });
                const { data: imgData } = db.storage.from('faces').getPublicUrl(faceKey);
                imageUrl = imgData?.publicUrl || null;
            }
        }
        const result = await db.saveFaceEnrollment(window.user, descriptor, imageUrl);
        if (!result?.success) throw new Error(result?.error || 'فشل حفظ البصمة');
        playSound?.('faceid-success');
        window.sessionDescriptor = descriptor;
        window.user.face_enrolled = true;
        window.user.face_descriptor = descriptor;
        window.forceFaceEnrollment = false;
        window.firstTimeSetupMode = false;
        if (window.auth?.updateStoredSession) window.auth.updateStoredSession(window.user);
        showMatchResult?.(true);
        showToast?.('تم تسجيل البصمة بنجاح!', 'success');
        setTimeout(async () => {
            closeCamera?.();
            if (window.auth?.finalizePendingLogin) {
                await window.auth.finalizePendingLogin(window.user);
            }
            showApp?.();
        }, 800);
    } catch (e) {
        console.error('❌ First time setup error:', e);
        playSound?.('faceid-error');
        showMatchResult?.(false);
        showToast?.(e.message || 'فشل حفظ البصمة', 'error');
        faceRecognition?.restartCamLoop();
    }
};

window.handleFaceUpdateCapture = async function(descriptor) {
    if (window.__faceUpdateInFlight) return;
    window.__faceUpdateInFlight = true;
    try {
        const targetUser = window.faceUpdateTargetUser || window.user;
        if (!descriptor || !targetUser) throw new Error('Missing data');
        setCamStatus?.('<i class="fas fa-upload"></i> جاري تحديث البصمة...');
        let imageUrl = null;
        if (typeof faceRecognition !== 'undefined') {
            const imgBlob = await faceRecognition.createStorageImageBlob();
            if (imgBlob) {
                const faceKey = `${targetUser.role || 'employee'}_${targetUser.username || targetUser.code}_face.jpg`;
                await db.storage.from('faces').upload(faceKey, imgBlob, { upsert: true });
                const { data: imgData } = db.storage.from('faces').getPublicUrl(faceKey);
                imageUrl = imgData?.publicUrl || null;
            }
        }
        const result = await db.saveFaceEnrollment(targetUser, descriptor, imageUrl);
        if (!result?.success) throw new Error(result?.error || 'فشل تحديث البصمة');
        playSound?.('faceid-success');
        if (window.user && targetUser.code === window.user.code && targetUser.role === window.user.role) {
            window.sessionDescriptor = descriptor;
            window.user.face_enrolled = true;
            window.user.face_descriptor = descriptor;
            if (imageUrl) {
                window.userImage = imageUrl;
                window.user.profile_image_url = imageUrl;
                try {
                    const role = window.user?.role || (window.user?.isAdmin ? 'admin' : 'employee');
                    const identifier = role === 'admin' ? (window.user?.username || 'admin') : (window.user?.code || 'unknown');
                    localStorage.setItem(`axentro_avatar_${role}_${String(identifier).trim().toLowerCase()}`, imageUrl);
                } catch (_) {}
                if (window.app?.syncProfileAvatarUI) window.app.syncProfileAvatarUI(imageUrl, window.user);
            }
            if (window.auth?.updateStoredSession) window.auth.updateStoredSession(window.user);
        }
        showMatchResult?.(true);
        showToast?.('تم تحديث البصمة بنجاح', 'success');
        window.faceUpdateTargetUser = null;
        setTimeout(() => {
            closeCamera?.();
            showApp?.();
            window.__faceUpdateInFlight = false;
        }, 800);
    } catch (e) {
        console.error('❌ Face update error:', e);
        playSound?.('faceid-error');
        showMatchResult?.(false);
        showToast?.(e.message || 'فشل تحديث البصمة', 'error');
        faceRecognition?.restartCamLoop();
        window.__faceUpdateInFlight = false;
    }
};

window.handleAdminVerificationCapture = async function(descriptor) {
    // Called when admin verifies their face for sensitive operations
    if (typeof adminManager !== 'undefined') {
        await adminManager.handleAdminVerification(descriptor);
    }
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
}


window.openEmployeeActionsModal = (code, name) => adminManager?.openEmployeeActionsModal?.(code, name);
window.adminOpenEmployeeAction = async function(actionType) {
    const selected = window.selectedEmployeeAdminAction;
    if (!selected) return;
    if (typeof ui !== 'undefined' && ui?.closeModal) ui.closeModal('employeeActionsModal');
    window.targetEmpForAdmin = { code: selected.code, name: selected.name, type: actionType };
    window.adminVerifyMode = true;
    window.attMode = false;
    window.updateFaceMode = false;
    window.firstTimeSetupMode = false;
    window.adminResetFaceMode = false;
    await openCamera?.();
};
