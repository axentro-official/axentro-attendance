function getAttendanceEl(...ids) {
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) return el;
    }
    return null;
}

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
        const statusEl = getAttendanceEl('locationStatus', 'locBar');
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
            if (!window.user?.code) {
                console.warn('⚠️ Cannot load records - no user code');
                return;
            }

            if (typeof db === 'undefined') {
                console.warn('⚠️ Database module not available');
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            
            const { data } = await db.from('attendance')
                .select('*')
                .eq('employee_code', window.user.code)
                .gte('created_at', today)
                .order('created_at', { ascending: true });

            this.todayRecords = data || [];

            // Determine current status
            this.determineCurrentStatus();

            // Update UI
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
        // Prevent double-clicks
        if (this.isProcessing) {
            showToast?.('جاري المعالجة... يرجى الانتظار', 'warning');
            return;
        }

        // Check cooldown
        if (this.isOnCooldown()) {
            showToast?.('يرجى الانتظار قبل المحاولة مرة أخرى', 'error');
            return;
        }

        // Validate user is authenticated
        if (!window.user) {
            showToast?.('يجب تسجيل الدخول أولاً', 'error');
            return;
        }

        // Validate shift selection
        const selectedShift = this.getSelectedShift();
        if (!selectedShift && type === 'حضور') {
            showToast?.('يرجى اختيار الوردية', 'error');
            return;
        }

        // Check if opposite action already exists
        if (type === 'حضور' && this.currentStatus === 'in') {
            showToast?.('لقد سجلت حضورك بالفعل', 'error');
            return;
        }

        if (type === 'انصراف' && this.currentStatus === 'out') {
            showToast?.('لم تسجل حضور بعد', 'error');
            return;
        }

        // Start processing
        this.isProcessing = true;

        const btnId = type === 'حضور' ? 'checkInBtn' : 'checkOutBtn';
        const btn = document.getElementById(btnId);
        const loadingText = type === 'حضور' ? 'جاري تسجيل الحضور...' : 'جاري تسجيل الانصراف...';

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + loadingText;
        }

        try {
            // Step 1: Get location (non-blocking)
            await this.getCurrentLocation();

            // Step 2: Calculate hours worked (for check-out only)
            let hoursWorked = null;
            let overtime = null;

            if (type === 'انصراف' && this.lastCheckIn) {
                const checkInTime = new Date(this.lastCheckIn.created_at);
                const now = new Date();
                const diff = (now - checkInTime) / (1000 * 60 * 60);
                hoursWorked = diff.toFixed(2);

                // Calculate overtime
                const normalHours = AppConfig?.attendance?.normalHours || 9;
                if (parseFloat(hoursWorked) > normalHours) {
                    const ot = parseFloat(hoursWorked) - normalHours;
                    overtime = `${ot.toFixed(1)} ساعة`;
                } else {
                    overtime = 'لا يوجد';
                }
            }

            // Step 3: Format datetime (12-hour format as requested)
            const now = new Date();
            const timeFormat = AppConfig?.reporting?.timeFormat || {};
            const datetime = `${now.toLocaleDateString('ar-EG')} - ${now.toLocaleString('ar-EG', { 
                hour12: timeFormat.hour12 !== false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            })}`;

            // Step 4: Record to database
            const recordData = {
                employee_code: window.user.code,
                employee_name: window.user.name,
                type: type,
                location_link: window.currentLoc || 'غير متوفر',
                shift: selectedShift || 'لم يتم التحديد',
                hours_worked: hoursWorked,
                overtime: overtime
            };

            if (typeof db === 'undefined') throw new Error('Database not available');

            const { error } = await db.from('attendance').insert(recordData);

            if (error) throw error;

            // Success!
            playSound?.('faceid-success');
            showToast?.(`تم تسجيل ${type} بنجاح ${hoursWorked ? '(' + hoursWorked + ' ساعة)' : ''}`, 'success');

            // Reload today's records
            await this.loadTodayRecords();

            // Send email alert in background (من الكود القديم)
            this.sendAttendanceEmail(type, datetime, selectedShift, hoursWorked, overtime);

        } catch (error) {
            console.error('❌ Attendance recording error:', error);
            playSound?.('faceid-error');
            showToast?.('فشل تسجيل ' + type, 'error');
        } finally {
            this.isProcessing = false;

            // Reset button
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = type === 'حضور' ? 
                    '<i class="fas fa-sign-in-alt"></i> حضور' : 
                    '<i class="fas fa-sign-out-alt"></i> انصراف';
            }

            // Update cooldown
            this.lastActionTime = Date.now();
        }
    }

    // ============================================
    // 📧 EMAIL NOTIFICATIONS (من الكود القديم)
    // ============================================

    sendAttendanceEmail(type, datetime, shift, hoursWorked, overtime) {
        if (!AppConfig?.emailService?.url) return;

        const emailData = {
            action: 'sendAttAlert',
            name: window.user?.name,
            code: window.user?.code,
            type: type,
            datetime: datetime,
            location: window.currentLoc || '-',
            shift: shift || '',
            hoursWorked: hoursWorked || '-',
            overtime: overtime || 'لا يوجد'
        };

        fetch(AppConfig.emailService.url, {
            method: 'POST',
            body: JSON.stringify(emailData)
        }).catch(e => console.log('Email notification error:', e));
    }

    // ============================================
    // 📊 MONTHLY HOURS CALCULATION (من الكود القديم)
    // ============================================

    async calculateMonthlyHours() {
        try {
            if (!window.user?.code) return;

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            if (typeof db === 'undefined') return;

            const { data } = await db.from('attendance')
                .select('created_at, type, hours_worked')
                .eq('employee_code', window.user.code)
                .gte('created_at', startOfMonth);

            if (data) {
                let totalHours = 0;

                data.forEach(record => {
                    if (record.type === 'انصراف' && record.hours_worked) {
                        totalHours += parseFloat(record.hours_worked) || 0;
                    }
                });

                const monthHoursEl = document.getElementById('monthHoursValue');
                if (monthHoursEl) {
                    monthHoursEl.textContent = totalHours > 0 ? 
                        `${totalHours.toFixed(2)} ساعة` : 
                        '0 ساعة';
                }
            }

        } catch(e) {
            console.error('Monthly hours calculation error:', e);
            
            const monthHoursEl = document.getElementById('monthHoursValue');
            if (monthHoursEl) monthHoursEl.textContent = '--';
        }
    }

    // ============================================
    // 👥 EMPLOYEE DATA LOADING (للأدمن)
    // ============================================

    async loadEmployees() {
        try {
            if (typeof db === 'undefined') {
                throw new Error('Database not available');
            }

            const { data: emps } = await db.from('employees')
                .select('code, name, email, is_admin, is_deleted, created_at')
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });

            if (emps) {
                window.employeesList = emps;

                // Update count
                const countEl = document.getElementById('empCount');
                if (countEl) countEl.textContent = emps.length;

                // Render list
                this.renderEmployeeList(emps);

                setStatus?.('متصل');
            }

        } catch(e) {
            console.error('❌ Load employees error:', e);
            setStatus?.('غير متصل');
        }
    }

    renderEmployeeList(employees) {
        const container = document.getElementById('searchResults');
        if (!container) return;

        if (!employees || !employees.length) {
            container.innerHTML = '<p style="text-align:center; color:#64748b; padding:30px;">لا يوجد موظفين مسجلين</p>';
            return;
        }

        container.innerHTML = employees.map(emp => `
            <div class="emp-item">
                <div class="emp-info">
                    <h4>${emp.name}</h4>
                    <p>${emp.code}</p>
                </div>
                <div class="emp-actions">
                    <button class="btn btn-sm btn-att" onclick="adminDirectAtt('حضور', '${emp.code}', '${emp.name}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-leave" onclick="adminDirectAtt('انصراف', '${emp.code}', '${emp.name}')">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn btn-sm btn-report" onclick="loadEmpReport('${emp.code}', '${emp.name}')">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="btn btn-sm btn-reg" onclick="adminResetFace('${emp.code}', '${emp.name}')" title="إعادة تسجيل بصمة">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    ${!emp.is_admin ? `
                    <button class="btn btn-sm btn-danger" onclick="adminDeleteEmp('${emp.code}', '${emp.name}')" title="حذف الموظف">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Search functionality
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (!query) {
                this.renderEmployeeList(window.employeesList || []);
                return;
            }

            const filtered = (window.employeesList || []).filter(emp =>
                emp.name.toLowerCase().includes(query) ||
                emp.code.toLowerCase().includes(query)
            );

            this.renderEmployeeList(filtered);
        });
    }

    // ============================================
    // 👔 ADMIN OPERATIONS (من الكود القديم)
    // ============================================

    async adminDirectAtt(type, code, name) {
        // Verify admin has face registered
        if (!window.sessionDescriptor) {
            showToast?.('لا توجد بصمة أدمن مسجلة، جاري فتح الكاميرا للتسجيل...', 'warning');
            window.firstTimeSetupMode = true;
            
            if (typeof openCamera === 'function') {
                await openCamera();
            }
            return;
        }

        // Open camera for admin face verification
        window.adminVerifyMode = true;
        window.targetEmpForAdmin = { type, code, name };
        window.attMode = false;
        window.regMode = false;
        window.updateFaceMode = false;
        window.adminResetFaceMode = false;

        if (typeof openCamera === 'function') {
            const success = await openCamera();
            if (!success) {
                window.adminVerifyMode = false;
                showToast?.('فشل فتح الكاميرا', 'error');
            }
        }
    }

    async adminDeleteEmp(code, name) {
        if (!window.sessionDescriptor) {
            showToast?.('لا توجد بصمة أدمن مسجلة', 'warning');
            window.firstTimeSetupMode = true;
            
            if (typeof openCamera === 'function') {
                await openCamera();
            }
            return;
        }

        window.adminVerifyMode = true;
        window.targetEmpForAdmin = { type: 'حذف موظف', code, name };
        window.attMode = false;
        window.regMode = false;
        window.updateFaceMode = false;
        window.adminResetFaceMode = false;

        if (typeof openCamera === 'function') {
            const success = await openCamera();
            if (!success) {
                window.adminVerifyMode = false;
                showToast?.('فشل فتح الكاميرا', 'error');
            }
        }
    }

    async adminResetFace(code, name) {
        window.targetEmpForAdmin = { code, name };
        window.adminResetFaceMode = true;
        window.regMode = false;
        window.attMode = false;
        window.updateFaceMode = false;
        window.adminVerifyMode = false;
        window.firstTimeSetupMode = false;

        showToast?.(`جاري فتح الكاميرا لتسجيل بصمة جديدة لـ ${name}`, 'warning');

        if (typeof openCamera === 'function') {
            const success = await openCamera();
            if (!success) {
                window.adminResetFaceMode = false;
                showToast?.('فشل فتح الكاميرا', 'error');
            }
        }
    }

    // ============================================
    // 📋 REPORTS (من الكود القديم)
    // ============================================

    async loadMyReport() {
        if (!window.user?.code) return;

        const titleEl = document.getElementById('reportTitle');
        const bodyEl = document.getElementById('reportBody');
        const modal = document.getElementById('reportModal');

        if (titleEl) titleEl.textContent = `تقرير ${window.user.name}`;
        if (bodyEl) bodyEl.innerHTML = '<center style="padding:20px;"><i class="fas fa-spinner fa-spin"></i></center>';
        if (modal) modal.classList.add('active');

        await this.fetchAndRenderReport(window.user.code);
    }

    async loadEmpReport(code, name) {
        const titleEl = document.getElementById('reportTitle');
        const bodyEl = document.getElementById('reportBody');
        const modal = document.getElementById('reportModal');

        if (titleEl) titleEl.textContent = `تقرير ${name}`;
        if (bodyEl) bodyEl.innerHTML = '<center style="padding:20px;"><i class="fas fa-spinner fa-spin"></i></center>';
        if (modal) modal.classList.add('active');

        await this.fetchAndRenderReport(code);
    }

    async fetchAndRenderReport(code) {
        const bodyEl = document.getElementById('reportBody');
        if (!bodyEl) return;

        try {
            if (typeof db === 'undefined') throw new Error('Database not available');

            const { data: records } = await db.from('attendance')
                .select('*')
                .eq('employee_code', code)
                .order('created_at', { ascending: false })
                .limit(100);

            if (records && records.length > 0) {
                bodyEl.innerHTML = `
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>التاريخ</th>
                                <th>الحالة</th>
                                <th>الوقت</th>
                                <th>الوردية</th>
                                <th>الساعات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(r => {
                                const dateStr = new Date(r.created_at).toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                });
                                
                                const timeStr = new Date(r.created_at).toLocaleTimeString('ar-EG', {
                                    hour12: true,
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return `
                                    <tr>
                                        <td style="font-size:12px;">${dateStr}</td>
                                        <td>
                                            <span class="att-badge ${r.type === 'حضور' ? 'att-in' : 'att-out'}">
                                                ${r.type}
                                            </span>
                                        </td>
                                        <td style="font-size:11px;">${timeStr}</td>
                                        <td style="font-size:11px;">${r.shift || '-'}</td>
                                        <td style="font-weight:bold; color:${r.hours_worked ? '#38bdf8' : '#64748b'}">
                                            ${r.hours_worked || '-'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                bodyEl.innerHTML = '<center style="color:#64748b; padding:30px;">لا توجد سجلات في هذه الفترة</center>';
            }

        } catch(e) {
            console.error('Report fetch error:', e);
            bodyEl.innerHTML = '<center style="color:#ef4444; padding:20px;">فشل تحميل التقرير</center>';
        }
    }

    closeReportModal() {
        const modal = document.getElementById('reportModal');
        if (modal) modal.classList.remove('active');
    }

    // ============================================
    // 🎯 HANDLE ATTENDANCE WITH FACE (يستدعى من face-recognition.js)
    // ============================================

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
        
        const threshold = AppConfig?.faceRecognition?.recognition?.threshold || 0.55;

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

            const { error } = await db.from('attendance').insert({
                employee_code: window.user.code,
                employee_name: window.user.name,
                type: window.attType,
                location_link: window.currentLoc || 'غير متوفر',
                shift: selShift ? selShift.value : 'لم يتم التحديد',
                hours_worked: hoursWorked
            });

            if (error) throw error;

            // Success!
            playSound?.('faceid-success');
            showToast?.(`تم تسجيل ${window.attType} بنجاح ${hoursWorked ? '(' + hoursWorked + ')' : ''}`, 'success');

            setTimeout(() => {
                closeCamera?.();
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
            playSound?.('faceid-error');
            showMatchResult?.(false);
            showToast?.('فشل التسجيل', 'error');
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
            if (typeof db === 'undefined') throw new Error('Database not available');

            const { error } = await db.from('employees')
                .update({ password: pending.newPassword })
                .eq('code', pending.code)
                .eq('password', pending.oldPassword);

            if (!error) {
                playSound?.('login-success');
                showToast?.('تم تغيير كلمة المرور', 'success');
                
                setTimeout(() => closeCamera?.(), 800);
            } else {
                playSound?.('login-error');
                showToast?.('كلمة السر الحالية خاطئة', 'error');
                faceRecognition?.restartCamLoop();
            }

        } catch(e) {
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
    if (typeof attendance !== 'undefined' && window.user) {
        await attendance.loadTodayRecords();
        await attendance.calculateMonthlyHours();
        
        // Also load user's face descriptor
        if (typeof db !== 'undefined') {
            try {
                const { data: emp } = await db.from('employees')
                    .select('face_descriptor')
                    .eq('code', window.user.code)
                    .single();

                if (emp?.face_descriptor) {
                    window.sessionDescriptor = emp.face_descriptor;
                    
                    // Load user image
                    const { data: imgData } = db.storage.from('faces')
                        .getPublicUrl(`${window.user.code}_face.jpg`);
                    
                    if (imgData?.publicUrl) {
                        window.userImage = imgData.publicUrl + '?t=' + new Date().getTime();
                        
                        const profileImg = document.querySelector('.emp-profile-img');
                        if (profileImg) profileImg.src = window.userImage;
                    }
                } else if (!document.getElementById('cameraOverlay')?.classList.contains('active')) {
                    // No face descriptor - need to register
                    playSound?.('faceid-error');
                    showToast?.('يرجى تسجيل بصمة وجهك أولاً', 'error');
                    
                    window.firstTimeSetupMode = true;
                    if (typeof openCamera === 'function') {
                        await openCamera();
                    }
                }
            } catch(e) {
                console.error('Error fetching user data:', e);
            }
        }
        
        setStatus?.('النظام جاهز');
    }
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
