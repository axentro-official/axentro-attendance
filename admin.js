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

            const count = this.employeesList.filter(emp => !emp.is_deleted).length;
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
                <td class="admin-col-index"><div class="cell-scroll cell-center">${index + 1}</div></td>
                <td class="admin-col-code"><div class="cell-scroll cell-code">${employee.code || '-'}</div></td>
                <td class="admin-col-name"><div class="cell-scroll cell-strong">${employee.name || '-'}</div></td>
                <td class="admin-col-email"><div class="cell-scroll">${employee.email || '-'}</div></td>
                <td class="admin-col-status"><div class="cell-scroll cell-center"><span class="${statusClass}" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;display:inline-block;">${statusText}</span></div></td>
                <td class="admin-col-date"><div class="cell-scroll cell-muted">${createdDate}</div></td>
                <td class="admin-col-actions"><div class="cell-scroll cell-center action-wrap">
                    ${!employee.is_admin ? `
                    <button class="btn btn-sm btn-outline" onclick="openEmployeeActionsModal('${employee.code}', '${(employee.name || '').replace(/'/g, "&#39;")}')" title="إعدادات الموظف" style="margin:2px;">
                        <i class="fas fa-gear"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminDeleteEmp('${employee.code}', '${(employee.name || '').replace(/'/g, "&#39;")}')" title="حذف الموظف" style="margin:2px;">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : '<span style="color:#64748b;font-size:11px;">—</span>'}
                </div></td>
            `;
            tbody.appendChild(row);
        });
    }

    async updateDashboardStats() {
        try {
            const attendanceToday = await (db?.getTodayAttendance?.() || Promise.resolve([]));
            const activeEmployees = (this.employeesList || []).filter(emp => !emp.is_deleted);
            const totalEmployees = activeEmployees.length;
            const todayCheckIns = attendanceToday.filter?.(r => r.type === 'حضور').length || 0;
            const todayCheckOuts = attendanceToday.filter?.(r => r.type === 'انصراف').length || 0;
            const monthKey = new Date().toISOString().slice(0,7);
            const monthRegistered = activeEmployees.filter(emp => String(emp.created_at || '').startsWith(monthKey)).length;
            const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setText('adminPresentToday', todayCheckIns);
            setText('adminCheckedInToday', todayCheckIns);
            setText('adminTotalEmp', totalEmployees);
            setText('adminEmployeesCount', totalEmployees);
            setText('adminRegisteredThisMonth', monthRegistered);
            setText('adminCheckedOutToday', todayCheckOuts);
            setText('totalEmployeesStat', totalEmployees);
        } catch (error) {
            console.error('❌ Update dashboard stats error:', error);
        }
    }

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
                if (!window.user.avatar_image_url) window.user.avatar_image_url = imageUrl;
                try {
                    const role = window.user?.role || (window.user?.isAdmin ? 'admin' : 'employee');
                    const identifier = role === 'admin' ? (window.user?.username || 'admin') : (window.user?.code || 'unknown');
                    if (!window.user?.avatar_image_url) localStorage.setItem(`axentro_avatar_${role}_${String(identifier).trim().toLowerCase()}`, imageUrl);
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
