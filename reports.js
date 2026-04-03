/**
 * ============================================
 * 📊 AXENTRO REPORTS MANAGER v4.0
 * ✅ Attendance Reports & Analytics
 * ============================================
 */

class ReportsManager {
    constructor() {
        this.currentReportData = null;
        this.dateRange = {
            start: AppConfig.reporting.defaultDateRange.start(),
            end: AppConfig.reporting.defaultDateRange.end()
        };
        
        this.init();
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize reports manager
     */
    init() {
        console.log('📊 Reports Manager initialized');
        
        // Set default date inputs
        this.setDefaultDates();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Set default date range in form inputs
     */
    setDefaultDates() {
        const fromInput = document.getElementById('reportDateFrom');
        const toInput = document.getElementById('reportDateTo');

        if (fromInput) {
            fromInput.value = this.formatDateForInput(this.dateRange.start);
        }
        
        if (toInput) {
            toInput.value = this.formatDateForInput(this.dateRange.end);
        }
    }

    /**
     * Setup report page event listeners
     */
    setupEventListeners() {
        // Apply filter button
        const applyBtn = document.getElementById('applyReportFilter');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyDateFilter());
        }

        // Export buttons
        const exportPDFBtn = document.getElementById('exportPDFBtn');
        if (exportPDFBtn) {
            exportPDFBtn.addEventListener('click', () => this.exportToPDF());
        }

        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        }

        // Date input change handlers
        const fromInput = document.getElementById('reportDateFrom');
        const toInput = document.getElementById('reportDateTo');

        if (fromInput) {
            fromInput.addEventListener('change', (e) => {
                this.dateRange.start = new Date(e.target.value);
            });
        }

        if (toInput) {
            toInput.addEventListener('change', (e) => {
                this.dateRange.end = new Date(e.target.value);
            });
        }
    }

    // ============================================
    // 📅 DATE HANDLING
    // ============================================

    /**
     * Format date for input element
     * @param {Date} date - Date object
     * @returns {string} Formatted date string (YYYY-MM-DD)
     */
    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Apply selected date filter and load data
     */
    async applyDateFilter() {
        try {
            ui.showButtonLoading(document.getElementById('applyReportFilter'), 'جاري التحميل...');

            // Validate date range
            if (this.dateRange.start > this.dateRange.end) {
                ui.showError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
                return;
            }

            // Load attendance records for the date range
            await this.loadReportData();

            ui.showSuccess('تم تحميل التقرير ✓');

        } catch (error) {
            console.error('Apply filter error:', error);
            ui.showError('فشل تحميل البيانات');
        } finally {
            ui.hideButtonLoading(document.getElementById('applyReportFilter'));
        }
    }

    /**
     * Set custom date range
     * @param {Date} start - Start date
     * @param {Date} end - End date
     */
    setDateRange(start, end) {
        this.dateRange.start = start;
        this.dateRange.end = end;
        
        // Update inputs
        this.setDefaultDates();
    }

    /**
     * Quick select preset date ranges
     * @param {string} preset - Preset name ('today', 'week', 'month', 'year')
     */
    selectPresetRange(preset) {
        const today = new Date();
        let start, end;

        switch (preset) {
            case 'today':
                start = new Date(today.setHours(0, 0, 0, 0));
                end = new Date();
                break;

            case 'week':
                start = new Date(today.setDate(today.getDate() - today.getDay()));
                end = new Date();
                break;

            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date();
                break;

            case 'year':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date();
                break;

            default:
                return;
        }

        this.setDateRange(start, end);
        this.applyDateFilter();
    }

    // ============================================
    // 📊 DATA LOADING & PROCESSING
    // ============================================

    /**
     * Load report data for current date range
     */
    async loadReportData() {
        if (!auth.isAuthenticated()) {
            ui.showError(ErrorCodes.AUTH_SESSION_EXPIRED.message);
            return;
        }

        try {
            const userCode = auth.getUserCode();
            
            // Get attendance history
            const records = await db.getAttendanceHistory(
                userCode,
                this.dateRange.start,
                this.dateRange.end
            );

            // Process and calculate statistics
            this.currentReportData = this.processRecords(records);

            // Update UI with results
            this.renderReport();

        } catch (error) {
            console.error('Load report data error:', error);
            throw error;
        }
    }

    /**
     * Process raw records into statistics
     * @param {Array} records - Raw attendance records
     * @returns {object} Processed report data
     */
    processRecords(records) {
        let totalHours = 0;
        let totalOvertime = 0;
        let daysPresent = 0;
        let checkIns = 0;
        let checkOuts = 0;
        const dailyRecords = {};

        // Group by date
        records.forEach(record => {
            const dateKey = Utils.formatDate(record.created_at, 'short');
            
            if (!dailyRecords[dateKey]) {
                dailyRecords[dateKey] = [];
            }
            dailyRecords[dateKey].push(record);

            // Count types
            if (record.type === 'حضور') {
                checkIns++;
                daysPresent++; // Each check-in counts as a day present
            } else {
                checkOuts++;
            }

            // Sum hours
            const hours = parseFloat(record.hours_worked) || 0;
            totalHours += hours;

            // Sum overtime
            const overtimeMatch = record.overtime?.match(/[\d.]+/);
            if (overtimeMatch) {
                totalOvertime += parseFloat(overtimeMatch[0]);
            }
        });

        return {
            records,
            summary: {
                totalRecords: records.length,
                daysPresent,
                uniqueDays: Object.keys(dailyRecords).length,
                totalHours: parseFloat(totalHours.toFixed(2)),
                totalOvertime: parseFloat(totalOvertime.toFixed(2)),
                averageHoursPerDay: daysPresent > 0 
                    ? parseFloat((totalHours / daysPresent).toFixed(2)) 
                    : 0,
                averageOvertimePerDay: daysPresent > 0 
                    ? parseFloat((totalOvertime / daysPresent).toFixed(2)) 
                    : 0,
                checkIns,
                checkOuts,
                completionRate: checkIns > 0 
                    ? Math.min(100, Math.round((checkOuts / checkIns) * 100)) 
                    : 0
            },
            dailyBreakdown: dailyRecords
        };
    }

    // ============================================
    // 🎨 RENDERING
    // ============================================

    /**
     * Render report data to UI
     */
    renderReport() {
        if (!this.currentReportData) return;

        const { summary, records } = this.currentReportData;

        // Update stat cards
        this.updateStatCard('reportTotalDays', summary.daysPresent);
        this.updateStatCard('reportTotalHours', summary.totalHours);
        this.updateStatCard('reportOvertime', summary.totalOvertime);

        // Render table
        this.renderTable(records);

        // Show/hide empty state
        const noRecordsState = document.getElementById('noRecordsState');
        const tableContainer = document.querySelector('.records-table-container');
        
        if (records.length === 0) {
            if (noRecordsState) noRecordsState.classList.remove('hidden');
            if (tableContainer) tableContainer.classList.add('hidden');
        } else {
            if (noRecordsState) noRecordsState.classList.add('hidden');
            if (tableContainer) tableContainer.classList.remove('hidden');
        }
    }

    /**
     * Update a stat card value with animation
     * @param {string} elementId - Element ID
     * @param {*} value - New value
     */
    updateStatCard(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) {
            ui.animateStatValue(elementId, value);
        }
    }

    /**
     * Render attendance records table
     * @param {Array} records - Records to display
     */
    renderTable(records) {
        const tbody = document.getElementById('attendanceRecordsBody');
        if (!tbody) return;

        if (records.length === 0) {
            tbody.innerHTML = '';
            return;
        }

        // Sort by date descending (newest first)
        const sortedRecords = Utils.sortBy(records, 'created_at', 'desc');

        tbody.innerHTML = sortedRecords.map(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Utils.formatDate(record.created_at)}</td>
                <td>
                    <span class="badge ${record.type === 'حضور' ? 'badge-in' : 'badge-out'}">
                        ${record.type}
                    </span>
                </td>
                <td>${Utils.formatDate(record.created_at, 'time')}</td>
                <td>${record.shift || '-'}</td>
                <td style="color: var(--primary-400); font-weight: bold;">
                    ${record.hours_worked || '-'}
                </td>
                <td>${record.overtime || 'لا يوجد'}</td>
            `;
            return row.outerHTML;
        }).join('');
    }

    // ============================================
    // 📈 CHARTS & VISUALIZATIONS
    // ============================================

    /**
     * Generate simple text-based chart (for environments without chart libraries)
     * @param {Array} data - Chart data points
     * @param {string} type - Chart type ('bar', 'line')
     * @returns {HTMLElement} Chart container
     */
    generateSimpleChart(data, type = 'bar') {
        const container = document.createElement('div');
        container.className = 'simple-chart';

        if (type === 'bar') {
            const maxValue = Math.max(...data.map(d => d.value));
            
            container.innerHTML = data.map(item => `
                <div class="chart-bar-item">
                    <div class="chart-label">${item.label}</div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="width: ${(item.value / maxValue) * 100}%;">
                            ${item.value}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        return container;
    }

    /**
     * Create weekly hours chart data
     * @returns {Array} Chart data points
     */
    getWeeklyChartData() {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        // This would fetch actual weekly data
        // For now, return placeholder structure
        return days.map(day => ({
            label: day,
            value: 0 // Would be calculated from actual data
        }));
    }

    // ============================================
    // 📤 EXPORT FUNCTIONS
    // ============================================

    /**
     * Export report to PDF (using browser print)
     */
    async exportToPDF() {
        if (!this.currentReportData) {
            ui.showWarning('لا توجد بيانات للتصدير');
            return;
        }

        try {
            ui.showInfo('جاري تحضير ملف PDF...');

            // Create printable content
            const printContent = this.generatePrintableContent();

            // Open print dialog
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html dir="rtl">
                <head>
                    <title>تقرير الحضور - ${auth.getUserName()}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 20px; 
                            direction: rtl;
                        }
                        h1 { color: #1e293b; margin-bottom: 5px; }
                        .subtitle { color: #64748b; margin-bottom: 20px; }
                        .stats { 
                            display: grid; 
                            grid-template-columns: repeat(3, 1fr); 
                            gap: 15px; 
                            margin-bottom: 20px;
                        }
                        .stat-card { 
                            background: #f8fafc; 
                            padding: 15px; 
                            border-radius: 8px;
                            text-align: center;
                        }
                        .stat-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
                        .stat-label { font-size: 12px; color: #64748b; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; }
                        th { background: #f1f5f9; font-weight: bold; }
                        .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
                        @media print { body { print-color-adjust: exact; } }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <script>window.onload = () => window.print();</script>
                </body>
                </html>
            `);
            printWindow.document.close();

            ui.showSuccess(SuccessMessages.DATA_EXPORTED);

        } catch (error) {
            console.error('Export PDF error:', error);
            ui.showError('فشل تصدير الملف');
        }
    }

    /**
     * Export report to Excel/CSV format
     */
    async exportToExcel() {
        if (!this.currentReportData) {
            ui.showWarning('لا توجد بيانات للتصدير');
            return;
        }

        try {
            ui.showInfo('جاري تحضير ملف Excel...');

            // Convert to CSV (compatible with Excel)
            const csvContent = this.convertToCSV(this.currentReportData.records);

            // Download file
            const filename = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
            Utils.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');

            ui.showSuccess(SuccessMessages.DATA_EXPORTED);

        } catch (error) {
            console.error('Export Excel error:', error);
            ui.showError('فشل تصدير الملف');
        }
    }

    /**
     * Convert records to CSV format
     * @param {Array} records - Attendance records
     * @returns {string} CSV content
     */
    convertToCSV(records) {
        if (!records.length) return '';

        // BOM for UTF-8 support in Excel
        const BOM = '\uFEFF';
        
        // Headers
        const headers = [
            'التاريخ',
            'اليوم',
            'الحالة',
            'الوقت',
            'الوردية',
            'ساعات العمل',
            'الأوفر تايم'
        ];

        // Rows
        const rows = records.map(record => [
            Utils.formatDate(record.created_at),
            new Date(record.created_at).toLocaleDateString('ar-EG', { weekday: 'long' }),
            record.type,
            Utils.formatDate(record.created_at, 'time'),
            record.shift || '-',
            record.hours_worked || '-',
            record.overtime || '-'
        ]);

        // Combine
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return BOM + csvContent;
    }

    /**
     * Generate printable HTML content
     * @returns {string} HTML string
     */
    generatePrintableContent() {
        const { summary } = this.currentReportData;
        const user = auth.getCurrentUser();

        return `
            <h1>📊 تقرير الحضور والانصراف</h1>
            <p class="subtitle">
                الموظف: ${user?.name || '-'} | 
                الكود: ${user?.code || '-'} |
                الفترة: ${Utils.formatDate(this.dateRange.start)} - ${Utils.formatDate(this.dateRange.end)}
            </p>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value">${summary.daysPresent}</div>
                    <div class="stat-label">أيام الحضور</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary.totalHours}</div>
                    <div class="stat-label">إجمالي الساعات</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary.totalOvertime}</div>
                    <div class="stat-label">ساعات إضافية</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>الحالة</th>
                        <th>الوقت</th>
                        <th>الوردية</th>
                        <th>الساعات</th>
                        <th>الأوفر تايم</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.currentReportData.records.map(record => `
                        <tr>
                            <td>${Utils.formatDate(record.created_at)}</td>
                            <td>${record.type}</td>
                            <td>${Utils.formatDate(record.created_at, 'time')}</td>
                            <td>${record.shift || '-'}</td>
                            <td>${record.hours_worked || '-'}</td>
                            <td>${record.overtime || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <p>تم إنشاء هذا التقرير بواسطة نظام Axentro</p>
                <p>تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG')}</p>
            </div>
        `;
    }

    // ============================================
    // 🔍 SEARCH & FILTER
    // ============================================

    /**
     * Filter records by type (check-in/check-out)
     * @param {string} type - Type filter or 'all'
     */
    filterByType(type) {
        if (!this.currentReportData) return;

        let filtered = [...this.currentReportData.records];

        if (type !== 'all') {
            filtered = filtered.filter(r => r.type === type);
        }

        this.renderTable(filtered);
    }

    /**
     * Search records by keyword
     * @param {string} query - Search query
     */
    searchRecords(query) {
        if (!this.currentReportData || !query) {
            this.renderTable(this.currentReportData.records);
            return;
        }

        const searchLower = query.toLowerCase();
        const filtered = this.currentReportData.records.filter(record =>
            record.shift?.toLowerCase().includes(searchLower) ||
            record.type.includes(searchLower) ||
            record.hours_worked?.toString().includes(searchLower) ||
            record.overtime?.includes(searchLower)
        );

        this.renderTable(filtered);
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================

    /**
     * Get current report data
     * @returns {object|null} Current report data
     */
    getCurrentReportData() {
        return this.currentReportData;
    }

    /**
     * Clear current report data
     */
    clearReportData() {
        this.currentReportData = null;
        
        // Clear UI
        const tbody = document.getElementById('attendanceRecordsBody');
        if (tbody) tbody.innerHTML = '';

        // Reset stats
        ['reportTotalDays', 'reportTotalHours', 'reportOvertime'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
    }

    /**
     * Refresh current report
     */
    async refreshReport() {
        await this.loadReportData();
        ui.showSuccess('تم تحديث التقرير ✓');
    }
}

// Create global instance
const reports = new ReportsManager();

// Export for use in other modules
window.ReportsManager = ReportsManager;
window.reports = reports;
