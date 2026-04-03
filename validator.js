/**
 * ============================================
 * ✅ AXENTRO VALIDATOR v4.0
 * ✅ Comprehensive Input Validation System
 * ============================================
 */

class Validator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    // ============================================
    // 📋 CORE VALIDATION METHODS
    // ============================================

    /**
     * Validate a single field
     * @param {*} value - Value to validate
     * @param {Array<Function|string>} rules - Validation rules
     * @returns {object} Validation result
     */
    validateField(value, rules) {
        for (const rule of rules) {
            const result = typeof rule === 'function' 
                ? rule(value) 
                : this.applyRule(rule, value);
            
            if (result && !result.valid) {
                return result;
            }
        }
        
        return { valid: true };
    }

    /**
     * Apply a predefined validation rule
     * @param {string} ruleName - Rule name
     * @param {*} value - Value to validate
     * @returns {object} Validation result
     */
    applyRule(ruleName, value) {
        const [rule, ...params] = ruleName.split(':');
        
        const ruleMap = {
            required: () => this.required(value),
            email: () => this.email(value),
            employeeCode: () => this.employeeCode(value),
            password: () => this.password(value),
            minLength: () => this.minLength(value, parseInt(params[0])),
            maxLength: () => this.maxLength(value, parseInt(params[0])),
            pattern: () => this.pattern(value, params[0]),
            match: () => this.match(value, params[0]),
            numeric: () => this.numeric(value),
            phone: () => this.phone(value),
            name: () => this.name(value),
            date: () => this.date(value),
            url: () => this.url(value),
            inRange: () => this.inRange(value, parseFloat(params[0]), parseFloat(params[1]))
        };

        return ruleMap[rule] ? ruleMap[rule]() : { valid: true };
    }

    /**
     * Validate entire form
     * @param {HTMLElement} formElement - Form element
     * @param {object} rules - Field rules mapping
     * @returns {object} Validation result with errors per field
     */
    validateForm(formElement, rules) {
        const result = {
            isValid: true,
            errors: {},
            firstErrorField: null
        };

        for (const [fieldName, fieldRules] of Object.entries(rules)) {
            const field = formElement.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (!field) continue;

            const value = field.value || field.textContent;
            const validationResult = this.validateField(value, fieldRules);

            if (!validationResult.valid) {
                result.isValid = false;
                result.errors[fieldName] = validationResult.message;
                
                if (!result.firstErrorField) {
                    result.firstErrorField = fieldName;
                }
                
                this.showFieldError(field, validationResult.message);
            } else {
                this.clearFieldError(field);
                this.showFieldSuccess(field);
            }
        }

        if (result.firstErrorField) {
            const firstErrorElement = formElement.querySelector(
                `[name="${result.firstErrorField}"], #${result.firstErrorField}`
            );
            if (firstErrorElement) {
                firstErrorElement.focus();
                this.scrollToField(firstErrorElement);
            }
        }

        return result;
    }

    // ============================================
    // 🎯 PREDEFINED VALIDATION RULES
    // ============================================

    /**
     * Required field validation
     * @param {*} value - Value to check
     * @returns {object} Validation result
     */
    required(value) {
        const isEmpty = (
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim() === '') ||
            (Array.isArray(value) && value.length === 0)
        );

        return {
            valid: !isEmpty,
            message: ErrorCodes.VALIDATION_REQUIRED_FIELD.message,
            code: ErrorCodes.VALIDATION_REQUIRED_FIELD.code
        };
    }

    /**
     * Email validation
     * @param {string} email - Email address
     * @returns {object} Validation result
     */
    email(email) {
        if (!email || email.trim() === '') {
            return { valid: true }; // Optional field
        }

        const isValid = Constants.regex.email.test(email.trim());
        return {
            valid: isValid,
            message: ErrorCodes.VALIDATION_INVALID_EMAIL.message,
            code: ErrorCodes.VALIDATION_INVALID_EMAIL.code
        };
    }

    /**
     * Employee code validation
     * @param {string} code - Employee code
     * @returns {object} Validation result
     */
    employeeCode(code) {
        if (!code) {
            return this.required(code);
        }

        const isValid = Constants.regex.employeeCode.test(code.toUpperCase().trim());
        return {
            valid: isValid,
            message: ErrorCodes.VALIDATION_INVALID_CODE.message,
            code: ErrorCodes.VALIDATION_INVALID_CODE.code
        };
    }

    /**
     * Password validation
     * @param {string} password - Password string
     * @returns {object} Validation result
     */
    password(password) {
        if (!password) {
            return this.required(password);
        }

        const config = AppConfig.security.password;
        let isValid = true;
        let message = '';

        if (password.length < config.minLength) {
            isValid = false;
            message = `كلمة المرور يجب أن تكون ${config.minLength} أحرف على الأقل`;
        } else if (password.length > config.maxLength) {
            isValid = false;
            message = `كلمة المرور يجب أن لا تتجاوز ${config.maxLength} حرف`;
        }

        // Check strength if needed
        if (isValid) {
            const strength = Utils.checkPasswordStrength(password);
            if (strength.level === 'weak' && password.length < 6) {
                message = 'كلمة مرور ضعيفة جداً - يرجى اختيار كلمة أقوى';
                // Don't invalidate, just warn
                this.warnings.push(message);
            }
        }

        return {
            valid: isValid,
            message: message || ErrorCodes.VALIDATION_WEAK_PASSWORD.message,
            code: ErrorCodes.VALIDATION_WEAK_PASSWORD.code
        };
    }

    /**
     * Minimum length validation
     * @param {string} value - Value to check
     * @param {number} min - Minimum length
     * @returns {object} Validation result
     */
    minLength(value, min) {
        if (!value) return { valid: true };

        const isValid = String(value).length >= min;
        return {
            valid: isValid,
            message: `يجب أن يكون ${min} أحرف على الأقل`
        };
    }

    /**
     * Maximum length validation
     * @param {string} value - Value to check
     * @param {number} max - Maximum length
     * @returns {object} Validation result
     */
    maxLength(value, max) {
        if (!value) return { valid: true };

        const isValid = String(value).length <= max;
        return {
            valid: isValid,
            message: `يجب أن لا يتجاوز ${max} حرف`
        };
    }

    /**
     * Pattern/Regex validation
     * @param {string} value - Value to check
     * @param {string} patternStr - Regex pattern string
     * @returns {object} Validation result
     */
    pattern(value, patternStr) {
        if (!value) return { valid: true };

        try {
            const regex = new RegExp(patternStr);
            const isValid = regex.test(value);
            return {
                valid: isValid,
                message: 'الصيغة غير صحيحة'
            };
        } catch (e) {
            console.error('Invalid regex pattern:', e);
            return { valid: true };
        }
    }

    /**
     * Match another field's value
     * @param {string} value - Current value
     * @param {string} otherFieldId - Other field ID
     * @returns {object} Validation result
     */
    match(value, otherFieldId) {
        const otherField = document.getElementById(otherFieldId);
        if (!otherField) return { valid: true };

        const otherValue = otherField.value;
        const isValid = value === otherValue;

        return {
            valid: isValid,
            message: ErrorCodes.VALIDATION_PASSWORD_MISMATCH.message,
            code: ErrorCodes.VALIDATION_PASSWORD_MISMATCH.code
        };
    }

    /**
     * Numeric validation
     * @param {*} value - Value to check
     * @returns {object} Validation result
     */
    numeric(value) {
        if (!value) return { valid: true };

        const num = Number(value);
        const isValid = !isNaN(num) && isFinite(num);

        return {
            valid: isValid,
            message: 'يجب إدخال رقم صحيح'
        };
    }

    /**
     * Phone number validation
     * @param {string} phone - Phone number
     * @returns {object} Validation result
     */
    phone(phone) {
        if (!phone) return { valid: true };

        const isValid = Constants.regex.phone.test(phone.replace(/\s/g, ''));

        return {
            valid: isValid,
            message: 'رقم الهاتف غير صالح'
        };
    }

    /**
     * Name validation (Arabic/English)
     * @param {string} name - Name to validate
     * @returns {object} Validation result
     */
    name(name) {
        if (!name) return this.required(name);

        const trimmed = name.trim();
        const isValid = Constants.regex.name.test(trimmed);

        return {
            valid: isValid,
            message: 'الاسم غير صحيح (3-100 حرف، عربي أو إنجليزي فقط)'
        };
    }

    /**
     * Date validation
     * @param {string} dateStr - Date string
     * @returns {object} Validation result
     */
    date(dateStr) {
        if (!dateStr) return { valid: true };

        const date = new Date(dateStr);
        const isValid = !isNaN(date.getTime());

        return {
            valid: isValid,
            message: 'التاريخ غير صحيح'
        };
    }

    /**
     * URL validation
     * @param {string} url - URL to validate
     * @returns {object} Validation result
     */
    url(url) {
        if (!url) return { valid: true };

        try {
            new URL(url);
            return { valid: true };
        } catch {
            return {
                valid: false,
                message: 'رابط URL غير صحيح'
            };
        }
    }

    /**
     * Range validation
     * @param {number} value - Numeric value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {object} Validation result
     */
    inRange(value, min, max) {
        if (value === null || value === undefined) return { valid: true };

        const num = Number(value);
        const isValid = num >= min && num <= max;

        return {
            valid: isValid,
            message: `يجب أن يكون بين ${min} و ${max}`
        };
    }

    // ============================================
    // 🎨 UI FEEDBACK METHODS
    // ============================================

    /**
     * Show error on a field
     * @param {HTMLElement} field - Form field element
     * @param {string} message - Error message
     */
    showFieldError(field, message) {
        // Add error class
        field.classList.add('error');
        field.classList.remove('success');

        // Find or create error message element
        let errorEl = field.parentElement.querySelector('.error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }

        // Add shake animation
        field.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            field.style.animation = '';
        }, 500);
    }

    /**
     * Clear error from field
     * @param {HTMLElement} field - Form field element
     */
    clearFieldError(field) {
        field.classList.remove('error');

        const errorEl = field.parentElement.querySelector('.error-message');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    /**
     * Show success state on field
     * @param {HTMLElement} field - Form field element
     */
    showFieldSuccess(field) {
        field.classList.add('success');
        field.classList.remove('error');
    }

    /**
     * Scroll to field with error
     * @param {HTMLElement} field - Field element
     */
    scrollToField(field) {
        setTimeout(() => {
            field.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            field.focus();
        }, 100);
    }

    /**
     * Clear all validation states from form
     * @param {HTMLElement} formElement - Form element
     */
    clearFormValidation(formElement) {
        const fields = formElement.querySelectorAll('.error, .success');
        fields.forEach(field => {
            field.classList.remove('error', 'success');
        });

        const errorMessages = formElement.querySelectorAll('.error-message');
        errorMessages.forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
    }

    // ============================================
    // 🔧 UTILITY METHODS
    // ============================================

    /**
     * Reset validator state
     */
    reset() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Get all collected errors
     * @returns {Array} Errors array
     */
    getErrors() {
        return [...this.errors];
    }

    /**
     * Get all warnings
     * @returns {Array} Warnings array
     */
    getWarnings() {
        return [...this.warnings];
    }

    /**
     * Check if there are any errors
     * @returns {boolean} Has errors
     */
    hasErrors() {
        return this.errors.length > 0;
    }

    /**
     * Sanitize and validate request data (for API calls)
     * @param {object} data - Request data object
     * @param {object} schema - Validation schema
     * @returns {object} Validation result with sanitized data
     */
    validateAndSanitizeRequest(data, schema) {
        const sanitized = {};
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            
            // Apply sanitization
            sanitized[field] = this.sanitizeValue(value, field);
            
            // Apply validation
            if (rules && rules.length > 0) {
                const result = this.validateField(sanitized[field], rules);
                if (!result.valid) {
                    errors.push({
                        field,
                        message: result.message,
                        code: result.code
                    });
                }
            }
        }

        return {
            isValid: errors.length === 0,
            data: sanitized,
            errors
        };
    }

    /**
     * Sanitize a value based on field type
     * @param {*} value - Value to sanitize
     * @param {string} field - Field name
     * @returns {*} Sanitized value
     */
    sanitizeValue(value, field) {
        if (value === null || value === undefined) return '';

        const stringValue = String(value).trim();

        // Field-specific sanitization
        switch (field.toLowerCase()) {
            case 'email':
                return Utils.sanitizeEmail(stringValue) || '';
            
            case 'code':
            case 'employee_code':
                return stringValue.toUpperCase().substring(0, 10);
            
            case 'name':
            case 'employee_name':
                return Utils.sanitizeString(stringValue);
            
            case 'password':
                return stringValue; // Don't trim passwords too much
            
            default:
                return Utils.sanitizeString(stringValue);
        }
    }

    // ============================================
    // 📊 ADVANCED VALIDATION
    // ============================================

    /**
     * Async validation (for API checks)
     * @param {*} value - Value to validate
     * @param {Function} asyncCheck - Async validation function
     * @returns {Promise<object>} Validation result
     */
    async validateAsync(value, asyncCheck) {
        try {
            const result = await asyncCheck(value);
            return result;
        } catch (error) {
            console.error('Async validation error:', error);
            return {
                valid: false,
                message: 'خطأ في التحقق'
            };
        }
    }

    /**
     * Validate attendance data before submission
     * @param {object} attendanceData - Attendance record data
     * @returns {object} Validation result
     */
    validateAttendanceData(attendanceData) {
        const errors = [];
        const requiredFields = ['employee_code', 'employee_name', 'type', 'shift'];

        for (const field of requiredFields) {
            if (!attendanceData[field] || String(attendanceData[field]).trim() === '') {
                errors.push({
                    field,
                    message: `${field} مطلوب`
                });
            }
        }

        // Validate type
        if (attendanceData.type && !['حضور', 'انصراف'].includes(attendanceData.type)) {
            errors.push({
                field: 'type',
                message: 'نوع الحضور غير صالح (يجب أن يكون حضور أو انصراف)'
            });
        }

        // Validate shift
        const validShifts = AppConfig.attendance.shifts.map(s => s.id);
        if (attendanceData.shift && !validShifts.includes(attendanceData.shift)) {
            errors.push({
                field: 'shift',
                message: 'وردية العمل غير صالحة'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            data: attendanceData
        };
    }

    /**
     * Validate user registration data
     * @param {object} regData - Registration data
     * @returns {object} Validation result
     */
    validateRegistration(regData) {
        const schema = {
            name: ['required', 'name'],
            code: ['required', 'employeeCode'],
            password: ['required', 'password']
        };

        // Optional fields
        if (regData.email) {
            schema.email = ['email'];
        }

        return this.validateAndSanitizeRequest(regData, schema);
    }

    /**
     * Validate login credentials
     * @param {object} loginData - Login data
     * @returns {object} Validation result
     */
    validateLogin(loginData) {
        const schema = {
            code: ['required', 'employeeCode'],
            password: ['required', 'password']
        };

        return this.validateAndSanitizeRequest(loginData, schema);
    }
}

// Create global instance
const validator = new Validator();

// Export for use in other modules
window.Validator = Validator;
window.validator = validator;

// Add shake animation CSS dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    input.error, select.error {
        border-color: var(--danger-500) !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
    }
    
    input.success {
        border-color: var(--success-500) !important;
    }
    
    .error-message {
        color: var(--danger-500);
        font-size: 12px;
        margin-top: 4px;
        display: none;
    }
`;
document.head.appendChild(shakeStyle);
