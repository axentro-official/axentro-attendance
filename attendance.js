/**
 * ============================================
 * ⏰ AXENTRO ATTENDANCE MANAGER v4.2 - COMPLETE
 * ✅ Check-in/Check-out & Time Tracking
 * 🔥 Enhanced with All Legacy Features
 * ============================================
 */

class AttendanceManager {
    constructor() {
        this.currentStatus = null; // 'in' or 'out'
        this.todayRecords = [];
        this.lastCheckIn = null;
        this.lastCheckOut = null;
        this.isProcessing = false;
        
        // Cooldown tracking
        this.lastActionTime = 0;
        
        // Location data
        this.currentLocation = null;
        
        console.log('⏰ Attendance Manager initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    init() {
        console.log('✅ Attendance Manager ready');
    }

    // ============================================
    // 📍 LOCATION TRACKING (من الكود القديم)
    // ============================================

    async getCurrentLocation() {
        try {
            const location = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation not supported'));
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    pos => resolve(pos),
                    err => reject(err),
                    {
                        enableHighAccuracy: AppConfig?.location?.enableHighAccuracy !== false,
                        timeout: AppConfig?.location?.timeout || 15000,
                        maximumAge: AppConfig?.location?.maximumAge || 0
                    }
                );
            });

            this.currentLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy
            };

            // Update global state
            window.currentLat = location.coords.latitude;
            window.currentLon = location.coords.longitude;
            window.currentLoc = `https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;

            // Update UI
            this.updateLocationStatus(true, location.coords.accuracy);

            return this.currentLocation;

        } catch (error) {
            console.warn('⚠️ Location error:', error.message);
            this.updateLocationStatus(false);
            
            window.currentLoc = 'غير متوفر';
            window.currentLat = null;
            window.currentLon = null;
            
            return null;
        }
    }

    updateLocationStatus(success, accuracy = null) {
        const statusEl = document.getElementById('locationStatus') || document.getElementById('locBar');
        if (!statusEl) return;

        if (success && accuracy) {
            statusEl.innerHTML = `
                <i class="fas fa-map-marker-alt" style="color:#10b981;"></i> 
                <a href="${window.currentLoc}" target="_blank" style="color:#38bdf8; text-decoration:none;">
                    الموقع محدد (دقة: ${Math.round(accuracy)}م)
                </a>
            `;
        } else {
            statusEl.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i> 
                <span style="color:#94a3b8;">تعذر تحديد الموقع</span>
            `;
        }
    }

    getLocationLink() {
        return window.currentLoc || null;
    }

    // ============================================
    // 📊 TODAY'S RECORDS (من الكود القديم)
    // ============================================

    async loadTodayRecords() {
        try {
            if (!window.user || window.user.role === 'admin') {
                this.todayRecords = [];
                this.currentStatus = 'out';
                this.updateTodaySummary();
                return;
            }
            if (typeof db === 'undefined') return;
            this.todayRecords = await db.getTodayAttendance(window.user.code);
            this.determineCurrentStatus();
            this.updateTodaySummary();
            console.log(`📋 Loaded ${this.todayRecords.length} today's records`);
        } catch (error) {
            console.error('❌ Load today records error:', error);
            this.todayRecords = [];
        }
    }

    determineCurrentStatus() {
        if (this.todayRecords.length === 0) {
            this.currentStatus = 'out';
            this.lastCheckIn = null;
            this.lastCheckOut = null;
            return;
        }

        // Sort by time (newest first)
        const sortedRecords = [...this.todayRecords].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        const lastRecord = sortedRecords[0];

        if (lastRecord.type === 'حضور') {
            this.currentStatus = 'in';
            this.lastCheckIn = lastRecord;
            this.lastCheckOut = sortedRecords.find(r => r.type === 'انصراف') || null;
        } else {
            this.currentStatus = 'out';
            this.lastCheckIn = sortedRecords.find(r => r.type === 'حضور') || null;
            this.lastCheckOut = lastRecord;
        }
    }

    updateTodaySummary() {
        // Update times
        const checkInTimeEl = document.getElementById('checkInTime');
        const checkOutTimeEl = document.getElementById('checkOutTime');

        if (checkInTimeEl && this.lastCheckIn) {
            checkInTimeEl.textContent = this.formatTime(this.lastCheckIn.created_at);
        }

        if (checkOutTimeEl && this.lastCheckOut) {
            checkOutTimeEl.textContent = this.formatTime(this.lastCheckOut.created_at);
        }

        // Calculate total hours and overtime
        let totalHours = 0;
        let overtimeHours = 0;

        this.todayRecords.forEach(record => {
            const hours = parseFloat(record.hours_worked) || 0;
            totalHours += hours;

            const overtimeMatch = record.overtime?.match(/[\d.]+/);
            if (overtimeMatch) {
                overtimeHours += parseFloat(overtimeMatch[0]);
            }
        });

        // Update display elements
        const totalHoursEl = document.getElementById('totalHoursToday');
        const overtimeEl = document.getElementById('overtimeToday');
        const todayHoursEl = document.getElementById('todayHours');

        if (totalHoursEl) {
            totalHoursEl.textContent = this.formatHoursWorked(totalHours);
        }

        if (overtimeEl) {
            overtimeEl.textContent = overtimeHours > 0 ? 
                `${overtimeHours.toFixed(1)} ساعة` : 
                'لا يوجد';
        }

        if (todayHoursEl) {
            todayHoursEl.textContent = totalHours.toFixed(1);
        }

        // Update action buttons
        this.updateActionButtons();
    }

    updateActionButtons() {
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');

        if (!checkInBtn || !checkOutBtn) return;

        if (this.currentStatus === 'in') {
            // User is checked in - show checkout button active
            checkInBtn.disabled = true;
            checkInBtn.classList.add('disabled');
            checkOutBtn.disabled = false;
            checkOutBtn.classList.remove('disabled');
            checkInBtn.innerHTML = 'تم الحضور';
            checkOutBtn.innerHTML = 'انصراف';
        } else {
            // User is checked out - show checkin button active
            checkInBtn.disabled = false;
            checkInBtn.classList.remove('disabled');
            checkOutBtn.disabled = true;
            checkOutBtn.classList.add('disabled');
            checkInBtn.innerHTML = 'حضور';
            checkOutBtn.innerHTML = 'تم الانصراف';
        }
    }

    // ============================================
    // ✅ CHECK-IN / CHECK-OUT OPERATIONS (من الكود القديم)
    // ============================================

    async handleCheckIn() {
        await this.recordAttendance('حضور');
    }

    async handleCheckOut() {
        await this.recordAttendance('انصراف');
    }

    async recordAttendance(type) {
        if (this.isProcessing) {
            showToast?.('جاري المعالجة... يرجى الانتظار', 'warning');
            return;
        }

        if (this.isOnCooldown()) {
            showToast?.('يرجى الانتظار قبل المحاولة مرة أخرى', 'error');
            return;
        }

        if (!window.user) {
            showToast?.('يجب تسجيل الدخول أولاً', 'error');
            return;
        }

        const selectedShift = this.getSelectedShift();
        if (!selectedShift && type === 'حضور') {
            showToast?.('يرجى اختيار الوردية', 'error');
            return;
        }

        if (type === 'حضور' && this.currentStatus === 'in') {
            showToast?.('لقد سجلت حضورك بالفعل', 'error');
            return;
        }

        if (type === 'انصراف' && this.currentStatus === 'out') {
            showToast?.('لم تسجل حضور بعد', 'error');
            return;
        }

        if (!window.sessionDescriptor) {
            window.firstTimeSetupMode = true;
            showToast?.('لا توجد بصمة وجه مسجلة لهذا الحساب. سنفتح الكاميرا الآن لتسجيلها.', 'warning');
            const opened = typeof openCamera === 'function' ? await openCamera() : false;
            if (!opened) {
                showToast?.('تعذر فتح الكاميرا لتسجيل بصمة الوجه', 'error');
            }
            return;
        }

        this.isProcessing = true;
        window.attType = type;
        window.attMode = true;
        window.regMode = false;
        window.updateFaceMode = false;
        window.adminVerifyMode = false;
        window.adminResetFaceMode = false;
        window.firstTimeSetupMode = false;

        const btnId = type === 'حضور' ? 'checkInBtn' : 'checkOutBtn';
        const btn = document.getElementById(btnId);
        const originalHtml = btn?.innerHTML || '';
        const loadingText = type === 'حضور' ? 'التحقق من الوجه لتسجيل الحضور...' : 'التحقق من الوجه لتسجيل الانصراف...';

        try {
            await this.getCurrentLocation();

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + loadingText;
            }

            const opened = typeof openCamera === 'function' ? await openCamera() : false;
            if (!opened) {
                throw new Error('فشل فتح الكاميرا');
            }

            showToast?.('ثبّت وجهك داخل الإطار. سيتم التحقق ثم تسجيل العملية تلقائياً.', 'info');
        } catch (error) {
            console.error('❌ Start attendance flow error:', error);
            showToast?.(error.message || 'تعذر بدء التحقق بالوجه', 'error');
            this.isProcessing = false;
            window.attMode = false;
            window.attType = '';
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml || (type === 'حضور' ? 'حضور' : 'انصراف');
            }
        }
    }

    async handleAttendanceOperation(descriptor) {
        if (!descriptor) {
            playSound?.('faceid-error');
            showToast?.('فشل استخراج البصمة', 'error');
            closeCamera?.();
            return;
        }

        if (!window.sessionDescriptor) {
            playSound?.('faceid-error');
            showToast?.('بيانات الوجه غير مسجلة، تواصل مع الأدمن.', 'error');
            closeCamera?.();
            return;
        }

        // Verify face match
        const distance = faceRecognition?.euclideanDistance(descriptor, window.sessionDescriptor) || 
                         this.euclideanDistance(descriptor, window.sessionDescriptor);
        
        const threshold = window.user?.role === 'admin' ? (AppConfig?.faceRecognition?.recognition?.adminThreshold || 0.45) : (AppConfig?.faceRecognition?.recognition?.threshold || 0.48);

        if (distance >= threshold) {
            // Face doesn't match
            playSound?.('faceid-error');
            showMatchResult?.(false);
            showToast?.('الوجه غير مطابق!', 'error');
            setCamStatus?.('الوجه غير مطابق!');
            faceRecognition?.restartCamLoop();
            return;
        }

        // Face matches! Show success
        showMatchResult?.(true);

        // Handle password change via face
        if (window.attType === 'تغيير كلمة المرور') {
            await this.handleChangePasswordWithFace();
            return;
        }

        // Check GPS location (من الكود القديم)
        if (window.currentLat && window.currentLon) {
            const dist = this.getDistanceFromLatLonInKm(
                window.currentLat, 
                window.currentLon,
                AppConfig?.location?.office?.latitude || 30.1407941,
                AppConfig?.location?.office?.longitude || 31.3800838
            );

            const maxDistance = AppConfig?.location?.maxDistanceMeters || 500;

            const maxAccuracy = AppConfig?.location?.maxAccuracyMeters || 50;
            if ((this.currentLocation?.accuracy || window.currentAccuracy || 0) > maxAccuracy) {
                playSound?.('faceid-error');
                showToast?.(`دقة الموقع غير كافية (${Math.round(this.currentLocation?.accuracy || window.currentAccuracy || 0)} متر)`, 'error');
                setCamStatus?.('مرفوض: دقة الموقع غير كافية');
                faceRecognition?.restartCamLoop();
                return;
            }

            if (dist > maxDistance) {
                playSound?.('faceid-error');
                showToast?.(`بعيد عن المقر (${Math.round(dist)} متر)`, 'error');
                setCamStatus?.('مرفوض: خارج نطاق المقر');
                faceRecognition?.restartCamLoop();
                return;
            }
        }

        // Get shift selection
        const selShift = document.querySelector('input[name="shift"]:checked');
        
        // Calculate hours worked for check-out
        let hoursWorked = null;

        if (window.attType === 'انصراف') {
            const today = new Date().toISOString().split('T')[0];
            
            if (typeof db !== 'undefined') {
                const { data: lastCheckIn } = await db.from('attendance')
                    .select('created_at')
                    .eq('employee_code', window.user.code)
                    .eq('type', 'حضور')
                    .gte('created_at', today)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (lastCheckIn) {
                    const diff = (new Date() - new Date(lastCheckIn.created_at)) / (1000 * 60 * 60);
                    hoursWorked = diff.toFixed(2);
                }
            }
        }

        // Format datetime
        const now = new Date();
        const datetime = `${now.toLocaleDateString('ar-EG')} - ${now.toLocaleString('ar-EG', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        })}`;

        // Record attendance
        try {
            if (typeof db === 'undefined') throw new Error('Database not available');

            const result = await db.recordAttendanceSecure({
                employee_code: window.user.code,
                employee_name: window.user.name,
                type: window.attType,
                location_link: window.currentLoc || 'غير متوفر',
                shift: selShift ? selShift.value : 'لم يتم التحديد',
                hours_worked: hoursWorked,
                latitude: window.currentLat,
                longitude: window.currentLon,
                gps_accuracy: this.currentLocation?.accuracy || window.currentAccuracy || null,
                face_verified: true
            });

            if (!result?.success) throw new Error(result?.error || 'فشل التسجيل');

            // Success!
            playSound?.('faceid-success');
            showToast?.(`تم تسجيل ${window.attType} بنجاح ${hoursWorked ? '(' + hoursWorked + ')' : ''}`, 'success');

            setTimeout(async () => {
                closeCamera?.();
                this.isProcessing = false;
                this.lastActionTime = Date.now();
                await this.loadTodayRecords();
                this.calculateMonthlyHours();
            }, 800);

            // Send email notification
            this.sendAttendanceEmail(
                window.attType, 
                datetime, 
                selShift?.value, 
                hoursWorked, 
                null
            );

        } catch(e) {
            console.error('Attendance recording error:', e);
            this.isProcessing = false;
            playSound?.('faceid-error');
            showMatchResult?.(false);
            showToast?.(e.message || 'فشل التسجيل', 'error');
            setCamStatus?.('حدث خطأ أثناء التسجيل');
            faceRecognition?.restartCamLoop();
        }
    }

    async handleChangePasswordWithFace() {
        const pending = window._pendingPwChange;
        if (!pending) {
            showToast?.('لا توجد بيانات تغيير كلمة المرور', 'error');
            closeCamera?.();
            return;
        }
        try {
            const result = await db.changeOwnPassword(window.user, pending.oldPassword, pending.newPassword);
            if (!result?.success) {
                playSound?.('login-error');
                showToast?.(result?.error || 'كلمة السر الحالية خاطئة', 'error');
                faceRecognition?.restartCamLoop();
                return;
            }
            playSound?.('login-success');
            showToast?.('تم تغيير كلمة المرور', 'success');
            setTimeout(() => closeCamera?.(), 800);
        } catch (e) {
            console.error('Password change error:', e);
            playSound?.('login-error');
            showToast?.('خطأ في تغيير كلمة المرور', 'error');
            faceRecognition?.restartCamLoop();
        }
    }

    // ============================================
    // 📏 UTILITY FUNCTIONS (من الكود القديم)
    // ============================================

    getSelectedShift() {
        const selected = document.querySelector('input[name="shift"]:checked');
        return selected ? selected.value : null;
    }

    isOnCooldown() {
        const cooldownPeriod = AppConfig?.attendance?.cooldownPeriod || 60000;
        return (Date.now() - this.lastActionTime) < cooldownPeriod;
    }

    formatTime(dateStr) {
        try {
            return new Date(dateStr).toLocaleTimeString('ar-EG', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch(e) {
            return '--:--';
        }
    }

    formatHoursWorked(hours) {
        return `${hours.toFixed(1)} ساعة`;
    }

    getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + 
                  Math.cos(this.deg2rad(lat1)) * 
                  Math.cos(this.deg2rad(lat2)) * 
                  Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000; // Return meters
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

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
// 🌍 GLOBAL ATTENDANCE INSTANCE & FUNCTIONS
// ============================================

let attendance;

document.addEventListener('DOMContentLoaded', () => {
    attendance = new AttendanceManager();
    
    // Make globally available
    window.attendance = attendance;
    
    // Setup search if on admin page
    attendance.setupSearch();
    
    console.log('✅ Attendance Manager initialized');
});

// Global functions for use by other modules
window.handleAttendance = function(type) {
    if (typeof attendance !== 'undefined') {
        if (type === 'حضور') {
            attendance.handleCheckIn();
        } else if (type === 'انصراف') {
            attendance.handleCheckOut();
        }
    }
};

window.loadEmployees = async function() {
    if (typeof attendance !== 'undefined') {
        await attendance.loadEmployees();
    }
};

window.calculateMonthlyHours = async function() {
    if (typeof attendance !== 'undefined') {
        await attendance.calculateMonthlyHours();
    }
};

window.fetchUserDataInBackground = async function() {
    if (typeof attendance === 'undefined' || !window.user) return;
    if (window.user.role !== 'admin') {
        await attendance.loadTodayRecords();
        await attendance.calculateMonthlyHours();
    }
    if (typeof db !== 'undefined') {
        try {
            const ctx = await db.getFaceContext(window.user);
            if (ctx?.success !== false && ctx) {
                window.sessionDescriptor = ctx.face_descriptor || null;
                window.userImage = ctx.profile_image_url || '';
                window.user.face_enrolled = !!ctx.face_enrolled;
                if (window.userImage) {
                    const profileImg = document.querySelector('.emp-profile-img');
                    if (profileImg) profileImg.src = window.userImage + '?t=' + Date.now();
                }
                if (!ctx.face_enrolled && !document.getElementById('cameraOverlay')?.classList.contains('active')) {
                    showToast?.('يجب تسجيل بصمة الوجه أولاً', 'warning');
                    window.firstTimeSetupMode = true;
                    await openCamera?.();
                }
            }
        } catch (e) {
            console.error('Error fetching user data:', e);
        }
    }
    setStatus?.('النظام جاهز');
};

window.loadMyReport = function() {
    if (typeof attendance !== 'undefined') {
        attendance.loadMyReport();
    }
};

window.loadEmpReport = function(code, name) {
    if (typeof attendance !== 'undefined') {
        attendance.loadEmpReport(code, name);
    }
};

window.closeReportModal = function() {
    if (typeof attendance !== 'undefined') {
        attendance.closeReportModal();
    }
};

// Admin functions
window.adminDirectAtt = function(type, code, name) {
    if (typeof attendance !== 'undefined') {
        attendance.adminDirectAtt(type, code, name);
    }
};

window.adminDeleteEmp = function(code, name) {
    if (typeof attendance !== 'undefined') {
        attendance.adminDeleteEmp(code, name);
    }
};

window.adminResetFace = function(code, name) {
    if (typeof attendance !== 'undefined') {
        attendance.adminResetFace(code, name);
    }
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttendanceManager;
}
