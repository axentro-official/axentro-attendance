/**
 * ============================================
 * ⏰ AXENTRO ATTENDANCE MANAGER v4.1 - ROBUST
 * ✅ Check-in/Check-out & Time Tracking
 * 🚀 محسّن مع Error Handling قوي و Graceful Degradation
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

    /**
     * Initialize attendance manager
     */
    init() {
        console.log('✅ Attendance Manager ready');
    }

    // ============================================
    // 📍 LOCATION TRACKING
    // ============================================

    /**
     * Get current location with timeout and fallback
     * @returns {Promise<object|null>} Location data
     */
    async getCurrentLocation() {
        try {
            const location = await Utils.getLocation({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000 // Accept location from last minute
            });
            
            this.currentLocation = location;

            // Update UI status
            this.updateLocationStatus(true, location.accuracy);

            return location;

        } catch (error) {
            console.warn('⚠️ Location error:', error.message);
            
            // Update UI to show warning (not error - don't block attendance)
            this.updateLocationStatus(false);
            
            return null;
        }
    }

    /**
     * Update location status in UI
     * @param {boolean} success - Whether location was obtained
     * @param {number} accuracy - GPS accuracy in meters
     */
    updateLocationStatus(success, accuracy = null) {
        const statusEl = document.getElementById('locationStatus');
        
        if (!statusEl) return;

        if (success && accuracy) {
            statusEl.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                دقة: ${Math.round(accuracy)}م
            `;
            statusEl.className = 'text-success';
        } else {
            statusEl.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                الموقع غير متوفر
            `;
            statusEl.className = 'text-warning';
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
            if (typeof auth === 'undefined' || !auth.isAuthenticated()) {
                console.warn('⚠️ Cannot load records - not authenticated');
                return;
            }

            const userCode = auth.getUserCode();
            
            if (typeof db === 'undefined' || typeof db.getTodayAttendance !== 'function') {
                console.warn('⚠️ Database module not available for loading records');
                return;
            }

            this.todayRecords = await db.getTodayAttendance(userCode);

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

    /**
     * Determine current check-in/check-out status based on records
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
     * Update UI with today's summary information
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

        // Update display elements
        const totalHoursEl = document.getElementById('totalHoursToday');
        const overtimeEl = document.getElementById('overtimeToday');
        const todayHoursEl = document.getElementById('todayHours');

        if (totalHoursEl) {
            totalHoursEl.textContent = Utils.formatHoursWorked(totalHours);
        }

        if (overtimeEl) {
            overtimeEl.textContent = overtimeHours > 0 ? 
                `${overtimeHours.toFixed(1)} ساعة` : 
                'لا يوجد';
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
            
            checkInBtn.innerHTML = '<i class="fas fa-check"></i><span>تم الحضور</span>';
            checkOutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>انصراف</span>';
        } else {
            // User is checked out - show checkin button active
            checkInBtn.disabled = false;
            checkInBtn.classList.remove('disabled');
            checkOutBtn.disabled = true;
            checkOutBtn.classList.add('disabled');
            
            checkInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>حضور</span>';
            checkOutBtn.innerHTML = '<i class="fas fa-check"></i><span>تم الانصراف</span>';
        }
    }

    // ============================================
    // ✅ CHECK-IN / CHECK-OUT OPERATIONS
    // ============================================

    /**
     * Handle check-in button click
     */
    async handleCheckIn() {
        await this.recordAttendance('حضور');
    }

    /**
     * Handle check-out button click
     */
    async handleCheckOut() {
        await this.recordAttendance('انصراف');
    }

    /**
     * Record attendance (main function)
     * @param {string} type - 'حضور' or 'انصراف'
     */
    async recordAttendance(type) {
        // Prevent double-clicks / processing
        if (this.isProcessing) {
            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('جاري المعالجة... يرجى الانتظار');
            }
            return;
        }

        // Check cooldown period
        if (this.isOnCooldown()) {
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(ErrorCodes.ATTENDANCE_COOLDOWN_ACTIVE.message);
            }
            return;
        }

        // Validate user is authenticated
        if (typeof auth === 'undefined' || !auth.isAuthenticated()) {
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(ErrorCodes.AUTH_SESSION_EXPIRED.message);
            }
            if (typeof app !== 'undefined' && app.navigateTo) {
                app.navigateTo('loginPage');
            }
            return;
        }

        // Validate shift selection
        const selectedShift = this.getSelectedShift();
        if (!selectedShift) {
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(ErrorCodes.ATTENDANCE_NO_SHIFT_SELECTED.message);
            }
            return;
        }

        // Check if opposite action already exists
        if (type === 'حضور' && this.currentStatus === 'in') {
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(ErrorCodes.ATTENDANCE_ALREADY_CHECKED_IN.message);
            }
            return;
        }

        if (type === 'انصراف' && this.currentStatus === 'out') {
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError(ErrorCodes.ATTENDANCE_ALREADY_CHECKED_OUT.message);
            }
            return;
        }

        // Start processing
        this.isProcessing = true;
        
        const btnId = type === 'حضور' ? 'checkInBtn' : 'checkOutBtn';
        const btn = document.getElementById(btnId);
        
        const loadingText = type === 'حضور' ? 
            'جاري تسجيل الحضور...' : 
            'جاري تسجيل الانصراف...';

        if (typeof ui !== 'undefined' && ui.showButtonLoading) {
            ui.showButtonLoading(btn, loadingText);
        }

        try {
            // Step 1: Try face recognition (optional - non-critical)
            let recognizedFace = null;
            
            if (window.faceRecognitionAvailable !== false && 
                typeof faceRecognition !== 'undefined' && 
                faceRecognition.isCameraRunning?.()) {
                
                try {
                    recognizedFace = await faceRecognition.recognizeForAttendance();
                    
                    // Verify recognized face matches logged in user
                    if (recognizedFace && auth.getUserCode() && 
                        recognizedFace.code !== auth.getUserCode()) {
                        throw new Error('الوجه لا يتطابق مع المستخدم المسجل');
                    }
                } catch (faceError) {
                    console.warn('⚠️ Face recognition failed, continuing without it:', faceError.message);
                    // Continue without face recognition - don't block the operation!
                }
            }

            // Step 2: Get location (non-blocking)
            await this.getCurrentLocation();
            const locationLink = this.getLocationLink();

            // Step 3: Calculate hours worked (for check-out only)
            let hoursWorked = null;
            let overtime = null;

            if (type === 'انصراف' && this.lastCheckIn) {
                const checkInTime = new Date(this.lastCheckIn.created_at);
                const now = new Date();
                
                const diff = Utils.calculateTimeDifference(checkInTime, now);
                hoursWorked = diff.totalHours.toFixed(2);

                // Calculate overtime
                const normalHours = AppConfig?.attendance?.normalHours || 9;
                const overtimeCalc = Utils.calculateOvertime(parseFloat(hoursWorked), normalHours);
                
                overtime = overtimeCalc.hasOvertime ? 
                    `${overtimeCalc.overtimeHours} ساعة` : 
                    'لا يوجد';
            }

            // Step 4: Capture image (if camera available - optional)
            let imageUrl = null;
            
            if (window.faceRecognitionAvailable !== false &&
                typeof faceRecognition !== 'undefined' && 
                faceRecognition.currentVideoElement && 
                faceRecognition.canvasElement) {
                
                try {
                    const photo = faceRecognition.capturePhoto(
                        faceRecognition.currentVideoElement,
                        faceRecognition.canvasElement
                    );
                    
                    // Compress image for upload
                    const compressedImage = await Utils.compressImage(photo.base64, 640, 0.7);
                    
                    // Upload to storage if db supports it
                    if (typeof db !== 'undefined' && typeof db.uploadFaceImage === 'function') {
                        imageUrl = await db.uploadFaceImage(
                            compressedImage, 
                            `${auth.getUserCode()}_${type}`
                        );
                    }
                } catch (imgError) {
                    console.warn('⚠️ Image capture failed:', imgError.message);
                    // Continue without image - non-critical
                }
            }

            // Step 5: Prepare attendance record data
            const attendanceData = {
                employee_code: auth.getUserCode(),
                employee_name: auth.getUserName(),
                type: type,
                location_link: locationLink,
                shift: selectedShift,
                hours_worked: hoursWorked,
                overtime: overtime,
                gps_accuracy: this.currentLocation?.accuracy,
                image_url: imageUrl
            };

            // Step 6: Save to database
            if (typeof db === 'undefined' || typeof db.recordAttendance !== 'function') {
                throw new Error('Database module not available');
            }

            const result = await db.recordAttendance(attendanceData);

            if (result.success) {
                // Success! Update UI and state
                this.onAttendanceSuccess(type, result.record);
            } else {
                throw new Error(result.error || 'فشل تسجيل الحضور');
            }

        } catch (error) {
            console.error(`${type} error:`, error);
            this.onAttendanceError(error, type);
        } finally {
            this.isProcessing = false;
            
            if (typeof ui !== 'undefined' && ui.hideButtonLoading) {
                ui.hideButtonLoading(btn);
            }

            // Set cooldown timestamp
            this.lastActionTime = Date.now();
        }
    }

    /**
     * Handle successful attendance recording
     * @param {string} type - Attendance type
     * @param {object} record - Saved record object
     */
    onAttendanceSuccess(type, record) {
        // Play success feedback
        if (typeof ui !== 'undefined' && ui.playSuccessFeedback) {
            ui.playSuccessFeedback();
        }

        // Show success message
        const message = type === 'حضور' ? 
            SuccessMessages.CHECK_IN_SUCCESS : 
            SuccessMessages.CHECK_OUT_SUCCESS;

        if (typeof ui !== 'undefined' && ui.showSuccess) {
            ui.showSuccess(message);
        }

        // Vibrate on success (haptic feedback)
        Utils.vibrate([100, 50, 100]);

        // Add to local records array
        if (record) {
            this.todayRecords.push(record);
        }

        // Update UI state
        this.determineCurrentStatus();
        this.updateTodaySummary();

        console.log(`✅ ${type} recorded successfully`);
    }

    /**
     * Handle attendance recording error
     * @param {Error} error - Error object
     * @param {string} type - Attendance type that failed
     */
    onAttendanceError(error, type) {
        console.error(`❌ ${type} recording failed:`, error.message);

        // Play error feedback
        if (typeof ui !== 'undefined' && ui.playErrorFeedback) {
            ui.playErrorFeedback();
        }

        // Show user-friendly error message
        if (typeof ui !== 'undefined' && ui.showError) {
            ui.showError(error.message || `فشل تسجيل ${type}`);
        }
    }

    // ============================================
    // 🎛️ SHIFT SELECTION
    // ============================================

    /**
     * Get currently selected shift
     * @returns {string|null} Selected shift ID or null
     */
    getSelectedShift() {
        const selectedRadio = document.querySelector('input[name="shift"]:checked');
        return selectedRadio?.value || null;
    }

    // ============================================
    // ⏱️ COOLDOWN MANAGEMENT
    // ============================================

    /**
     * Check if action is on cooldown
     * @returns {boolean}
     */
    isOnCooldown() {
        const cooldownPeriod = AppConfig?.attendance?.cooldownPeriod || 60000; // Default 1 minute
        
        if (Date.now() - this.lastActionTime < cooldownPeriod) {
            return true;
        }
        return false;
    }

    /**
     * Get remaining cooldown time in seconds
     * @returns {number}
     */
    getRemainingCooldown() {
        const cooldownPeriod = AppConfig?.attendance?.cooldownPeriod || 60000;
        const elapsed = Date.now() - this.lastActionTime;
        const remaining = Math.ceil((cooldownPeriod - elapsed) / 1000);
        
        return Math.max(0, remaining);
    }

    // ============================================
    // 📈 STATISTICS & REPORTING HELPERS
    // ============================================

    /**
     * Get today's statistics summary
     * @returns {object} Today's stats
     */
    getTodayStats() {
        const totalRecords = this.todayRecords.length;
        const checkIns = this.todayRecords.filter(r => r.type === 'حضور').length;
        const checkOuts = this.todayRecords.filter(r => r.type === 'انصراف').length;

        let totalHours = 0;
        let overtimeHours = 0;

        this.todayRecords.forEach(record => {
            const hours = parseFloat(record.hours_worked) || 0;
            totalHours += hours;

            const otMatch = record.overtime?.match(/[\d.]+/);
            if (otMatch) {
                overtimeHours += parseFloat(otMatch[0]);
            }
        });

        return {
            totalRecords,
            checkIns,
            checkOuts,
            totalHours,
            overtimeHours,
            currentStatus: this.currentStatus,
            firstCheckIn: this.lastCheckIn,
            lastCheckOut: this.lastCheckOut
        };
    }

    /**
     * Format attendance record for display
     * @param {object} record - Attendance record
     * @returns {object} Formatted record
     */
    formatRecordForDisplay(record) {
        return {
            date: Utils.formatDate(record.created_at, 'date'),
            time: Utils.formatDate(record.created_at, 'time'),
            type: record.type,
            shift: record.shift || '-',
            hours: record.hours_worked || '-',
            overtime: record.overtime || 'لا يوجد',
            location: record.location_link ? '📍' : '-'
        };
    }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================

/**
 * Global attendance manager instance
 */
let attendance;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    attendance = new AttendanceManager();
    attendance.init();
    
    console.log('⏰ Attendance module loaded');
});

console.log('✅ attendance.js v4.1 loaded successfully');
