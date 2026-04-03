/**
 * ============================================
 * 📊 AXENTRO REPORTS MANAGER v4.1 - ENHANCED
 * ✅ Reports, Statistics & Export Functionality
 * 📈 محسّن مع PDF/Excel Export و Advanced Charts
 * ============================================
 */

class ReportsManager {
    constructor() {
        this.currentReportData = [];
        this.dateRange = { start: null, end: null };
        
        console.log('📊 Reports Manager initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize reports manager
     */
    init() {
        this.setupEventListeners();
        this.setDefaultDates();
        
        console.log('✅ Reports Manager ready');
    }

    /**
     * Setup event listeners for report controls
     */
    setupEventListeners() {
        // Apply date range button
        const applyBtn = document.getElementById('applyDateRange');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyDateRange());
        }

        // Export buttons
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportToPDF());
        }

        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }
    }

    // ============================================
    // 📅 DATE RANGE MANAGEMENT
    // ============================================

    /**
     * Set default date range (current month)
     */
    setDefaultDates() {
        const startDateInput = document.getElementById('reportStartDate');
        const endDateInput = document.getElementById('reportEndDate');

        if (startDateInput && endDateInput) {
            const today = new Date();
            const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            startDateInput.value = firstOfMonth.toISOString().split('T')[0];
            endDateInput.value = today.toISOString().split('T')[0];

            this.dateRange = {
                start: firstOfMonth,
                end: today
            };
        }
    }

    /**
     * Apply selected date range and load data
     */
    async applyDateRange() {
        try {
            const startDateInput = document.getElementById('reportStartDate');
            const endDateInput = document.getElementById('reportEndDate');

            if (!startDateInput || !endDateInput) {
                if (typeof ui !== 'undefined' && ui.showError) {
                    ui.showError('يرجى تحديد نطاق التاريخ');
                }
                return;
            }

            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);

            // Validate dates
            if (startDate > endDate) {
                if (typeof ui !== 'undefined' && ui.showError) {
                    ui.showError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
                }
                return;
            }

            // Update date range
            this.dateRange = { start: startDate, end: endDate };

            // Show loading state
            if (typeof ui !== 'undefined' && ui.showInfo) {
                ui.showInfo('جاري تحميل البيانات...');
            }

            // Load attendance records
            await this.loadReportData();

        } catch (error) {
            console.error('❌ Apply date range error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError('فشل تحميل بيانات التقرير');
            }
        }
    }

    /**
     * Load report data based on current date range
     */
    async loadReportData() {
        try {
            if (typeof auth === 'undefined' || !auth.isAuthenticated()) {
                throw new Error('Not authenticated');
            }

            if (typeof db === 'undefined') {
                throw new Error('Database not available');
            }

            const userCode = auth.getUserCode();
            
            const records = await db.getAttendanceByRange(
                userCode,
                this.dateRange.start,
                this.dateRange.end
            );

            this.currentReportData = records;

            // Update UI with results
            this.updateReportStats(records);
            this.populateReportTable(records);

            console.log(`📊 Loaded ${records.length} records`);

        } catch (error) {
            console.error('❌ Load report data error:', error);
            this.currentReportData = [];
            this.populateReportTable([]);
        }
    }

    // ============================================
    // 📈 STATISTICS & CALCULATIONS
    // ============================================

    /**
     * Calculate statistics from attendance records
     * @param {Array} records - Attendance records
     * @returns {object} Statistics object
     */
    calculateStatistics(records) {
        if (!records || !records.length) {
            return {
                totalDays: 0,
                totalHours: 0,
                overtimeHours: 0,
                averageDailyHours: 0,
                checkIns: 0,
                checkOuts: 0,
                presentDays: 0,
                absentDays: 0
            };
        }

        let totalHours = 0;
        let overtimeHours = 0;
        let checkIns = 0;
        let checkOuts = 0;

        // Get unique days present
        const uniqueDays = new Set();

        records.forEach(record => {
            const date = new Date(record.created_at).toDateString();
            uniqueDays.add(date);

            // Count by type
            if (record.type === 'حضور') checkIns++;
            if (record.type === 'انصراف') checkOuts++;

            // Sum hours
            const hours = parseFloat(record.hours_worked) || 0;
            totalHours += hours;

            // Sum overtime
            const otMatch = record.overtime?.match(/[\d.]+/);
            if (otMatch) {
                overtimeHours += parseFloat(otMatch[0]);
            }
        });

        const presentDays = uniqueDays.size;

        return {
            totalDays: records.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            overtimeHours: parseFloat(overtimeHours.toFixed(2)),
            averageDailyHours: presentDays > 0 ? 
                               parseFloat((totalHours / presentDays).toFixed(2)) : 0,
            checkIns,
            checkOuts,
            presentDays,
            absentDays: 0 // Would need work schedule to calculate
        };
    }

    /**
     * Update statistics display in UI
     * @param {Array} records - Attendance records
     */
    updateReportStats(records) {
        const stats = this.calculateStatistics(records);

        // Update stat elements
        const daysPresentEl = document.getElementById('daysPresentStat');
        const totalHoursEl = document.getElementById('totalHoursStat');
        const overtimeHoursEl = document.getElementById('overtimeHoursStat');

        if (daysPresentEl) {
            daysPresentEl.textContent = stats.presentDays;
            // Animate the number
            if (typeof ui !== 'undefined' && ui.animateStatValue) {
                ui.animateStatValue('daysPresentStat', stats.presentDays);
            }
        }

        if (totalHoursEl) {
            totalHoursEl.textContent = stats.totalHours.toFixed(1);
        }

        if (overtimeHoursEl) {
            overtimeHoursEl.textContent = stats.overtimeHours.toFixed(1);
        }
    }

    // ============================================
    // 📋 TABLE POPULATION
    // ============================================

    /**
     * Populate report table with data
     * @param {Array} records - Attendance records to display
     */
    populateReportTable(records) {
        const tbody = document.getElementById('reportsTableBody');
        
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        if (!records || records.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">
                        <i class="fas fa-inbox"></i>
                        <p>لا توجد سجلات في هذه الفترة</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort records by date descending
        const sortedRecords = [...records].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // Create table rows
        sortedRecords.forEach((record, index) => {
            const row = document.createElement('tr');
            
            // Format date and time
            const dateStr = Utils.formatDate(record.created_at, 'date');
            const timeStr = Utils.formatDate(record.created_at, 'time');

            // Determine type badge class
            const typeClass = record.type === 'حضور' ? 
                              'badge-success' : 
                              'badge-danger';

            row.innerHTML = `
                <td>${dateStr}</td>
                <td><span class="badge ${typeClass}">${record.type}</span></td>
                <td>${timeStr}</td>
                <td>${record.shift || '-'}</td>
                <td>${record.hours_worked || '-'}</td>
                <td>${record.overtime || '-'}</td>
            `;

            // Add hover effect
            row.style.cursor = 'pointer';
            
            // Alternate row colors
            if (index % 2 === 0) {
                row.classList.add('even-row');
            }

            tbody.appendChild(row);
        });

        console.log(`✅ Populated table with ${records.length} rows`);
    }

    // ============================================
    // 📤 EXPORT FUNCTIONALITY
    // ============================================

    /**
     * Export report to CSV/Excel format
     */
    async exportToExcel() {
        try {
            if (!this.currentReportData || !this.currentReportData.length) {
                if (typeof ui !== 'undefined' && ui.showWarning) {
                    ui.showWarning('لا توجد بيانات للتصدير');
                }
                return;
            }

            // Prepare data for export
            const exportData = this.currentRecord.map(record => ({
                'التاريخ': Utils.formatDate(record.created_at, 'date'),
                'الوقت': Utils.formatDate(record.created_at, 'time'),
                'الحالة': record.type,
                'الوردية': record.shift || '-',
                'الساعات': record.hours_worked || '-',
                'الأوفر تايم': record.overtime || '-'
            }));

            // Generate filename with date range
            const startDate = this.dateRange.start ? 
                             Utils.formatDate(this.dateRange.start, 'date') : 
                             'start';
            const endDate = this.dateRange.end ? 
                           Utils.formatDate(this.dateRange.end, 'date') : 
                           'end';

            const filename = `تقرير_الحضور_${startDate}_${endDate}.csv`;

            // Use utility function to export
            Utils.exportToCSV(exportData, filename);

            if (typeof ui !== 'undefined' && ui.showSuccess) {
                ui.showSuccess('✅ تم تصدير التقرير بنجاح');
            }

            console.log(`📥 Exported ${exportData.length} records to Excel/CSV`);

        } catch (error) {
            console.error('❌ Export Excel error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError('فشل تصدير التقرير');
            }
        }
    }

    /**
     * Export report to PDF (using browser print)
     */
    async exportToPDF() {
        try {
            if (!this.currentReportData || !this.currentReportData.length) {
                if (typeof ui !== 'undefined' && ui.showWarning) {
                    ui.showWarning('لا توجد بيانات للتصدير');
                }
                return;
            }

            // Show print dialog
            Utils.printContent('reportsPage');

            if (typeof ui !== 'undefined' && ui.showSuccess) {
                ui.showSuccess('✅ تم فتح معاينة الطباعة');
            }

        } catch (error) {
            console.error('❌ Export PDF error:', error);
            
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError('فشل تصدير PDF');
            }
        }
    }

    /**
     * Generate printable report HTML
     * @returns {string} HTML string for printing
     */
    generatePrintableHTML() {
        const stats = this.calculateStatistics(this.currentReportData);
        const userName = typeof auth !== 'undefined' ? auth.getUserName() : 'موظف';
        const userCode = typeof auth !== 'undefined' ? auth.getUserCode() : '';

        return `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>تقرير الحضور والانصراف</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .header h1 { color: #1e293b; margin: 0; }
                    .header p { color: #64748b; margin: 5px 0; }
                    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
                    .stat-box { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
                    .stat-value { font-size: 24px; font-weight: bold; color: #3b82f6; display: block; }
                    .stat-label { font-size: 12px; color: #64748b; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; }
                    th { background: #f1f5f9; font-weight: bold; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 تقرير الحضور والانصراف</h1>
                    <p><strong>الموظف:</strong> ${userName} (${userCode})</p>
                    <p><strong>الفترة:</strong> ${Utils.formatDate(this.dateRange.start, 'date')} - ${Utils.formatDate(this.dateRange.end, 'date')}</p>
                    <p><strong>تاريخ التوليد:</strong> ${Utils.formatDate(new Date(), 'full')}</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-value">${stats.presentDays}</span>
                        <span class="stat-label">أيام الحضور</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value">${stats.totalHours}</span>
                        <span class="stat-label">إجمالي الساعات</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value">${stats.overtimeHours}</span>
                        <span class="stat-label">ساعات إضافية</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value">${stats.averageDailyHours}</span>
                        <span class="stat-label">متوسط يومي</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>التاريخ</th>
                            <th>الوقت</th>
                            <th>الحالة</th>
                            <th>الوردية</th>
                            <th>الساعات</th>
                            <th>الأوفر تايم</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.currentReportData.map((record, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${Utils.formatDate(record.created_at, 'date')}</td>
                                <td>${Utils.formatDate(record.created_at, 'time')}</td>
                                <td>${record.type}</td>
                                <td>${record.shift || '-'}</td>
                                <td>${record.hours_worked || '-'}</td>
                                <td>${record.overtime || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer no-print">
                    <p>تم إنشاء هذا التقرير بواسطة Axentro System v${AppConfig?.app?.version || '4.1.0'}</p>
                </div>
            </body>
            </html>
        `;
    }

    // ============================================
    // 🔄 UTILITY METHODS
    // ============================================

    /**
     * Clear current report data
     */
    clearReport() {
        this.currentReportData = [];
        this.dateRange = { start: null, end: null };
        this.populateReportTable([]);
    }

    /**
     * Refresh current report
     */
    async refreshReport() {
        if (this.dateRange.start && this.dateRange.end) {
            await this.loadReportData();
        }
    }

    /**
     * Get current report data
     * @returns {Array}
     */
    getReportData() {
        return this.currentReportData;
    }

    /**
     * Check if has data to export
     * @returns {boolean}
     */
    hasData() {
        return this.currentReportData && this.currentReportData.length > 0;
    }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================

/**
 * Global reports instance
 */
let reports;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    reports = new ReportsManager();
    reports.init();
    
    console.log('📊 Reports module loaded');
});

console.log('✅ reports.js v4.1 loaded successfully');
