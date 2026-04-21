/**
 * ============================================
 * 🎨 AXENTRO UI MANAGER v4.1 - ENHANCED
 * ✅ User Interface Management & Animations
 * 🔥 محسّن مع Toast Notifications و Modal System
 * ============================================
 */

class UIManager {
    constructor() {
        this.toastContainer = null;
        this.activeToasts = 0;
        this.maxVisibleToasts = AppConfig?.ui?.toast?.maxVisible || 3;
        
        console.log('🎨 UI Manager initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize UI manager
     */
    init() {
        // Create toast container if not exists
        this.ensureToastContainer();
        
        // Setup global UI event listeners
        this.setupGlobalListeners();
        
        console.log('✅ UI Manager ready');
    }

    /**
     * Ensure toast container exists in DOM
     */
    ensureToastContainer() {
        this.toastContainer = document.getElementById('toastContainer');
        
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toastContainer';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    }

    /**
     * Setup global UI event listeners
     */
    setupGlobalListeners() {
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Handle form input animations
        document.querySelectorAll('.input-group input').forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('focused');
                if (input.value) {
                    input.parentElement.classList.add('filled');
                } else {
                    input.parentElement.classList.remove('filled');
                }
            });
        });

        // Toggle password visibility
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                    }
                }
            });
        });
    }

    // ============================================
    // 📢 TOAST NOTIFICATIONS
    // ============================================

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Type: success, error, warning, info
     * @param {number} duration - Duration in ms
     */
    showToast(message, type = 'info', duration = null) {
        // Ensure container exists
        this.ensureToastContainer();

        // Check max visible toasts
        if (this.activeToasts >= this.maxVisibleToasts) {
            // Remove oldest toast
            const oldestToast = this.toastContainer.querySelector('.toast');
            if (oldestToast) {
                this.removeToast(oldestToast);
            }
        }

        // Determine duration based on type or use default
        const durations = {
            success: AppConfig?.ui?.toast?.successDuration || 3000,
            error: AppConfig?.ui?.toast?.errorDuration || 5000,
            warning: AppConfig?.ui?.toast?.warningDuration || 4000,
            info: AppConfig?.ui?.toast?.defaultDuration || 4000
        };

        const toastDuration = duration !== null ? duration : (durations[type] || durations.info);

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Icon mapping
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                <p>${Utils.sanitizeHTML(message)}</p>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove(); ui.activeToasts--;">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to container with animation
        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        this.activeToasts++;

        // Auto-remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, toastDuration);

        return toast;
    }

    /**
     * Remove toast element with animation
     * @param {HTMLElement} toast - Toast element to remove
     */
    removeToast(toast) {
        if (!toast || !toast.parentElement) return;

        toast.classList.remove('show');
        toast.classList.add('hide');

        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
                this.activeToasts = Math.max(0, this.activeToasts - 1);
            }
        }, 300);
    }

    /**
     * Show success toast (shorthand)
     * @param {string} message 
     */
    showSuccess(message) {
        return this.showToast(message, 'success');
    }

    /**
     * Show error toast (shorthand)
     * @param {string} message 
     */
    showError(message) {
        return this.showToast(message, 'error');
    }

    /**
     * Show warning toast (shorthand)
     * @param {string} message 
     */
    showWarning(message) {
        return this.showToast(message, 'warning');
    }

    /**
     * Show info toast (shorthand)
     * @param {string} message 
     */
    showInfo(message) {
        return this.showToast(message, 'info');
    }

    // ============================================
    // 💬 CONFIRMATION DIALOGS
    // ============================================

    /**
     * Show confirmation dialog
     * @param {object} options - Dialog options
     * @returns {Promise<boolean>} User's choice
     */
    async showConfirmation(options = {}) {
        const {
            title = 'تأكيد',
            message = 'هل أنت متأكد؟',
            confirmText = 'نعم',
            cancelText = 'إلغاء',
            type = 'info' // info, warning, danger
        } = options;

        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay confirmation-modal';
            
            overlay.innerHTML = `
                <div class="modal-content confirmation-content">
                    <div class="confirmation-header">
                        <h3>${this.getConfirmationIcon(type)} ${title}</h3>
                    </div>
                    <div class="confirmation-body">
                        <p>${message}</p>
                    </div>
                    <div class="confirmation-actions">
                        <button class="btn btn-outline" id="confirmCancel">
                            ${cancelText}
                        </button>
                        <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'}" id="confirmOk">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            // Add to DOM
            document.body.appendChild(overlay);

            // Animate in
            requestAnimationFrame(() => {
                overlay.classList.add('show');
            });

            // Event handlers
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                overlay.classList.remove('show');
                setTimeout(() => {
                    if (overlay.parentElement) {
                        overlay.parentElement.removeChild(overlay);
                    }
                }, 300);
            };

            overlay.querySelector('#confirmOk').addEventListener('click', handleConfirm);
            overlay.querySelector('#confirmCancel').addEventListener('click', handleCancel);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) handleCancel();
            });
        });
    }

    /**
     * Get icon for confirmation dialog based on type
     * @param {string} type - Dialog type
     * @returns {string} Icon HTML
     */
    getConfirmationIcon(type) {
        const icons = {
            info: '<i class="fas fa-info-circle" style="color: #3b82f6;"></i>',
            warning: '<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>',
            danger: '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>',
            success: '<i class="fas fa-check-circle" style="color: #10b981;"></i>'
        };
        return icons[type] || icons.info;
    }

    async showPrompt(options = {}) {
        const {
            title = 'إدخال مطلوب',
            message = 'يرجى إدخال القيمة المطلوبة.',
            placeholder = '',
            confirmText = 'متابعة',
            cancelText = 'إلغاء',
            type = 'info',
            inputType = 'text',
            required = true,
            value = '',
            errorMessage = 'هذا الحقل مطلوب'
        } = options;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay confirmation-modal prompt-modal';

            overlay.innerHTML = `
                <div class="modal-content confirmation-content">
                    <div class="confirmation-header">
                        <h3>${this.getConfirmationIcon(type)} ${Utils.sanitizeHTML(title)}</h3>
                    </div>
                    <div class="confirmation-body">
                        <p class="prompt-message">${Utils.sanitizeHTML(message)}</p>
                        <div class="prompt-input-wrap">
                            <input type="${inputType === 'password' ? 'password' : 'text'}" class="prompt-input" id="uiPromptInput" placeholder="${Utils.sanitizeHTML(placeholder)}" value="${Utils.sanitizeHTML(String(value || ''))}" autocomplete="${inputType === 'password' ? 'current-password' : 'off'}">
                            ${inputType === 'password' ? '<button type="button" class="prompt-password-toggle" id="togglePromptPassword"><i class="fas fa-eye"></i></button>' : ''}
                        </div>
                        <div class="prompt-error" id="uiPromptError">${Utils.sanitizeHTML(errorMessage)}</div>
                    </div>
                    <div class="confirmation-actions">
                        <button class="btn btn-outline" id="promptCancelBtn">${Utils.sanitizeHTML(cancelText)}</button>
                        <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'}" id="promptOkBtn">${Utils.sanitizeHTML(confirmText)}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));

            const input = overlay.querySelector('#uiPromptInput');
            const errorEl = overlay.querySelector('#uiPromptError');
            const cleanup = (result) => {
                overlay.classList.remove('show');
                setTimeout(() => {
                    if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
                }, 300);
                resolve(result);
            };

            const submit = () => {
                const currentValue = String(input?.value || '').trim();
                if (required && !currentValue) {
                    errorEl?.classList.add('show');
                    input?.focus();
                    return;
                }
                cleanup(currentValue || null);
            };

            overlay.querySelector('#promptCancelBtn')?.addEventListener('click', () => cleanup(null));
            overlay.querySelector('#promptOkBtn')?.addEventListener('click', submit);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(null);
            });
            input?.addEventListener('input', () => errorEl?.classList.remove('show'));
            input?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                }
            });
            overlay.querySelector('#togglePromptPassword')?.addEventListener('click', () => {
                if (!input) return;
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                const icon = overlay.querySelector('#togglePromptPassword i');
                if (icon) icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
            setTimeout(() => input?.focus(), 50);
        });
    }

    // ============================================
    // 🪟 MODAL MANAGEMENT
    // ============================================

    /**
     * Open modal by ID
     * @param {string} modalId - Modal element ID
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        
        if (!modal) {
            console.warn(`⚠️ Modal not found: ${modalId}`);
            return;
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        console.log(`📂 Modal opened: ${modalId}`);
    }

    /**
     * Close modal by ID
     * @param {string} modalId - Modal element ID
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        
        if (!modal) return;

        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling

        console.log(`📕 Modal closed: ${modalId}`);
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        
        document.body.style.overflow = '';
    }

    // ============================================
    // 📄 PAGE NAVIGATION
    // ============================================

    /**
     * Navigate to page by ID
     * @param {string} pageId - Target page ID
     */
    navigateTo(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Scroll to top of new page
            window.scrollTo({ top: 0, behavior: 'smooth' });

            console.log(`📍 Navigated to: ${pageId}`);
        } else {
            console.warn(`⚠️ Page not found: ${pageId}`);
        }
    }

    // ============================================
    // 🎛️ LOADING STATES
    // ============================================

    /**
     * Update loading progress bar
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} statusText - Status text to display
     */
    updateLoadingProgress(percent, statusText) {
        const progressBar = document.getElementById('loadProgress');
        const statusEl = document.getElementById('loadStatus');

        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            progressBar.setAttribute('aria-valuenow', percent);
        }

        if (statusEl) {
            statusEl.textContent = statusText;
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                
                const appContainer = document.getElementById('app');
                if (appContainer) {
                    appContainer.classList.remove('hidden');
                }
            }, 500);
        }
    }

    /**
     * Show button loading state
     * @param {HTMLElement} button - Button element
     * @param {string} text - Loading text
     */
    showButtonLoading(button, text = 'جاري التحميل...') {
        if (!button) return;

        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        
        const loaderSpan = button.querySelector('.btn-loader') || 
                           document.createElement('span');
        loaderSpan.className = 'btn-loader';
        loaderSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        if (!button.querySelector('.btn-loader')) {
            button.appendChild(loaderSpan);
        }

        const textSpan = button.querySelector('span:not(.btn-loader)');
        if (textSpan) {
            textSpan.textContent = text;
        }

        button.classList.add('loading');
    }

    /**
     * Hide button loading state
     * @param {HTMLElement} button - Button element
     */
    hideButtonLoading(button) {
        if (!button) return;

        button.disabled = false;
        button.classList.remove('loading');

        // Restore original text
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }

        // Remove loader
        const loader = button.querySelector('.btn-loader');
        if (loader) {
            loader.remove();
        }
    }

    // ============================================
    // 🎵 FEEDBACK & ANIMATIONS
    // ============================================

    /**
     * Play success feedback (sound + vibration)
     */
    playSuccessFeedback() {
        Utils.playSound('loginSuccess', 0.7);
        Utils.vibrate([100, 50, 100]);
    }

    /**
     * Play error feedback (sound + vibration)
     */
    playErrorFeedback() {
        Utils.playSound('loginError', 0.7);
        Utils.vibrate([200]);
    }

    /**
     * Play sound effect
     * @param {string} soundId - Sound element ID
     * @param {number} volume - Volume level (0-1)
     */
    playSound(soundId, volume = 0.7) {
        Utils.playSound(soundId, volume);
    }

    /**
     * Shake element animation (for errors)
     * @param {HTMLElement|string} element - Element or selector
     */
    shakeElement(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        
        if (el) {
            el.style.animation = 'shake 0.5s ease';
            setTimeout(() => el.style.animation = '', 500);
        }
    }

    /**
     * Pulse element animation (for attention)
     * @param {HTMLElement|string} element - Element or selector
     */
    pulseElement(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        
        if (el) {
            el.classList.add('pulse');
            setTimeout(() => el.classList.remove('pulse'), 1000);
        }
    }

    // ============================================
    // 📊 FORM HELPERS
    // ============================================

    /**
     * Clear all form validation errors
     * @param {HTMLFormElement} form - Form element
     */
    clearFormErrors(form) {
        if (!form) return;

        form.querySelectorAll('.error-message').forEach(errorEl => {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        });

        form.querySelectorAll('.input-group').forEach(group => {
            group.classList.remove('error', 'success');
        });
    }

    /**
     * Show field error
     * @param {string} fieldId - Field ID
     * @param {string} message - Error message
     */
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(`${fieldId}Error`);

        if (field) {
            field.classList.add('error');
            field.parentElement?.classList.add('error');
        }

        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    /**
     * Show field success
     * @param {string} fieldId - Field ID
     */
    showFieldSuccess(fieldId) {
        const field = document.getElementById(fieldId);
        
        if (field) {
            field.classList.add('success');
            field.parentElement?.classList.add('success');
        }

        // Hide error if exists
        const errorEl = document.getElementById(`${fieldId}Error`);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    // ============================================
    // 🔄 UTILITY METHODS
    // ============================================

    /**
     * Animate number counter
     * @param {string} elementId - Target element ID
     * @param {number} targetValue - Final value
     * @param {number} duration - Animation duration in ms
     */
    animateStatValue(elementId, targetValue, duration = 1000) {
        const el = document.getElementById(elementId);
        
        if (!el) return;

        const startValue = parseInt(el.textContent) || 0;
        const increment = (targetValue - startValue) / (duration / 16); // 60fps
        
        let currentValue = startValue;
        
        const animate = () => {
            currentValue += increment;
            
            if ((increment > 0 && currentValue >= targetValue) ||
                (increment < 0 && currentValue <= targetValue)) {
                el.textContent = targetValue;
                return;
            }
            
            el.textContent = Math.round(currentValue);
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    /**
     * Set default dates for report date range picker
     */
    setDefaultDates() {
        const startDateInput = document.getElementById('reportStartDate');
        const endDateInput = document.getElementById('reportEndDate');

        if (startDateInput && endDateInput) {
            const today = new Date();
            const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            startDateInput.value = firstOfMonth.toISOString().split('T')[0];
            endDateInput.value = today.toISOString().split('T')[0];
        }
    }

    /**
     * Get current timestamp formatted for display
     * @returns {string}
     */
    getCurrentTimestamp() {
        return Utils.formatDate(new Date(), 'datetime');
    }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================

/**
 * Global UI manager instance
 */
let ui;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ui = new UIManager();
    ui.init();
    
    console.log('🎨 UI Manager module loaded');
});

console.log('✅ ui-manager.js v4.1 loaded successfully');
