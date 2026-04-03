/**
 * ============================================
 * 🛠️ AXENTRO UTILITIES v4.1 - ENHANCED
 * ✅ Helper Functions & Utilities
 * 🔧 محسّن مع Error Handling قوي
 * ============================================
 */

class Utils {
    constructor() {
        console.log('🛠️ Utilities module loaded');
    }

    // ============================================
    // 💾 STORAGE OPERATIONS
    // ============================================

    /**
     * Save data to localStorage with error handling
     * @param {string} key - Storage key
     * @param {*} data - Data to save
     */
    static saveToStorage(key, data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('❌ Storage save error:', error);
            
            // Handle quota exceeded
            if (error.name === 'QuotaExceededError') {
                console.warn('⚠️ LocalStorage full - attempting cleanup...');
                Utils.clearOldStorage();
                
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    return true;
                } catch (retryError) {
                    console.error('❌ Still cannot save after cleanup');
                    return false;
                }
            }
            return false;
        }
    }

    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Parsed data or default value
     */
    static loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch (error) {
            console.error('❌ Storage load error:', error);
            return defaultValue;
        }
    }

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key to remove
     */
    static removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('❌ Storage remove error:', error);
            return false;
        }
    }

    /**
     * Clear all app-related storage (not entire localStorage)
     */
    static clearAppStorage() {
        const keysToRemove = [
            Constants?.storageKeys?.USER_SESSION,
            Constants?.storageKeys?.REMEMBER_ME,
            Constants?.storageKeys?.USER_SETTINGS,
            Constants?.storageKeys?.LAST_ACTIVITY,
            Constants?.storageKeys?.TEMP_FACE_DESCRIPTOR,
            Constants?.storageKeys?.OFFLINE_QUEUE
        ].filter(Boolean);

        keysToRemove.forEach(key => {
            Utils.removeFromStorage(key);
        });

        console.log('🗑️ App storage cleared');
    }

    /**
     * Clear old/unused storage items to free space
     */
    static clearOldStorage() {
        try {
            const keysToKeep = new Set([
                Constants?.storageKeys?.USER_SESSION,
                Constants?.storageKeys?.REMEMBER_ME,
                Constants?.storageKeys?.USER_SETTINGS
            ].filter(Boolean));

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!keysToKeep.has(key)) {
                    localStorage.removeItem(key);
                    i--; // Adjust index after removal
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to clear old storage:', error);
        }
    }

    /**
     * Save data to sessionStorage
     * @param {string} key - Session key
     * @param {*} data - Data to save
     */
    static saveToSession(key, data) {
        try {
            sessionStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('❌ SessionStorage save error:', error);
            return false;
        }
    }

    /**
     * Load data from sessionStorage
     * @param {string} key - Session key
     * @param {*} defaultValue - Default value
     * @returns {*} Parsed data or default
     */
    static loadFromSession(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(key);
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch (error) {
            console.error('❌ SessionStorage load error:', error);
            return defaultValue;
        }
    }

    // ============================================
    // ⏰ DATE & TIME UTILITIES
    // ============================================

    /**
     * Format date according to specified format
     * @param {Date|string} date - Date to format
     * @param {string} format - Format type: 'full', 'date', 'time', 'datetime'
     * @returns {string} Formatted date string
     */
    static formatDate(date, format = 'datetime') {
        try {
            const d = date instanceof Date ? date : new Date(date);
            
            if (isNaN(d.getTime())) {
                return '--/--/----';
            }

            const options = {
                full: {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                },
                date: {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                },
                time: {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                },
                datetime: {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }
            };

            return d.toLocaleDateString('ar-EG', options[format] || options.datetime);

        } catch (error) {
            console.error('❌ Date formatting error:', error);
            return '--/--/----';
        }
    }

    /**
     * Get relative time string (e.g., "منذ 5 دقائق")
     * @param {Date|string} date - Date to compare
     * @returns {string} Relative time string
     */
    static getRelativeTime(date) {
        try {
            const now = new Date();
            const then = date instanceof Date ? date : new Date(date);
            const diffMs = now - then;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffSecs < 60) return 'الآن';
            if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
            if (diffHours < 24) return `منذ ${diffHours} ساعة`;
            if (diffDays < 7) return `منذ ${diffDays} يوم`;
            
            return this.formatDate(date, 'date');

        } catch (error) {
            return this.formatDate(date, 'date');
        }
    }

    /**
     * Calculate time difference between two dates
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {object} Time difference object
     */
    static calculateTimeDifference(startDate, endDate) {
        try {
            const start = startDate instanceof Date ? startDate : new Date(startDate);
            const end = endDate instanceof Date ? endDate : new Date(endDate);
            
            const diffMs = Math.abs(end - start);
            const totalSeconds = Math.floor(diffMs / 1000);
            const totalMinutes = Math.floor(totalSeconds / 60);
            const totalHours = Math.floor(totalMinutes / 60);
            const totalDays = Math.floor(totalHours / 24);

            return {
                milliseconds: diffMs,
                seconds: totalSeconds % 60,
                minutes: totalMinutes % 60,
                hours: totalHours % 24,
                days: totalDays,
                totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
                totalMinutes: totalMinutes,
                totalSeconds: totalSeconds,
                formatted: this.formatDuration(totalMinutes)
            };

        } catch (error) {
            console.error('❌ Time difference calculation error:', error);
            return {
                hours: 0,
                minutes: 0,
                totalHours: 0,
                formatted: '0 ساعة'
            };
        }
    }

    /**
     * Format duration in minutes to human-readable string
     * @param {number} totalMinutes - Total minutes
     * @returns {string} Formatted duration
     */
    static formatDuration(totalMinutes) {
        if (!totalMinutes || totalMinutes <= 0) return '0 ساعة';

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);

        let result = '';
        
        if (hours > 0) {
            result += `${hours} ساعة`;
        }
        
        if (minutes > 0) {
            result += (hours > 0 ? ' و ' : '') + `${minutes} دقيقة`;
        }

        return result || 'أقل من دقيقة';
    }

    /**
     * Format hours worked (decimal) to readable string
     * @param {number} hours - Hours in decimal format
     * @returns {string} Formatted hours string
     */
    static formatHoursWorked(hours) {
        if (!hours || isNaN(hours)) return '0 ساعة';

        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);

        if (h === 0 && m === 0) return '0 ساعة';
        if (h === 0) return `${m} دقيقة`;
        if (m === 0) return `${h} ساعة`;

        return `${h} ساعة و ${m} دقيقة`;
    }

    // ============================================
    // 📍 LOCATION UTILITIES
    // ============================================

    /**
     * Get current geolocation
     * @param {object} options - Geolocation options
     * @returns {Promise<object>} Location data
     */
    static async getLocation(options = {}) {
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        const config = { ...defaultOptions, ...options };

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    let errorMessage = 'خطأ في تحديد الموقع';
                    
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'تم رفض إذن الوصول للموقع';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'معلومات الموقع غير متوفرة';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'تجاوز وقت تحديد الموقع';
                            break;
                    }

                    reject(new Error(errorMessage));
                },
                config
            );
        });
    }

    /**
     * Generate Google Maps link from coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {string} Google Maps URL
     */
    static getMapsLink(lat, lng) {
        if (!lat || !lng) return null;
        return `https://www.google.com/maps?q=${lat},${lng}&z=17`;
    }

    // ============================================
    // 🖼️ IMAGE UTILITIES
    // ============================================

    /**
     * Compress image base64 string
     * @param {string} base64 - Base64 image string
     * @param {number} maxWidth - Maximum width
     * @param {number} quality - Compression quality (0-1)
     * @returns {Promise<string>} Compressed base64
     */
    static async compressImage(base64, maxWidth = 800, quality = 0.7) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    
                    // Calculate new dimensions
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw and compress
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to compressed base64
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };

                img.onerror = () => {
                    reject(new Error('فشل تحميل الصورة للضغط'));
                };

                img.src = base64;

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Convert file to base64
     * @param {File} file - File object
     * @returns {Promise<string>} Base64 string
     */
    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('فشل قراءة الملف'));
            
            reader.readAsDataURL(file);
        });
    }

    // ============================================
    // 🔐 SECURITY UTILITIES
    // ============================================

    /**
     * Generate random password
     * @param {number} length - Password length
     * @returns {string} Random password
     */
    static generatePassword(length = 10) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return password;
    }

    /**
     * Generate unique ID
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     */
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`;
    }

    /**
     * Simple hash function (for non-critical use)
     * @param {string} str - String to hash
     * @returns {string} Hashed string
     */
    static simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // ============================================
    // 📊 OVERTIME CALCULATION
    // ============================================

    /**
     * Calculate overtime based on hours worked
     * @param {number} hoursWorked - Total hours worked
     * @param {number} normalHours - Normal working hours threshold
     * @returns {object} Overtime calculation result
     */
    static calculateOvertime(hoursWorked, normalHours = 9) {
        try {
            const hours = parseFloat(hoursWorked) || 0;
            const normal = parseFloat(normalHours) || 9;
            
            const overtime = Math.max(0, hours - normal);
            const hasOvertime = overtime > 0;

            return {
                totalHours: hours,
                normalHours: Math.min(hours, normal),
                overtimeHours: overtime,
                hasOvertime: hasOvertime,
                formattedOvertime: hasOvertime ? 
                    `${overtime.toFixed(1)} ساعة` : 
                    'لا يوجد',
                overtimeMinutes: Math.round(overtime * 60)
            };

        } catch (error) {
            console.error('❌ Overtime calculation error:', error);
            return {
                totalHours: 0,
                normalHours: 0,
                overtimeHours: 0,
                hasOvertime: false,
                formattedOvertime: 'لا يوجد',
                overtimeMinutes: 0
            };
        }
    }

    // ============================================
    // 🎨 UI HELPERS
    // ============================================

    /**
     * Sleep/Delay utility
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Resolves after delay
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function} Throttled function
     */
    static throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('❌ Clipboard copy failed:', error);
            
            // Fallback method
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            } catch (fallbackError) {
                return false;
            }
        }
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    static isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    /**
     * Validate employee code format
     * @param {string} code - Code to validate
     * @returns {boolean} Is valid code
     */
    static isValidEmployeeCode(code) {
        if (!code || typeof code !== 'string') return false;
        
        // Allow alphanumeric codes, 3-15 characters
        const codeRegex = /^[A-Z0-9]{3,15}$/i;
        return codeRegex.test(code.trim());
    }

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized string
     */
    static sanitizeHTML(html) {
        if (!html || typeof html !== 'string') return '';
        
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @param {string} suffix - Suffix to add (default: '...')
     * @returns {string} Truncated text
     */
    static truncate(text, maxLength = 50, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + suffix;
    }

    // ============================================
    // 📱 DEVICE & BROWSER INFO
    // ============================================

    /**
     * Check if device is mobile
     * @returns {boolean}
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    }

    /**
     * Check if device supports touch
     * @returns {boolean}
     */
    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Check if browser is online
     * @returns {boolean}
     */
    static isOnline() {
        return navigator.onLine;
    }

    /**
     * Get browser info
     * @returns {object} Browser information
     */
    static getBrowserInfo() {
        const ua = navigator.userAgent;
        let browserName = 'Unknown';
        let browserVersion = 'Unknown';

        if (ua.indexOf('Firefox') > -1) {
            browserName = 'Firefox';
            browserVersion = ua.match(/Firefox\/(\d+)/)?.[1];
        } else if (ua.indexOf('Chrome') > -1) {
            browserName = 'Chrome';
            browserVersion = ua.match(/Chrome\/(\d+)/)?.[1];
        } else if (ua.indexOf('Safari') > -1) {
            browserName = 'Safari';
            browserVersion = ua.match(/Version\/(\d+)/)?.[1];
        } else if (ua.indexOf('Edge') > -1) {
            browserName = 'Edge';
            browserVersion = ua.match(/Edge\/(\d+)/)?.[1];
        }

        return {
            name: browserName,
            version: browserVersion,
            mobile: this.isMobile(),
            touch: this.isTouchDevice(),
            online: this.isOnline(),
            language: navigator.language,
            platform: navigator.platform
        };
    }

    // ============================================
    // 🎵 SOUND & VIBRATION
    // ============================================

    /**
     * Play sound effect
     * @param {string} soundId - Sound element ID
     * @param {number} volume - Volume level (0-1)
     */
    static playSound(soundId, volume = 0.7) {
        try {
            const audio = document.getElementById(soundId);
            if (audio) {
                audio.volume = Math.min(1, Math.max(0, volume));
                audio.currentTime = 0;
                audio.play().catch(e => console.warn('Sound play blocked:', e));
            }
        } catch (error) {
            console.warn('⚠️ Sound playback error:', error);
        }
    }

    /**
     * Vibrate device (if supported)
     * @param {number|number[]} pattern - Vibration pattern
     */
    static vibrate(pattern = [200, 100, 200]) {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate(pattern);
            }
        } catch (error) {
            console.warn('⚠️ Vibration not supported');
        }
    }

    // ============================================
    // 📤 EXPORT UTILITIES
    // ============================================

    /**
     * Export data to CSV
     * @param {Array} data - Array of objects
     * @param {string} filename - Download filename
     */
    static exportToCSV(data, filename = 'export.csv') {
        try {
            if (!data || !data.length) {
                throw new Error('No data to export');
            }

            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => 
                    headers.map(header => {
                        let cell = row[header] ?? '';
                        // Escape quotes and wrap in quotes if contains comma
                        cell = String(cell).replace(/"/g, '""');
                        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                            cell = `"${cell}"`;
                        }
                        return cell;
                    }).join(',')
                )
            ].join('\n');

            // Create and trigger download
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();

            URL.revokeObjectURL(link.href);
            console.log(`✅ Exported ${data.length} records to CSV`);

        } catch (error) {
            console.error('❌ CSV export error:', error);
            throw error;
        }
    }

    /**
     * Print content
     * @param {string} contentId - Element ID to print
     */
    static printContent(contentId) {
        try {
            const content = document.getElementById(contentId);
            if (!content) {
                throw new Error('Content element not found');
            }

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html dir="rtl">
                <head>
                    <title>طباعة</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                        th { background-color: #f5f5f5; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    ${content.innerHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();

        } catch (error) {
            console.error('❌ Print error:', error);
        }
    }
}

// Make Utils available globally
window.Utils = Utils;

console.log('✅ utils.js v4.1 loaded successfully');
