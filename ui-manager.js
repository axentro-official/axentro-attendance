/**
 * ============================================
 * 🎨 AXENTRO UI MANAGER v4.0
 * ✅ User Interface Management System
 * ============================================
 */

class UIManager {
    constructor() {
        this.toastContainer = null;
        this.loadingOverlay = null;
        this.activeModals = [];
        this.activePanels = [];
        
        this.init();
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize UI Manager
     */
    init() {
        // Create toast container if not exists
        this.toastContainer = document.getElementById('toastContainer');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toastContainer';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }

        // Initialize loading screen manager
        this.initLoadingScreen();

        // Setup global event listeners
        this.setupGlobalListeners();
    }

    /**
     * Initialize loading screen
     */
    initLoadingScreen() {
        this.loadingScreen = document.getElementById('loadingScreen');
        this.loadProgress = document.getElementById('loadProgress');
        this.loadStatus = document.getElementById('loadStatus');
    }

    /**
     * Setup global event listeners
     */
    setupGlobalListeners() {
        // Handle escape key for modals/panels
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeAllPanels();
            }
        });

        // Handle click outside to close panels
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal(e.target);
            }
        });
    }

    // ============================================
    // 🍞 TOAST NOTIFICATIONS
    // ============================================

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type: success, error, warning, info
     * @param {object} options - Additional options
     * @returns {HTMLElement} Toast element
     */
    showToast(message, type = 'info', options = {}) {
        const {
            title = '',
            duration = AppConfig.ui.toast.defaultDuration,
            closable = true,
            action = null,
            icon = true
        } = options;

        // Limit max visible toasts
        const existingToasts = this.toastContainer.querySelectorAll('.toast:not(.removing)');
        if (existingToasts.length >= AppConfig.ui.toast.maxVisible) {
            this.removeToast(existingToasts[0]);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Icon mapping
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            ${icon ? `<i class="${icons[type] || icons.info}"></i>` : ''}
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            ${action ? `<button class="btn btn-sm btn-primary toast-action">${action.text}</button>` : ''}
            ${closable ? '<button class="toast-close"><i class="fas fa-times"></i></button>' : ''}
        `;

        // Add to container
        this.toastContainer.appendChild(toast);

        // Event listeners
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.removeToast(toast));
        }

        const actionBtn = toast.querySelector('.toast-action');
        if (actionBtn && action?.onClick) {
            actionBtn.addEventListener('click', () => {
                action.onClick();
                this.removeToast(toast);
            });
        }

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }

        return toast;
    }

    /**
     * Remove toast with animation
     * @param {HTMLElement} toast - Toast element
     */
    removeToast(toast) {
        if (!toast || toast.classList.contains('removing')) return;

        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Show success toast
     * @param {string} message - Success message
     */
    showSuccess(message) {
        return this.showToast(message, 'success', {
            duration: AppConfig.ui.toast.successDuration
        });
    }

    /**
     * Show error toast
     * @param {string} message - Error message
     */
    showError(message) {
        return this.showToast(message, 'error', {
            duration: AppConfig.ui.toast.errorDuration
        });
    }

    /**
     * Show warning toast
     * @param {string} message - Warning message
     */
    showWarning(message) {
        return this.showToast(message, 'warning', {
            duration: AppConfig.ui.toast.warningDuration
        });
    }

    /**
     * Show info toast
     * @param {string} message - Info message
     */
    showInfo(message) {
        return this.showToast(message, 'info');
    }

    /**
     * Clear all toasts
     */
    clearAllToasts() {
        const toasts = this.toastContainer.querySelectorAll('.toast');
        toasts.forEach(toast => this.removeToast(toast));
    }

    // ============================================
    // ⏳ LOADING STATES
    // ============================================

    /**
     * Update loading screen progress
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} status - Status text
     */
    updateLoadingProgress(percent, status = '') {
        if (this.loadProgress) {
            this.loadProgress.style.width = `${Math.min(percent, 100)}%`;
        }
        if (this.loadStatus && status) {
            this.loadStatus.textContent = status;
        }
    }

    /**
     * Hide loading screen with fade out
     */
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    /**
     * Show loading overlay on an element
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} message - Loading message
     */
    showElementLoading(element, message = 'جاري التحميل...') {
        const el = typeof element === 'string' 
            ? document.querySelector(element)
            : element;
        
        if (!el) return;

        el.dataset.originalContent = el.innerHTML;
        el.innerHTML = `
            <div class="element-loader">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        el.disabled = true;
        el.classList.add('loading');
    }

    /**
     * Hide loading overlay from element
     * @param {HTMLElement|string} element - Element or selector
     */
    hideElementLoading(element) {
        const el = typeof element === 'string'
            ? document.querySelector(element)
            : element;
        
        if (!el || !el.dataset.originalContent) return;

        el.innerHTML = el.dataset.originalContent;
        delete el.dataset.originalContent;
        el.disabled = false;
        el.classList.remove('loading');
    }

    /**
     * Show button loading state
     * @param {HTMLButtonElement} btn - Button element
     * @param {string} loadingText - Text while loading
     */
    showButtonLoading(btn, loadingText = '') {
        if (!btn) return;

        const originalText = btn.querySelector('span:not(.btn-loader))')?.textContent || btn.textContent;
        btn.dataset.originalText = originalText;
        btn.disabled = true;

        const textSpan = btn.querySelector('span:not(.btn-loader)');
        const loaderSpan = btn.querySelector('.btn-loader');

        if (textSpan && loadingText) {
            textSpan.textContent = loadingText;
        }
        if (loaderSpan) {
            loaderSpan.classList.remove('hidden');
        }
    }

    /**
     * Hide button loading state
     * @param {HTMLButtonElement} btn - Button element
     */
    hideButtonLoading(btn) {
        if (!btn) return;

        btn.disabled = false;
        const textSpan = btn.querySelector('span:not(.btn-loader)');
        const loaderSpan = btn.querySelector('.btn-loader');

        if (textSpan && btn.dataset.originalText) {
            textSpan.textContent = btn.dataset.originalText;
        }
        if (loaderSpan) {
            loaderSpan.classList.add('hidden');
        }
    }

    // ============================================
    // 🪟 MODALS
    // ============================================

    /**
     * Open modal
     * @param {string} modalId - Modal ID or selector
     */
    openModal(modalId) {
        let modal;
        
        if (typeof modalId === 'string') {
            modal = document.getElementById(modalId) || 
                    document.querySelector(modalId);
        } else {
            modal = modalId;
        }

        if (!modal) {
            console.error(`Modal not found: ${modalId}`);
            return;
        }

        modal.classList.remove('hidden');
        this.activeModals.push(modal);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Focus trap
        this.setupFocusTrap(modal);

        // Animation
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
        });
    }

    /**
     * Close modal
     * @param {HTMLElement|string} modal - Modal element or ID
     */
    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }

        if (!modal) return;

        modal.classList.add('hidden');
        this.activeModals = this.activeModals.filter(m => m !== modal);

        // Restore body scroll if no more modals
        if (this.activeModals.length === 0) {
            document.body.style.overflow = '';
        }
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
        [...this.activeModals].forEach(modal => this.closeModal(modal));
    }

    /**
     * Setup focus trap for accessibility
     * @param {HTMLElement} modal - Modal element
     */
    setupFocusTrap(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

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
            type = 'warning', // success, warning, danger, info
            icon = null
        } = options;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            const icons = {
                success: 'fas fa-check-circle text-success',
                warning: 'fas fa-exclamation-triangle text-warning',
                danger: 'fas fa-exclamation-circle text-danger',
                info: 'fas fa-info-circle text-primary'
            };

            overlay.innerHTML = `
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        ${icon ? `<i class="${icon}" style="font-size: 24px;"></i>` : ''}
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                        <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;">
                            <button class="btn btn-secondary" id="confirmCancel">${cancelText}</button>
                            <button class="btn btn-${type}" id="confirmOk">${confirmText}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Event listeners
            overlay.querySelector('#confirmCancel').addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });

            overlay.querySelector('#confirmOk').addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });
        });
    }

    // ============================================
    // 📋 PANELS (Side Panels)
    // ============================================

    /**
     * Open side panel
     * @param {string} panelId - Panel ID
     */
    openPanel(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        panel.classList.remove('hidden');
        this.activePanels.push(panel);
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close side panel
     * @param {string} panelId - Panel ID
     */
    closePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        panel.classList.add('hidden');
        this.activePanels = this.activePanels.filter(p => p !== panel);

        if (this.activePanels.length === 0) {
            document.body.style.overflow = '';
        }
    }

    /**
     * Close all panels
     */
    closeAllPanels() {
        [...this.activePanels].forEach(panel => this.closePanel(panel.id));
    }

    // ============================================
    // 📄 PAGE NAVIGATION
    // ============================================

    /**
     * Navigate to a page with animation
     * @param {string} pageId - Target page ID
     */
    navigateTo(pageId) {
        // Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Update nav buttons
            this.updateNavigation(pageId);
        }
    }

    /**
     * Update bottom navigation active state
     * @param {string} pageId - Current page ID
     */
    updateNavigation(pageId) {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageId);
        });
    }

    // ============================================
    // 🔊 AUDIO & HAPTICS
    // ============================================

    /**
     * Play sound effect
     * @param {string} soundId - Audio element ID
     * @param {number} volume - Volume level (0-1)
     */
    playSound(soundId, volume = 0.5) {
        // Check if sounds are enabled in settings
        const settings = Utils.loadFromStorage(Constants.storageKeys.SETTINGS, {});
        if (settings.soundEnabled === false) return;

        const audio = document.getElementById(soundId);
        if (audio) {
            audio.volume = volume;
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    /**
     * Trigger device vibration
     * @param {number|Array} pattern - Vibration pattern
     */
    vibrate(pattern = 100) {
        // Check if vibration is enabled
        const settings = Utils.loadFromStorage(Constants.storageKeys.SETTINGS, {});
        if (settings.vibrationEnabled === false) return;

        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Play success feedback (sound + vibration)
     */
    playSuccessFeedback() {
        this.playSound('successSound', 0.6);
        this.vibrate([50, 50, 50]);
    }

    /**
     * Play error feedback
     */
    playErrorFeedback() {
        this.playSound('errorSound', 0.6);
        this.vibrate(200);
    }

    /**
     * Play face recognition success feedback
     */
    playFaceSuccessFeedback() {
        this.playSound('faceSuccessSound', 0.7);
        this.vibrate([100, 50, 100]);
    }

    /**
     * Play face recognition error feedback
     */
    playFaceErrorFeedback() {
        this.playSound('faceErrorSound', 0.7);
        this.vibrate([100, 100, 100]);
    }

    // ============================================
    // 🎯 FORM HELPERS
    // ============================================

    /**
     * Toggle password visibility
     * @param {Event} e - Click event
     */
    togglePasswordVisibility(e) {
        const btn = e.currentTarget;
        const inputId = btn.dataset.target;
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('i');

        if (input) {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            
            if (icon) {
                icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        }
    }

    /**
     * Update password strength indicator
     * @param {string} password - Password value
     * @param {string} containerId - Strength container ID
     */
    updatePasswordStrength(password, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const strength = Utils.checkPasswordStrength(password);
        
        container.innerHTML = `
            <div class="strength-bar ${strength.level}">
                <div class="fill"></div>
            </div>
            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">
                ${strength.level === 'weak' ? '🔴 ضعيفة' : 
                  strength.level === 'medium' ? '🟡 متوسطة' : '🟢 قوية'}
                (${strength.percentage}%)
            </small>
        `;
    }

    // ============================================
    // 📊 DATA DISPLAY HELPERS
    // ============================================

    /**
     * Format and display attendance record
     * @param {object} record - Attendance record
     * @returns {HTMLElement} Formatted row element
     */
    formatAttendanceRow(record) {
        const tr = document.createElement('tr');
        
        const typeClass = record.type === 'حضور' ? 'badge-in' : 'badge-out';
        const typeBgColor = record.type === 'حضور' ? '#dcfce7' : '#fee2e2';
        const typeTextColor = record.type === 'حضور' ? '#166534' : '#991b1b';

        tr.innerHTML = `
            <td>${Utils.formatDate(record.created_at, 'short')}</td>
            <td>
                <span style="
                    background: ${typeBgColor};
                    color: ${typeTextColor};
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                ">
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

        return tr;
    }

    /**
     * Display empty state for lists/tables
     * @param {HTMLElement} container - Container element
     * @param {string} message - Empty message
     * @param {string} icon - Font Awesome icon class
     */
    showEmptyState(container, message = 'لا توجد بيانات', icon = 'fas fa-inbox') {
        container.innerHTML = `
            <div class="empty-state">
                <i class="${icon}"></i>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Update stat card value with animation
     * @param {string} elementId - Element ID
     * @param {*} value - New value
     */
    animateStatValue(elementId, value) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const currentValue = parseInt(el.textContent) || 0;
        const newValue = parseInt(value) || 0;
        const diff = newValue - currentValue;
        const duration = 500;
        const steps = 30;
        const stepValue = diff / steps;
        let step = 0;

        const animate = setInterval(() => {
            step++;
            el.textContent = Math.round(currentValue + (stepValue * step));
            
            if (step >= steps) {
                clearInterval(animate);
                el.textContent = newValue;
            }
        }, duration / steps);
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time
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
    }

    /**
     * Get current timestamp formatted
     * @returns {string} Formatted timestamp
     */
    getTimestamp() {
        return new Date().toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Show network offline indicator
     */
    showOfflineIndicator() {
        this.showWarning('أنت غير متصل بالإنترنت - سيتم حفظ البيانات محلياً');
        
        // Add offline class to body
        document.body.classList.add('offline');
    }

    /**
     * Hide network offline indicator
     */
    hideOfflineIndicator() {
        document.body.classList.remove('offline');
        this.showSuccess('تم استعادة الاتصال بالإنترنت ✓');
    }
}

// Create global instance
const ui = new UIManager();

// Export for use in other modules
window.UIManager = UIManager;
window.ui = ui;
