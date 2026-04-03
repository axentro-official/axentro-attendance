/**
 * ============================================
 * ✅ AXENTRO VALIDATOR v4.1 - ENHANCED
 * ✅ Form Validation & Sanitization
 * 🔒 محسّن مع Security Validation Rules
 * ============================================
 */

class Validator {
    constructor() {
        // Custom validation rules
        this.rules = {};
        
        console.log('✅ Validator initialized');
    }

    // ============================================
    // 📋 MAIN VALIDATION METHOD
    // ============================================

    /**
     * Validate entire form
     * @param {HTMLFormElement} form - Form element to validate
     * @param {object} fieldRules - Field validation rules
     * @returns {object} Validation result {isValid, errors}
     */
    validateForm(form, fieldRules = {}) {
        const result = {
            isValid: true,
            errors: {},
            firstErrorField: null
        };

        if (!form) {
            result.isValid = false;
            result.errors.form = 'Form element not found';
            return result;
        }

        // Clear previous errors
        this.clearFormErrors(form);

        // Validate each field according to rules
        Object.keys(fieldRules).forEach(fieldName => {
            const input = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            
            if (!input) return; // Skip if field not found

            const value = input.value?.trim() || '';
            const rules = Array.isArray(fieldRules[fieldName]) ? 
                         fieldRules[fieldName] : 
                         [fieldRules[fieldName]];

            let fieldValid = true;

            // Apply each rule
            for (const rule of rules) {
                const validationResult = this.validateRule(value, rule, fieldName);
                
                if (!validationResult.valid) {
                    fieldValid = false;
                    result.isValid = false;
                    result.errors[fieldName] = validationResult.message;

                    // Show error on field
                    this.showFieldError(input, validationResult.message);

                    // Track first error for focus
                    if (!result.firstErrorField) {
                        result.firstErrorField = input;
                    }

                    break; // Stop at first error for this field
                }
            }

            // Show success for valid fields that have value
            if (fieldValid && value) {
                this.showFieldSuccess(input);
            }
        });

        // Focus on first error field
        if (result.firstErrorField && typeof ui !== 'undefined') {
            ui.shakeElement(result.firstErrorField);
            result.firstErrorField.focus();
        }

        return result;
    }

    /**
     * Validate single value against a rule
     * @param {*} value - Value to validate
     * @param {string} rule - Rule name or custom function
     * @param {string} fieldName - Field name for messages
     * @returns {object} {valid, message}
     */
    validateRule(value, rule, fieldName) {
        // Handle custom validator functions
        if (typeof rule === 'function') {
            const result = rule(value, fieldName);
            return {
                valid: result === true || result?.valid === true,
                message: result?.message || 'Validation failed'
            };
        }

        // Handle built-in rules
        switch (rule.toLowerCase()) {
            case 'required':
                return this.validateRequired(value, fieldName);
                
            case 'email':
                return this.validateEmail(value);
                
            case 'password':
                return this.validatePassword(value);
                
            case 'employeecode':
                return this.validateEmployeeCode(value);
                
            case 'name':
                return this.validateName(value);
                
            case 'phone':
                return this.validatePhone(value);
                
            case 'minlength':
                return this.validateMinLength(value, 3);
                
            default:
                // Check for parameterized rules like "min:5"
                if (typeof rule === 'string' && rule.includes(':')) {
                    const [ruleName, param] = rule.split(':');
                    return this.validateParameterizedRule(value, ruleName, param, fieldName);
                }

                return { valid: true, message: '' };
        }
    }

    // ============================================
    // 🔍 BUILT-IN VALIDATION RULES
    // ============================================

    /**
     * Required field validation
     */
    validateRequired(value, fieldName) {
        if (!value || value.trim() === '') {
            return {
                valid: false,
                message: ErrorCodes.VALIDATION_REQUIRED_FIELD.message || 'هذا الحقل مطلوب'
            };
        }
        return { valid: true };
    }

    /**
     * Email format validation
     */
    validateEmail(value) {
        if (!value) return { valid: true }; // Optional field
        
        if (!Utils.isValidEmail(value)) {
            return {
                valid: false,
                message: ErrorCodes.VALIDATION_INVALID_EMAIL.message || 'بريد إلكتروني غير صالح'
            };
        }
        return { valid: true };
    }

    /**
     * Password strength validation
     */
    validatePassword(value) {
        if (!value) {
            return {
                valid: false,
                message: ErrorCodes.VALIDATION_REQUIRED_FIELD.message || 'كلمة المرور مطلوبة'
            };
        }

        const minLength = AppConfig?.security?.password?.minLength || 4;
        
        if (value.length < minLength) {
            return {
                valid: false,
                message: `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`
            };
        }

        // Additional strength checks (optional based on config)
        const config = AppConfig?.security?.password;
        
        if (config?.requireUppercase && !/[A-Z]/.test(value)) {
            return {
                valid: false,
                message: 'كلمة المرور يجب أن تحتوي على حرف كبير'
            };
        }

        if (config?.requireNumbers && !/\d/.test(value)) {
            return {
                valid: false,
                message: 'كلمة المرور يجب أن تحتوي على رقم'
            };
        }

        if (config?.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            return {
                valid: false,
                message: 'كلمة المرور يجب أن تحتوي على رمز خاص'
            };
        }

        return { valid: true };
    }

    /**
     * Employee code validation
     */
    validateEmployeeCode(value) {
        if (!value) {
            return {
                valid: false,
                message: ErrorCodes.VALIDATION_REQUIRED_FIELD.message || 'كود الموظف مطلوب'
            };
        }

        if (!Utils.isValidEmployeeCode(value)) {
            return {
                valid: false,
                message: ErrorCodes.VALIDATION_INVALID_CODE.message || 'كود الموظف غير صالح'
            };
        }

        return { valid: true };
    }

    /**
     * Name validation
     */
    validateName(value) {
        if (!value) {
            return {
                valid: false,
                message: ErrorCodes.VALIDATION_REQUIRED_FIELD.message || 'الاسم مطلوب'
            };
        }

        if (value.length < 3) {
            return {
                valid: false,
                message: 'الاسم يجب أن يكون 3 أحرف على الأقل'
            };
        }

        if (value.length > 100) {
            return {
                valid: false,
                message: 'الاسم طويل جداً'
            };
        }

        // Allow Arabic and English letters, spaces, and common name characters
        const nameRegex = /^[\u0600-\u06FFa-zA-Z\s\-\.]+$/;
        if (!nameRegex.test(value)) {
            return {
                valid: false,
                message: 'الاسم يحتوي على أحرف غير مسموحة'
            };
        }

        return { valid: true };
    }

    /**
     * Phone number validation
     */
    validatePhone(value) {
        if (!value) return { valid: true }; // Optional field

        // Simple phone validation (can be enhanced)
        const phoneRegex = /^[+]?[\d\s\-\(\)]{7,15}$/;
        
        if (!phoneRegex.test(value)) {
            return {
                valid: false,
                message: 'رقم الهاتف غير صالح'
            };
        }

        return { valid: true };
    }

    /**
     * Minimum length validation
     */
    validateMinLength(value, minLength = 3) {
        if (value && value.length < minLength) {
            return {
                valid: false,
                message: `يجب أن يكون ${minLength} أحرف على الأقل`
            };
        }
        return { valid: true };
    }

    /**
     * Parameterized rule handler (e.g., "min:5", "max:100")
     */
    validateParameterizedRule(value, ruleName, param, fieldName) {
        switch (ruleName.toLowerCase()) {
            case 'min':
                return this.validateMinLength(value, parseInt(param));
                
            case 'max':
                if (value && value.length > parseInt(param)) {
                    return {
                        valid: false,
                        message: `يجب ألا يتجاوز ${param} حرف`
                    };
                }
                return { valid: true };

            case 'pattern':
                try {
                    const regex = new RegExp(param);
                    if (value && !regex.test(value)) {
                        return {
                            valid: false,
                            message: 'الصيغة غير صحيحة'
                        };
                    }
                } catch (e) {
                    console.error('Invalid regex pattern:', param);
                }
                return { valid: true };

            default:
                console.warn(`⚠️ Unknown parameterized rule: ${ruleName}`);
                return { valid: true };
        }
    }

    // ============================================
    // 🎨 ERROR DISPLAY METHODS
    // ============================================

    /**
     * Show error on specific field
     * @param {HTMLElement} input - Input element
     * @param {string} message - Error message
     */
    showFieldError(input, message) {
        if (!input) return;

        // Add error class to input
        input.classList.add('error');
        
        // Add error class to parent group
        const group = input.closest('.input-group');
        if (group) {
            group.classList.add('error');
            group.classList.remove('success');
        }

        // Find or create error message element
        let errorEl = input.parentElement.querySelector('.error-message');
        
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'error-message';
            input.parentElement.appendChild(errorEl);
        }

        errorEl.textContent = message;
        errorEl.style.display = 'block';

        // Shake animation
        if (typeof ui !== 'undefined' && ui.shakeElement) {
            ui.shakeElement(group || input);
        }
    }

    /**
     * Show success state on field
     * @param {HTMLElement} input - Input element
     */
    showFieldSuccess(input) {
        if (!input) return;

        input.classList.remove('error');
        input.classList.add('valid');

        const group = input.closest('.input-group');
        if (group) {
            group.classList.remove('error');
            group.classList.add('success');
        }

        // Hide error message if exists
        const errorEl = input.parentElement.querySelector('.error-message');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    /**
     * Clear all errors from form
     * @param {HTMLFormElement} form - Form element
     */
    clearFormErrors(form) {
        if (!form) return;

        // Remove error/success classes from inputs
        form.querySelectorAll('.error, .valid').forEach(el => {
            el.classList.remove('error', 'valid');
        });

        // Remove classes from groups
        form.querySelectorAll('.input-group.error, .input-group.success').forEach(group => {
            group.classList.remove('error', 'success');
        });

        // Clear error messages
        form.querySelectorAll('.error-message').forEach(errorEl => {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        });
    }

    // ============================================
     // 🔧 UTILITY METHODS
     // ============================================

    /**
     * Sanitize string input (prevent XSS)
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitize(str) {
        if (!str || typeof str !== 'string') return '';
        
        return Utils.sanitizeHTML(str);
    }

    /**
     * Escape special HTML characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        if (!str) return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return str.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Check if value is empty
     * @param {*} value - Value to check
     * @returns {boolean}
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Add custom validation rule
     * @param {string} ruleName - Rule name
     * @param {Function} validatorFn - Validator function
     */
    addRule(ruleName, validatorFn) {
        if (typeof validatorFn === 'function') {
            this.rules[ruleName] = validatorFn;
            console.log(`✅ Custom validation rule added: ${ruleName}`);
        } else {
            console.error('❌ Validator must be a function');
        }
    }

    /**
     * Remove custom validation rule
     * @param {string} ruleName - Rule name to remove
     */
    removeRule(ruleName) {
        delete this.rules[ruleName];
    }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================

/**
 * Global validator instance
 */
let validator;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    validator = new Validator();
    
    console.log('✅ Validator module loaded');
});

console.log('✅ validator.js v4.1 loaded successfully');
