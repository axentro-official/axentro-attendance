/**
 * ============================================
 * ⏰ AXENTRO ATTENDANCE MANAGER v4.0
 * ✅ Check-in/Check-out & Time Tracking
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
        
        this.init();
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize attendance manager
     */
    init() {
        console.log('⏰ Attendance Manager initialized');
    }

    // ============================================
    // 📍 LOCATION TRACKING
    // ============================================

    /**
     * Get current location
     * @returns {Promise<object>} Location data
     */
    async getCurrentLocation() {
        try {
            const location = await Utils.getLocation({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });

            this.currentLocation = location;

            // Update UI
            const statusEl = document.getElementById('locationStatus');
            if (statusEl) {
                statusEl.textContent = `📍 دقة: ${Math.round(location.accuracy)}م`;
                statusEl.classList.add('text-success');
            }

            return location;

        } catch (error) {
            console.error('Location error:', error);
            
            const statusEl = document.getElementById('locationStatus');
            if (statusEl) {
                statusEl.textContent = '❌ تعذر تحديد الموقع';
                statusEl.classList.add('text-danger');
            }

            return null;
        }
    }

    /**
     * Generate Google Maps link from current location
     * @returns {string|null} Maps URL or null
     */
    getLocationLink() {
        if (!this.currentLocation) return null;

        return Utils.getMapsLink(
            this.currentLocation.latitude,
            this.currentLocation.longitude
        );
    }

    // ============================================
    // 📊 TODAY'S RECORDS
    // ============================================

    /**
     * Load today's attendance records for current user
     */
    async loadTodayRecords() {
        try {
            if (!auth.isAuthenticated()) return;

            const userCode = auth.getUserCode();
            this.todayRecords = await db.getTodayAttendance(userCode);

            // Determine current status
            this.determineCurrentStatus();

            // Update UI
            this.updateTodaySummary();

            console.log(`📋 Loaded ${this.todayRecords.length} today's records`);

        } catch (error) {
            console.error('Load today records error:', error);
        }
    }

    /**
     * Determine current check-in/check-out status
     */
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

    /**
     * Update UI with today's summary
     */
    updateTodaySummary() {
        // Update times
        const checkInTimeEl = document.getElementById('checkInTime');
        const checkOutTimeEl = document.getElementById('checkOutTime');

        if (checkInTimeEl && this.lastCheckIn) {
            checkInTimeEl.textContent = Utils.formatDate(this.lastCheckIn.created_at, 'time');
        }

        if (checkOutTimeEl && this.lastCheckOut) {
            checkOutTimeEl.textContent = Utils.formatDate(this.lastCheckOut.created_at, 'time');
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

        // Update display
        const totalHoursEl = document.getElementById('totalHoursToday');
        const overtimeEl = document.getElementById('overtimeToday');
        const todayHoursEl = document.getElementById('todayHours');

        if (totalHoursEl) {
            totalHoursEl.textContent = Utils.formatHoursWorked(totalHours);
        }

        if (overtimeEl) {
            overtimeEl.textContent = overtimeHours > 0 
                ? `${overtimeHours.toFixed(1)} ساعة` 
                : 'لا يوجد';
        }

        if (todayHoursEl) {
            todayHoursEl.textContent = totalHours.toFixed(1);
        }

        // Update action buttons state
        this.updateActionButtons();
    }

    /**
     * Update action buttons based on current status
     */
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
            
            checkInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>✓ تم الحضور</span>';
            checkOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>انصراف</span>';

        } else {
            // User is checked out - show checkin button active
            checkInBtn.disabled = false;
            checkInBtn.classList.remove('disabled');
            checkOutBtn.disabled = true;
            checkOutBtn.classList.add('disabled');
            
            checkInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>حضور</span>';
            checkOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>✓ تم الانصراف</span>';
        }
    }

    // ============================================
    // ✅ CHECK-IN / CHECK-OUT OPERATIONS
    // ============================================

    /**
     * Handle check-in action
     */
    async handleCheckIn() {
        await this.recordAttendance('حضور');
    }

    /**
     * Handle check-out action
     */
    async handleCheckOut() {
        await this.recordAttendance('انصراف');
    }

    /**
     * Record attendance (main function)
     * @param {string} type - 'حضور' or 'انصراف'
     */
    async recordAttendance(type) {
        // Prevent double-clicks
        if (this.isProcessing) {
            ui.showWarning('جاري المعالجة... يرجى الانتظار');
            return;
        }

        // Check cooldown
        if (this.isOnCooldown()) {
            ui.showError(ErrorCodes.ATTENDANCE_COOLDOWN_ACTIVE.message);
            return;
        }

        // Validate user is authenticated
        if (!auth.isAuthenticated()) {
            ui.showError(ErrorCodes.AUTH_SESSION_EXPIRED.message);
            ui.navigateTo('loginPage');
            return;
        }

        // Validate shift selection
        const selectedShift = this.getSelectedShift();
        if (!selectedShift) {
            ui.showError(ErrorCodes.ATTENDANCE_NO_SHIFT_SELECTED.message);
            return;
        }

        // Check if opposite action already exists
        if (type === 'حضور' && this.currentStatus === 'in') {
            ui.showError(ErrorCodes.ATTENDANCE_ALREADY_CHECKED_IN.message);
            return;
        }

        if (type === 'انصراف' && this.currentStatus === 'out') {
            ui.showError(ErrorCodes.ATTENDANCE_ALREADY_CHECKED_OUT.message);
            return;
        }

        // Start processing
        this.isProcessing = true;
        const btnId = type === 'حضور' ? 'checkInBtn' : 'checkOutBtn';
        const btn = document.getElementById(btnId);

        ui.showButtonLoading(btn, type === 'حضور' ? 'جاري تسجيل الحضور...' : 'جاري تسجيل الانصراف...');

        try {
            // Step 1: Recognize face (if camera available)
            let recognizedFace = null;
            if (faceRecognition.isCameraRunning()) {
                try {
                    recognizedFace = await faceRecognition.recognizeForAttendance();
                    
                    // Verify recognized face matches logged in user
                    if (recognizedFace && recognizedFace.code !== auth.getUserCode()) {
                        throw new Error('الوجه لا يتطابق مع المستخدم المسجل');
                    }
                } catch (faceError) {
                    console.warn('Face recognition failed, continuing...', faceError);
                    // Continue without face recognition (optional based on requirements)
                }
            }

            // Step 2: Get location
            await this.getCurrentLocation();
            const locationLink = this.getLocationLink();

            // Step 3: Calculate hours worked (for check-out)
            let hoursWorked = null;
            let overtime = null;

            if (type === 'انصراف' && this.lastCheckIn) {
                const checkInTime = new Date(this.lastCheckIn.created_at);
                const now = new Date();
                const diff = Utils.calculateTimeDifference(checkInTime, now);
                
                hoursWorked = diff.totalHours.toFixed(2);
                
                // Calculate overtime
                const overtimeCalc = Utils.calculateOvertime(
                    parseFloat(hoursWorked),
                    AppConfig.attendance.normalHours
                );
                
                overtime = overtimeCalc.hasOvertime 
                    ? `${overtimeCalc.overtimeHours} ساعة` 
                    : 'لا يوجد';
            }

            // Step 4: Capture image (if camera available)
            let imageUrl = null;
            if (faceRecognition.currentVideoElement && faceRecognition.canvasElement) {
                try {
                    const photo = faceRecognition.capturePhoto(
                        faceRecognition.currentVideoElement,
                        faceRecognition.canvasElement
                    );
                    
                    // Compress image
                    const compressedImage = await Utils.compressImage(photo.base64, 640, 0.7);
                    
                    // Upload to storage
                    imageUrl = await db.uploadFaceImage(compressedImage, `${auth.getUserCode()}_${type}`);
                } catch (imgError) {
                    console.warn('Image capture failed:', imgError);
                }
            }

            // Step 5: Prepare attendance record
            const attendanceData = {
                employee_code: auth.getUserCode(),
                employee_name: auth.getUserName(),
                type: type,
                locationLink: locationLink,
                shift: selectedShift,
                hoursWorked: hoursWorked,
                overtime: overtime,
                gpsAccuracy: this.currentLocation?.accuracy,
                imageUrl: imageUrl
            };

            // Step 6: Save to database
            const result = await db.recordAttendance(attendanceData);

            if (result.success) {
                // Success!
                this.onAttendanceSuccess(type, result.record);
                
            } else {
                throw new Error(result.error || 'فشل تسجيل الحضور');
            }

        } catch (error) {
            console.error(`${type} error:`, error);
            this.onAttendanceError(error, type);
            
        } finally {
            this.isProcessing = false;
            ui.hideButtonLoading(btn);
            
            // Set cooldown
            this.lastActionTime = Date.now();
        }
    }

    /**
     * Handle successful attendance recording
     * @param {string} type - Attendance type
     * @param {object} record - Saved record
     */
    onAttendanceSuccess(type, record) {
        // Play success feedback
        ui.playSuccessFeedback();
        
        // Show success message
        const message = type === 'حضور' 
            ? SuccessMessages.CHECK_IN_SUCCESS 
            : SuccessMessages.CHECK_OUT_SUCCESS;
        
        ui.showSuccess(message);

        // Add to local records
        this.todayRecords.push(record);
        
        // Update status
        this.determineCurrentStatus();
        this.updateTodaySummary();

        // If check-out completed, show summary modal
        if (type === 'انصراف') {
            setTimeout(() => {
                this.showCheckoutSummary(record);
            }, 1000);
        }
    }

    /**
     * Handle attendance error
     * @param {Error} error - Error object
     * @param {string} type - Attempted type
     */
    onAttendanceError(error, type) {
        ui.playErrorFeedback();
        ui.showError(error.message || 'فشل في العملية');
        
        console.error(`Attendance ${type} error:`, error);
    }

    /**
     * Show checkout summary modal
     * @param {object} record - Checkout record
     */
    async showCheckoutSummary(record) {
        const hours = parseFloat(record.hours_worked) || 0;
        const overtimeInfo = Utils.calculateOvertime(hours);

        await ui.showConfirmation({
            title: '✅ ملخص اليوم',
            message: `
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
                        <div>
                            <small style="color: var(--text-muted);">إجمالي الساعات</small>
                            <h3 style="color: var(--primary-400);">${Utils.formatHoursWorked(hours)}</h3>
                        </div>
                        <div>
                            <small style="color: var(--text-muted);">الأوفر تايم</small>
                            <h3 style="color: ${overtimeInfo.hasOvertime ? 'var(--success-500)' : 'var(--text-muted)'}">
                                ${overtimeInfo.overtimeFormatted}
                            </h3>
                        </div>
                    </div>
                    <p style="font-size: 14px; color: var(--text-secondary);">
                        وقت الخروج: ${Utils.formatDate(record.created_at, 'time')}
                    </p>
                </div>
            `,
            confirmText: 'حسناً',
            cancelText: '',
            type: 'success',
            icon: null
        });
    }

    // ============================================
    // 🔧 UTILITY METHODS
    // ============================================

    /**
     * Get selected shift from form
     * @returns {string|null} Selected shift ID or null
     */
    getSelectedShift() {
        const checkedShift = document.querySelector('input[name="shift"]:checked');
        return checkedShift?.value || null;
    }

    /**
     * Check if action is on cooldown
     * @returns {boolean} On cooldown status
     */
    isOnCooldown() {
        const timeSinceLastAction = Date.now() - this.lastActionTime;
        return timeSinceLastAction < AppConfig.attendance.cooldownPeriod;
    }

    /**
     * Get remaining cooldown time in seconds
     * @returns {number} Remaining seconds
     */
    getRemainingCooldown() {
        const timeSinceLastAction = Date.now() - this.lastActionTime;
        const remaining = AppConfig.attendance.cooldownPeriod - timeSinceLastAction;
        return Math.max(0, Math.ceil(remaining / 1000));
    }

    /**
     * Format attendance record for display
     * @param {object} record - Attendance record
     * @returns {HTMLElement} Formatted row element
     */
    formatRecordForDisplay(record) {
        return ui.formatAttendanceRow(record);
    }

    /**
     * Reset daily state (call at midnight or new day)
     */
    resetDailyState() {
        this.todayRecords = [];
        this.currentStatus = 'out';
        this.lastCheckIn = null;
        this.lastCheckOut = null;
        this.lastActionTime = 0;
        
        console.log('🔄 Daily attendance state reset');
    }

    /**
     * Get attendance statistics for date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<object>} Statistics object
     */
    async getStatistics(startDate, endDate) {
        try {
            const userCode = auth.getUserCode();
            const monthlyData = await db.getMonthlySummary(
                userCode,
                startDate.getMonth() + 1,
                startDate.getFullYear()
            );

            return monthlyData.summary;

        } catch (error) {
            console.error('Get statistics error:', error);
            return {};
        }
    }

    /**
     * Export attendance data
     * @param {string} format - Export format ('csv', 'json')
     * @param {Array} records - Records to export
     * @returns {void}
     */
    exportData(format, records) {
        let content = '';
        let filename = '';
        let mimeType = '';

        switch (format.toLowerCase()) {
            case 'csv':
                content = this.convertToCSV(records);
                filename = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
                break;
                
            case 'json':
                content = JSON.stringify(records, null, 2);
                filename = `attendance_${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
                break;
                
            default:
                throw new Error('Unsupported format');
        }

        Utils.downloadFile(content, filename, mimeType);
        ui.showSuccess(SuccessMessages.DATA_EXPORTED);
    }

    /**
     * Convert records to CSV format
     * @param {Array} records - Attendance records
     * @returns {string} CSV string
     */
    convertToCSV(records) {
        if (!records.length) return '';

        const headers = ['التاريخ', 'الحالة', 'الوقت', 'الوردية', 'الساعات', 'الأوفر تايم'];
        const rows = records.map(record => [
            Utils.formatDate(record.created_at, 'short'),
            record.type,
            Utils.formatDate(record.created_at, 'time'),
            record.shift,
            record.hours_worked || '-',
            record.overtime || '-'
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }
}

// Create global instance
const attendance = new AttendanceManager();

// Export for use in other modules
window.AttendanceManager = AttendanceManager;
window.attendance = attendance;
