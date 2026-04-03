/**
 * ============================================
 * 🛠️ AXENTRO UTILITIES v4.0
 * ✅ General Helper Functions
 * ============================================
 */

const Utils = {
    // ============================================
    // 📅 DATE & TIME UTILITIES
    // ============================================
    
    /**
     * Format date to Arabic locale
     * @param {Date|string} date - Date to format
     * @param {string} format - Format type ('full', 'short', 'time', 'datetime')
     * @returns {string} Formatted date string
     */
    formatDate(date, format = 'full') {
        const d = new Date(date);
        
        const formats = {
            full: {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            },
            short: {
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
        
        return d.toLocaleDateString('ar-EG', formats[format] || formats.full);
    },

    /**
     * Get current datetime in ISO format for API
     * @returns {string} ISO datetime string
     */
    getCurrentDateTime() {
        return new Date().toISOString();
    },

    /**
     * Calculate difference between two dates
     * @param {Date} start - Start date
     * @param {Date} end - End date
     * @returns {object} Object with hours, minutes, seconds
     */
    calculateTimeDifference(start, end) {
        const diff = Math.abs(end - start);
        
        return {
            hours: Math.floor(diff / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
            totalMilliseconds: diff,
            totalMinutes: Math.floor(diff / (1000 * 60)),
            totalHours: parseFloat((diff / (1000 * 60 * 60)).toFixed(2))
        };
    },

    /**
     * Format hours worked to display string
     * @param {number} hours - Hours as decimal
     * @returns {string} Formatted string like "8 ساعات و 30 دقيقة"
     */
    formatHoursWorked(hours) {
        if (!hours || isNaN(hours)) return '0 ساعة';
        
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        
        let result = '';
        if (h > 0) result += `${h} ${h === 1 ? 'ساعة' : 'ساعات'}`;
        if (m > 0) result += ` و ${m} دقيقة`;
        
        return result || 'أقل من دقيقة';
    },

    /**
     * Calculate overtime from total hours
     * @param {number} totalHours - Total hours worked
     * @param {number} normalHours - Normal working hours (default from config)
     * @returns {object} Overtime info
     */
    calculateOvertime(totalHours, normalHours = AppConfig.attendance.normalHours) {
        const overtime = Math.max(0, totalHours - normalHours);
        const normalHrs = Math.min(totalHours, normalHours);
        
        return {
            hasOvertime: overtime > 0,
            overtimeHours: parseFloat(overtime.toFixed(2)),
            normalHours: parseFloat(normalHrs.toFixed(2)),
            overtimeFormatted: this.formatHoursWorked(overtime),
            totalFormatted: this.formatHoursWorked(totalHours)
        };
    },

    // ============================================
    // 🧮 STRING & NUMBER UTILITIES
    // ============================================

    /**
     * Sanitize string input (remove HTML tags, trim)
     * @param {string} str - Input string
     * @param {string} defaultValue - Default value if empty
     * @returns {string} Sanitized string
     */
    sanitizeString(str, defaultValue = '') {
        if (!str || typeof str !== 'string') return defaultValue;
        
        return str
            .trim()
            .replace(/[<>]/g, '')  // Remove dangerous HTML chars
            .substring(0, AppConfig.security.password.maxLength); // Limit length
    },

    /**
     * Validate and sanitize email
     * @param {string} email - Email address
     * @returns {string|null} Cleaned email or null if invalid
     */
    sanitizeEmail(email) {
        if (!email || email === 'null' || email === 'undefined') return null;
        
        const cleaned = String(email).trim().toLowerCase();
        
        if (!Constants.regex.email.test(cleaned)) return null;
        
        return cleaned.substring(0, 100);
    },

    /**
     * Generate random string
     * @param {number} length - Length of string
     * @param {string} type - Type: 'alpha', 'numeric', 'alphanumeric'
     * @returns {string} Random string
     */
    generateRandomString(length = 10, type = 'alphanumeric') {
        const chars = {
            alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
            numeric: '0123456789',
            alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        };
        
        let result = '';
        const charset = chars[type] || chars.alphanumeric;
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        
        for (let i = 0; i < length; i++) {
            result += charset[array[i] % charset.length];
        }
        
        return result;
    },

    /**
     * Generate secure password
     * @param {number} length - Password length
     * @returns {string} Random password
     */
    generatePassword(length = 10) {
        const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lowercase = 'abcdefghjkmnpqrstuvwxyz';
        const numbers = '23456789';
        const special = '!@#$%&*';
        
        let password = '';
        // Ensure at least one of each type
        password += uppercase[this.randomInt(0, uppercase.length - 1)];
        password += lowercase[this.randomInt(0, lowercase.length - 1)];
        password += numbers[this.randomInt(0, numbers.length - 1)];
        password += special[this.randomInt(0, special.length - 1)];
        
        // Fill rest with random characters
        const allChars = uppercase + lowercase + numbers + special;
        for (let i = password.length; i < length; i++) {
            password += allChars[this.randomInt(0, allChars.length - 1)];
        }
        
        // Shuffle the password
        return this.shuffleString(password);
    },

    /**
     * Shuffle string characters
     * @param {string} str - String to shuffle
     * @returns {string} Shuffled string
     */
    shuffleString(str) {
        const array = str.split('');
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array.join('');
    },

    /**
     * Get random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Truncate text with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncate(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    },

    /**
     * Capitalize first letter of each word
     * @param {string} str - Input string
     * @returns {string} Capitalized string
     */
    capitalizeWords(str) {
        if (!str) return '';
        return str.replace(/\b\w/g, char => char.toUpperCase());
    },

    // ============================================
    // 💾 STORAGE UTILITIES
    // ============================================

    /**
     * Save data to localStorage with error handling
     * @param {string} key - Storage key
     * @param {*} data - Data to store
     * @returns {boolean} Success status
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            
            // If quota exceeded, try to clear old data
            if (error.name === 'QuotaExceededError') {
                this.clearOldCache();
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    return true;
                } catch (e) {
                    console.error('Still cannot save after clearing cache:', e);
                    return false;
                }
            }
            return false;
        }
    },

    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Stored data or default value
     */
    loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage load error:', error);
            return defaultValue;
        }
    },

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    },

    /**
     * Clear old cache data
     */
    clearOldCache() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('axentro_cache_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    },

    /**
     * Save to sessionStorage
     * @param {string} key - Storage key
     * @param {*} data - Data to store
     */
    saveToSession(key, data) {
        try {
            sessionStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Session storage error:', error);
        }
    },

    /**
     * Load from sessionStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value
     * @returns {*} Stored data or default
     */
    loadFromSession(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Session load error:', error);
            return defaultValue;
        }
    },

    // ============================================
    // 🌐 NETWORK & CONNECTIVITY
    // ============================================

    /**
     * Check if device is online
     * @returns {boolean} Online status
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Get connection information
     * @returns {object|null} Connection info or null if not supported
     */
    getConnectionInfo() {
        if (navigator.connection) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            };
        }
        return null;
    },

    /**
     * Retry function with exponential backoff
     * @param {Function} fn - Async function to retry
     * @param {object} options - Retry options
     * @returns {Promise<*>} Function result
     */
    async retryWithBackoff(fn, options = {}) {
        const {
            maxAttempts = AppConfig.retry.maxAttempts,
            baseDelay = AppConfig.retry.baseDelay,
            maxDelay = AppConfig.retry.maxDelay,
            multiplier = AppConfig.retry.backoffMultiplier
        } = options;

        let lastError;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts - 1) throw error;
                
                const delay = Math.min(baseDelay * Math.pow(multiplier, attempt), maxDelay);
                console.log(`Retry ${attempt + 1}/${maxAttempts} in ${delay}ms`);
                
                await this.sleep(delay);
            }
        }

        throw lastError;
    },

    /**
     * Sleep/delay utility
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // ============================================
    // 📍 LOCATION UTILITIES
    // ============================================

    /**
     * Get current geolocation
     * @param {object} options - Geolocation options
     * @returns {Promise<object>} Position object
     */
    async getLocation(options = {}) {
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        const mergedOptions = { ...defaultOptions, ...options };

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                }),
                error => reject(error),
                mergedOptions
            );
        });
    },

    /**
     * Create Google Maps link from coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {string} Google Maps URL
     */
    getMapsLink(lat, lng) {
        return `https://www.google.com/maps?q=${lat},${lng}`;
    },

    // ============================================
    // 🖼️ IMAGE UTILITIES
    // ============================================

    /**
     * Convert canvas/image to base64
     * @param {HTMLCanvasElement|HTMLImageElement} element - Canvas or image element
     * @param {string} type - Image type (default jpeg)
     * @param {number} quality - Image quality (0-1)
     * @returns {string} Base64 string
     */
    imageToBase64(element, type = 'image/jpeg', quality = 0.8) {
        if (element instanceof HTMLCanvasElement) {
            return element.toDataURL(type, quality);
        }
        
        // If it's an image, draw to canvas first
        const canvas = document.createElement('canvas');
        canvas.width = element.naturalWidth || element.width;
        canvas.height = element.naturalHeight || element.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(element, 0, 0);
        return canvas.toDataURL(type, quality);
    },

    /**
     * Compress image before upload
     * @param {string} base64 - Base64 image string
     * @param {number} maxWidth - Maximum width
     * @param {number} quality - JPEG quality
     * @returns {Promise<string>} Compressed base64
     */
    async compressImage(base64, maxWidth = 640, quality = 0.7) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = base64;
        });
    },

    /**
     * Get image file size from base64
     * @param {string} base64 - Base64 string
     * @returns {number} Size in bytes
     */
    getImageSize(base64) {
        if (!base64) return 0;
        const base64Length = base64.split(',')[1]?.length || base64.length;
        return Math.ceil((base64Length * 3) / 4);
    },

    // ============================================
    // 🔐 SECURITY UTILITIES
    // ============================================

    /**
     * Generate CSRF token
     * @returns {string} Random token
     */
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '')).join('');
    },

    /**
     * Simple hash function (for non-sensitive data)
     * @param {string} str - String to hash
     * @returns {string} Hashed string
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    },

    /**
     * Mask sensitive data for display
     * @param {string} str - String to mask
     * @param {number} visibleChars - Number of visible characters at start and end
     * @returns {string} Masked string
     */
    maskSensitive(str, visibleChars = 2) {
        if (!str || str.length <= visibleChars * 2) return str;
        
        const start = str.substring(0, visibleChars);
        const end = str.substring(str.length - visibleChars);
        const masked = '*'.repeat(Math.min(str.length - visibleChars * 2, 8));
        
        return `${start}${masked}${end}`;
    },

    // ============================================
    // 📊 DATA TRANSFORMATION
    // ============================================

    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function} Throttled function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Group array by key
     * @param {Array} array - Array to group
     * @param {string|Function} key - Key or function to group by
     * @returns {object} Grouped object
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const groupKey = typeof key === 'function' ? key(item) : item[key];
            (result[groupKey] = result[groupKey] || []).push(item);
            return result;
        }, {});
    },

    /**
     * Sort array of objects by key
     * @param {Array} array - Array to sort
     * @param {string} key - Key to sort by
     * @param {string} order - 'asc' or 'desc'
     * @returns {Array} Sorted array
     */
    sortBy(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    },

    // ============================================
    // 🎯 VALIDATION HELPERS
    // ============================================

    /**
     * Check if value is empty
     * @param {*} value - Value to check
     * @returns {boolean} True if empty
     */
    isEmpty(value) {
        return (
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim() === '') ||
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' && Object.keys(value).length === 0)
        );
    },

    /**
     * Validate employee code format
     * @param {string} code - Employee code
     * @returns {boolean} Valid or not
     */
    isValidEmployeeCode(code) {
        return Constants.regex.employeeCode.test(code);
    },

    /**
     * Validate email format
     * @param {string} email - Email address
     * @returns {boolean} Valid or not
     */
    isValidEmail(email) {
        return Constants.regex.email.test(email);
    },

    /**
     * Check password strength
     * @param {string} password - Password to check
     * @returns {object} Strength info
     */
    checkPasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        Object.values(checks).forEach(passed => {
            if (passed) score++;
        });

        let level = 'weak';
        if (score >= 4) level = 'strong';
        else if (score >= 2) level = 'medium';

        return {
            score,
            level,
            checks,
            percentage: Math.round((score / 5) * 100)
        };
    },

    // ============================================
    // 📱 DEVICE & BROWSER INFO
    // ============================================

    /**
     * Get device information
     * @returns {object} Device info
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
            isAndroid: /Android/i.test(navigator.userAgent),
            screenWidth: screen.width,
            screenHeight: screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
            touchSupport: 'ontouchstart' in window
        };
    },

    /**
     * Check if PWA is installed
     * @returns {boolean} Is installed
     */
    isPWAInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    },

    // ============================================
    // 🎨 UI HELPERS
    // ============================================

    /**
     * Scroll to element smoothly
     * @param {string|HTMLElement} selectorOrElement - Element or selector
     * @param {number} offset - Offset from top
     */
    scrollTo(selectorOrElement, offset = 20) {
        const element = typeof selectorOrElement === 'string' 
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;
        
        if (element) {
            const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    },

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Clipboard error:', error);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    },

    /**
     * Download data as file
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Print element or page
     * @param {string} [selector] - Element selector to print (optional)
     */
    print(selector) {
        if (selector) {
            const element = document.querySelector(selector);
            if (element) {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Print</title>
                            <style>
                                body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
                                table { width: 100%; border-collapse: collapse; }
                                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                                th { background: #f5f5f5; }
                            </style>
                        </head>
                        <body>${element.innerHTML}</body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.print();
            }
        } else {
            window.print();
        }
    }
};

// Make Utils available globally
window.Utils = Utils;
