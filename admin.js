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
        console.log('✅ Admin Manager ready');
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

            const { data: employees } = await db.from('employees')
                .select('*')
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });

            if (employees) {
                this.employeesList = employees;
                
                // Update count
                const countEl = document.getElementById('totalEmployeesStat');
                if (countEl) countEl.textContent = employees.length;

                // Render table/list
                this.populateEmployeesTable(employees);

                console.log(`📋 Loaded ${employees.length} employees`);
            }

        } catch (error) {
            console.error('❌ Load employees error:', error);
            this.employeesList = [];
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

            // Format dates
            const createdDate = employee.created_at ? 
                new Date(employee.created_at).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }) : '-';

            const lastLogin = employee.last_login ? 
                new Date(employee.last_login).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'لم يسجل دخول';

            // Status badge
            let statusClass, statusText;
            if (employee.is_deleted) {
                statusClass = 'badge-danger';
                statusText = 'محذوف';
            } else if (employee.is_admin) {
                statusClass = 'badge-primary';
                statusText = 'أدمن';
            } else {
                statusClass = 'badge-success';
                statusText = 'نشط';
            }

            row.innerHTML = `
                <td style="font-weight:bold;">${index + 1}</td>
                <td style="color:#3b82f6;font-weight:bold;font-family:monospace;">${employee.code}</td>
                <td><strong>${employee.name}</strong></td>
                <td>${employee.email || '-'}</td>
                <td><span class="${statusClass}" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;display:inline-block;">
                        ${statusText}
                    </span></td>
                <td style="font-size:12px;color:#94a3b8;">${createdDate}</td>
                <td style="font-size:12px;color:#94a3b8;">${lastLogin}</td>
                <td>
                    ${!employee.is_admin ? `
                    <button class="btn btn-sm btn-reg" onclick="adminResetFace('${employee.code}', '${employee.name}')" title="إعادة تسجيل بصمة" style="margin:2px;">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminDeleteEmp('${employee.code}', '${employee.name}')" title="حذف الموظف" style="margin:2px;">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : '<span style="color:#64748b;font-size:11px;">—</span>'}
                </td>
            `;

            tbody.appendChild(row);
        });
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

            // Handle employee deletion
            if (targetEmp.type === 'حذف موظف') {
                await this.deleteEmployeeWithVerification(targetEmp);
            } else {
                // Handle manual attendance recording
                await this.recordManualAttendance(targetEmp);
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
            // Delete attendance records first
            const { error: attErr } = await db.from('attendance')
                .delete()
                .eq('employee_code', targetEmp.code);

            // Delete employee
            const { error: empErr } = await db.from('employees')
                .delete()
                .eq('code', targetEmp.code);

            // Try to delete face image from storage
            try {
                if (typeof db !== 'undefined' && db.storage) {
                    await db.storage.from('faces').remove([`${targetEmp.code}_face.jpg`]);
                }
            } catch(storageError) {
                console.warn('⚠️ Could not delete storage image:', storageError.message);
            }

            if (!empErr) {
                playSound?.('faceid-success');
                showToast?.(`تم حذف ${targetEmp.name} بنجاح`, 'success');

                setTimeout(async () => {
                    closeCamera?.();
                    
                    // Reload employees list
                    if (typeof loadEmployees === 'function') {
                        await loadEmployees();
                    } else if (typeof attendance !== 'undefined') {
                        await attendance.loadEmployees();
                    }
                }, 800);

            } else {
                throw empErr;
            }

        } catch(e) {
            console.error('❌ Delete employee error:', e);
            playSound?.('faceid-error');
            showToast?.('فشل حذف الموظف', 'error');
            faceRecognition?.restartCamLoop();
        }
    }

    async recordManualAttendance(targetEmp) {
        try {
            const now = new Date();
            const datetime = `${now.toLocaleDateString('ar-EG')} - ${now.toLocaleString('ar-EG', { 
                hour12: true, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            })}`;

            const { error } = await db.from('attendance').insert({
                employee_code: targetEmp.code,
                employee_name: targetEmp.name,
                type: targetEmp.type,
                location_link: window.currentLoc || 'غير متوفر',
                shift: 'تسجيل يدوي بواسطة الأدمن'
            });

            if (!error) {
                playSound?.('faceid-success');
                showToast?.(`تم تسجيل ${targetEmp.type} لـ ${targetEmp.name} بنجاح`, 'success');

                setTimeout(async () => {
                    closeCamera?.();
                    
                    // Reload data
                    if (typeof loadEmployees === 'function') {
                        await loadEmployees();
                    }
                }, 800);

            } else {
                throw error;
            }

        } catch(e) {
            console.error('❌ Manual attendance error:', e);
            playSound?.('faceid-error');
            showToast?.('فشل التسجيل اليدوي', 'error');
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
    
    // Auto-init if user is admin
    if (window.user?.isAdmin) {
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
        if (AppConfig?.emailService?.url) {
            fetch(AppConfig.emailService.url, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'sendNewEmpEmails',
                    name: window.regData.name,
                    code: result.employee_code || result.code,
                    password: tempPass,
                    email: window.regData.email
                })
            }).catch(e => console.log('Welcome email error:', e));
        }
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
    try {
        if (!descriptor || !window.user) throw new Error('Missing data');
        setCamStatus?.('<i class="fas fa-upload"></i> جاري تحديث البصمة...');
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
        if (!result?.success) throw new Error(result?.error || 'فشل تحديث البصمة');
        playSound?.('faceid-success');
        window.sessionDescriptor = descriptor;
        window.user.face_enrolled = true;
        window.user.face_descriptor = descriptor;
        if (window.auth?.updateStoredSession) window.auth.updateStoredSession(window.user);
        showMatchResult?.(true);
        showToast?.('تم تحديث البصمة بنجاح', 'success');
        setTimeout(() => closeCamera?.(), 800);
        showApp?.();
    } catch (e) {
        console.error('❌ Face update error:', e);
        playSound?.('faceid-error');
        showMatchResult?.(false);
        showToast?.(e.message || 'فشل تحديث البصمة', 'error');
        faceRecognition?.restartCamLoop();
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
