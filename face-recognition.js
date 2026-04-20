/**
 * ================================================
 * 🎭 AXENTRO FACE RECOGNITION v6.0 - POWERED BY HUMAN
 * ✅ Stable Detection, Advanced Anti-Spoofing, Fast Auto-Capture
 * 🔥 Built with @vladmandic/human library for maximum performance
 * ================================================
 */

class FaceRecognitionManager {
    constructor() {
        // Core elements
        this.video = null;
        this.canvas = null;
        this.overlay = null;
        this.ctx = null;
        this.stream = null;
        this.human = null; // Human library instance

        // State
        this.isActive = false;
        this.isModelsLoaded = false;
        this.currentMode = null;
        this.modeOptions = {};

        // Detection loop
        this.rafId = null;
        this.lastDetectionTime = 0;
        this.detectionThrottleMs = 100;

        // Face tracking history for stability
        this.faceHistory = [];
        this.maxHistory = 5;
        this.stabilityScore = 0;
        this.stabilityThreshold = 0.8;
        this.captureDelayMs = 400;
        this.captureTimer = null;

        // Descriptor caching
        this.cachedDescriptor = null;
        this.cachedDescriptorAt = 0;
        this.extractTimeoutMs = 7000;

        // Liveness state (simplified, Human handles the logic)
        this.liveness = {
            active: false,
            completed: false
        };

        // UI elements
        this.statusElement = null;
        this.stabilityRing = null;
        this.matchResult = null;

        // Cooldown
        this.lastCaptureTime = 0;
        this.captureCooldown = 1500;
        this.isProcessing = false;

        console.log('🎭 FaceRecognitionManager v6.0 (Human) initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    async init() {
        console.log('🎭 Initializing Human Library...');
        try {
            // 1. Load the Human library
            await this.loadHumanLibrary();
            
            // 2. Configure Human for optimal face recognition
            this.configureHuman();
            
            // 3. Load models
            await this.loadModels();
            
            // 4. Setup UI
            this.setupOverlay();
            
            console.log('✅ Face Recognition ready');
        } catch (error) {
            console.error('❌ Face Recognition init failed:', error);
            this.showNonBlockingMessage(
                'تعذر تحميل نماذج التعرف على الوجه. يمكنك استخدام كلمة المرور فقط.',
                'warning'
            );
            this.isModelsLoaded = false;
        }
    }

    loadHumanLibrary() {
        return new Promise((resolve, reject) => {
            // Check if Human is already loaded globally
            if (typeof Human !== 'undefined') {
                resolve();
                return;
            }

            // If not, load it from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/dist/human.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Human library from CDN'));
            document.head.appendChild(script);
        });
    }

    configureHuman() {
        // Base configuration for Human library
        const humanConfig = {
            debug: false, // Set to true for verbose logging
            backend: 'webgl', // 'webgl', 'wasm', or 'cpu'
            // Use reliable CDN for models
            modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models/',
            // Enable only what we need for optimal performance
            face: {
                enabled: true,
                detector: { rotation: false, maxDetected: 1 },
                mesh: { enabled: true },
                iris: { enabled: false },
                description: { enabled: true },
                emotion: { enabled: false },
                // Advanced anti-spoofing features
                antispoof: { enabled: true },
                liveness: { enabled: true }
            },
            body: { enabled: false },
            hand: { enabled: false },
            object: { enabled: false },
            gesture: { enabled: false },
            segmentation: { enabled: false },
            filter: { enabled: true, equalization: true, flip: false }
        };

        this.human = new Human(humanConfig);
    }

    async loadModels() {
        this.setStatusText('جاري تحميل نماذج الذكاء الاصطناعي...');
        updateSplashProgress?.(25);
        try {
            await this.human.load();
            this.isModelsLoaded = true;
            updateSplashProgress?.(100);
            this.setStatusText('النظام جاهز');
            setTimeout(() => updateSplashProgress?.(0), 500);
            console.log('✅ Human models loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load Human models:', error);
            this.isModelsLoaded = false;
            throw error;
        }
    }

    // ============================================
    // 📹 CAMERA OPERATIONS
    // ============================================

    async openCamera(mode = null, options = {}) {
        if (this.isActive) this.closeCamera();

        if (!this.isModelsLoaded) {
            this.setStatusText('جاري تحميل النماذج...');
            try {
                await this.loadModels();
            } catch (e) {
                this.setStatusText('❌ فشل تحميل نماذج التعرف. تحقق من الاتصال.');
                this.showNonBlockingMessage('تعذر تحميل نماذج التعرف على الوجه', 'error');
                return false;
            }
        }

        this.currentMode = mode || this.detectModeFromGlobals();
        this.modeOptions = options;

        this.ensureOverlayElements();
        this.overlay.style.display = 'flex';
        this.overlay.classList.add('active');

        this.resetDetectionState();
        this.isProcessing = false;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: AppConfig?.faceRecognition?.camera?.facingMode || 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });

            this.video.srcObject = this.stream;
            this.video.setAttribute('playsinline', 'true');
            this.video.muted = true;

            await new Promise((resolve) => {
                this.video.onloadedmetadata = resolve;
                setTimeout(resolve, 500);
            });

            await this.video.play();

            this.canvas.width = this.video.videoWidth || 640;
            this.canvas.height = this.video.videoHeight || 480;
            this.ctx = this.canvas.getContext('2d');

            this.isActive = true;
            this.setStatusText(this.getInitialStatusMessage());

            this.startDetectionLoop();
            return true;
        } catch (error) {
            console.error('Camera error:', error);
            this.flashFailure('فشل الوصول للكاميرا');
            this.closeCamera();
            return false;
        }
    }

    closeCamera() {
        this.isActive = false;
        this.isProcessing = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) this.video.srcObject = null;

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        if (this.captureTimer) {
            clearTimeout(this.captureTimer);
            this.captureTimer = null;
        }

        if (this.overlay) {
            this.overlay.style.display = 'none';
            this.overlay.classList.remove('active');
        }

        this.clearGlobalFlags();
        console.log('📴 Camera closed');
    }

    stopCamera() {
        this.closeCamera();
    }

    isCameraRunning() {
        return this.isActive;
    }

    // ============================================
    // 🖥️ UI SETUP (Similar to v5.1 but using Human's drawing)
    // ============================================

    setupOverlay() {
        if (document.getElementById('cameraOverlay')) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'cameraOverlay';
        this.overlay.innerHTML = this.getOverlayHTML();
        document.body.appendChild(this.overlay);
        this.injectStyles();

        this.cacheDOMElements();
        this.bindEvents();
    }

    ensureOverlayElements() {
        this.overlay = document.getElementById('cameraOverlay');
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.statusElement = document.getElementById('camStatus');
        this.cacheDOMElements();
        this.ctx = this.canvas?.getContext('2d');
    }

    cacheDOMElements() {
        this.stabilityRing = {
            container: document.getElementById('stabilityRing'),
            circle: document.getElementById('stabilityCircle'),
            text: document.getElementById('stabilityText')
        };
        this.matchResult = {
            container: document.getElementById('matchResult'),
            icon: document.getElementById('matchResultIcon')
        };
    }

    bindEvents() {
        const closeBtn = this.overlay.querySelector('#closeCameraBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeCamera());

        const switchBtn = this.overlay.querySelector('#switchCameraBtn');
        if (switchBtn) {
            switchBtn.addEventListener('click', async () => {
                if (AppConfig) {
                    AppConfig.faceRecognition.camera.facingMode =
                        AppConfig.faceRecognition.camera.facingMode === 'user' ? 'environment' : 'user';
                    await this.openCamera(this.currentMode, this.modeOptions);
                }
            });
        }
    }

    getOverlayHTML() {
        return `
            <div id="cameraCard" style="
                width:min(720px,96vw);
                background:#0f172a;
                border:1px solid rgba(148,163,184,.2);
                border-radius:24px;
                padding:16px;
                color:#fff;
                box-shadow:0 20px 40px rgba(0,0,0,.5);
            ">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <strong style="font-size:1.1rem;">التحقق ببصمة الوجه</strong>
                    <div style="display:flex;gap:8px;">
                        <button id="switchCameraBtn" type="button" style="background:#334155;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;">🔄 تبديل</button>
                        <button id="closeCameraBtn" type="button" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;">✕ إغلاق</button>
                    </div>
                </div>

                <div id="cameraViewport" style="position:relative;aspect-ratio:4/3;background:#020617;border-radius:16px;overflow:hidden;">
                    <video id="video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
                    <canvas id="canvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
                    <div style="position:absolute;top:15%;left:15%;right:15%;bottom:15%;border:2px dashed rgba(56,189,248,0.6);border-radius:24px;pointer-events:none;"></div>
                    <div id="stabilityRing" style="position:absolute;bottom:16px;left:16px;display:none;align-items:center;gap:8px;background:rgba(15,23,42,0.8);padding:6px 12px;border-radius:40px;backdrop-filter:blur(4px);">
                        <svg width="36" height="36" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.2)" stroke-width="3" fill="none"></circle>
                            <circle id="stabilityCircle" cx="18" cy="18" r="15" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="94.2" stroke-dashoffset="94.2" transform="rotate(-90 18 18)"></circle>
                        </svg>
                        <span id="stabilityText" style="font-weight:600;min-width:24px;">0</span>
                    </div>
                    <div id="matchResult" style="position:absolute;top:16px;right:16px;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.5);border:2px solid rgba(255,255,255,0.1);opacity:0;transform:scale(0.8);transition:all 0.2s;backdrop-filter:blur(4px);">
                        <span id="matchResultIcon" style="font-size:24px;font-weight:700;color:#fff;"></span>
                    </div>
                </div>
                <div id="camStatus" style="margin-top:12px;text-align:center;color:#cbd5e1;font-size:0.95rem;">جاهز</div>
            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('face-recognition-styles')) return;
        const style = document.createElement('style');
        style.id = 'face-recognition-styles';
        style.textContent = `
            .stability-pulse { animation: pulse-ring 1.5s infinite; }
            .match-success {
                opacity:1 !important;
                transform:scale(1) !important;
                background:rgba(16,185,129,0.95) !important;
                border-color:rgba(255,255,255,0.3) !important;
                box-shadow:0 0 0 4px rgba(16,185,129,0.3) !important;
            }
            .match-fail {
                opacity:1 !important;
                transform:scale(1) !important;
                background:rgba(239,68,68,0.95) !important;
                border-color:rgba(255,255,255,0.3) !important;
                box-shadow:0 0 0 4px rgba(239,68,68,0.3) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // 🎯 DETECTION LOOP (Using Human)
    // ============================================

    startDetectionLoop() {
        const loop = async (timestamp) => {
            if (!this.isActive) return;
            if (timestamp - this.lastDetectionTime >= this.detectionThrottleMs) {
                this.lastDetectionTime = timestamp;
                await this.detectAndProcess();
            }
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    async detectAndProcess() {
        if (!this.isModelsLoaded || !this.video?.videoWidth) return;

        try {
            // Perform detection using Human library
            const result = await this.human.detect(this.video);
            
            // Clear canvas and draw results using Human's built-in drawing tools
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.human.draw.face(this.canvas, result.face);
            
            if (!result.face || result.face.length === 0) {
                this.handleNoFace();
                return;
            }

            // Human returns an array of faces, we take the first one
            const face = result.face[0];
            this.handleFaceDetected(face);
        } catch (error) {
            console.error('Detection processing error:', error);
        }
    }

    handleNoFace() {
        this.resetStability();
        this.cancelCaptureTimer();
        this.setStatusText(this.getInstructionMessage());
        window.currentFaceDetected = false;
    }

    handleFaceDetected(face) {
        window.currentFaceDetected = true;
        
        // Update face history for stability calculation
        this.updateFaceHistory(face);
        this.calculateStability();
        this.updateStabilityRingUI();

        // Check anti-spoofing and liveness (provided by Human library)
        const isReal = face.real || 0;
        const isLive = face.live || 0;
        const antiSpoofThreshold = 0.5;
        const livenessThreshold = 0.5;

        if (this.shouldCheckLiveness() && (isReal < antiSpoofThreshold || isLive < livenessThreshold)) {
            this.setStatusText(`🔍 تأكد من أنك شخص حقيقي... (التحقق: ${Math.round(isReal*100)}%)`);
            this.cancelCaptureTimer();
            return;
        }

        // If all checks pass, proceed with stability
        if (this.stabilityScore >= this.stabilityThreshold) {
            this.setStatusText('✅ الوجه ثابت - جاري الالتقاط...');
            this.scheduleCapture(face);
        } else {
            this.cancelCaptureTimer();
            this.setStatusText(this.getStabilityMessage());
        }
    }

    // ============================================
    // 📐 STABILITY CALCULATION
    // ============================================

    updateFaceHistory(face) {
        const box = face.box;
        const faceData = {
            x: box[0],
            y: box[1],
            width: box[2],
            height: box[3],
            centerX: box[0] + box[2] / 2,
            centerY: box[1] + box[3] / 2,
            timestamp: Date.now()
        };

        this.faceHistory.push(faceData);
        if (this.faceHistory.length > this.maxHistory) {
            this.faceHistory.shift();
        }
    }

    calculateStability() {
        if (this.faceHistory.length < 3) {
            this.stabilityScore = 0;
            return;
        }

        // Calculate variance in position and size
        const centers = this.faceHistory.map(f => ({ x: f.centerX, y: f.centerY }));
        const widths = this.faceHistory.map(f => f.width);

        const avgCenter = centers.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
        avgCenter.x /= centers.length;
        avgCenter.y /= centers.length;

        const centerDistances = centers.map(c => Math.hypot(c.x - avgCenter.x, c.y - avgCenter.y));
        const avgDistance = centerDistances.reduce((a, b) => a + b, 0) / centerDistances.length;

        const widthVariance = Math.max(...widths) - Math.min(...widths);
        const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;

        // Normalize
        const distanceScore = Math.max(0, 1 - (avgDistance / (avgWidth * 0.3)));
        const sizeScore = Math.max(0, 1 - (widthVariance / (avgWidth * 0.2)));

        this.stabilityScore = (distanceScore * 0.6 + sizeScore * 0.4);

        // Also check if face is well-positioned
        const last = this.faceHistory[this.faceHistory.length - 1];
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        const isCentered = Math.abs(last.centerX - videoWidth/2) < videoWidth * 0.15 &&
                          Math.abs(last.centerY - videoHeight/2) < videoHeight * 0.15;
        const isGoodSize = last.width > videoWidth * 0.2 && last.width < videoWidth * 0.6;

        if (!isCentered || !isGoodSize) {
            this.stabilityScore *= 0.5;
        }
    }

    resetStability() {
        this.faceHistory = [];
        this.stabilityScore = 0;
        this.updateStabilityRingUI();
    }

    // ============================================
    // 🧬 LIVENESS DETECTION (Simplified, Human handles it)
    // ============================================

    shouldCheckLiveness() {
        // Always check liveness for verification/attendance modes
        return (this.currentMode === 'verify' || this.currentMode === 'attendance');
    }

    // ============================================
    // 📸 CAPTURE LOGIC
    // ============================================

    scheduleCapture(face) {
        if (this.captureTimer || this.isProcessing) return;

        // Cooldown check
        const now = Date.now();
        if (now - this.lastCaptureTime < this.captureCooldown) return;

        // Cache descriptor from Human's result
        if (face.embedding) {
            this.cachedDescriptor = Array.from(face.embedding);
            this.cachedDescriptorAt = now;
        }

        this.captureTimer = setTimeout(() => {
            this.captureTimer = null;
            this.performCapture();
        }, this.captureDelayMs);
    }

    cancelCaptureTimer() {
        if (this.captureTimer) {
            clearTimeout(this.captureTimer);
            this.captureTimer = null;
        }
    }

    async performCapture() {
        if (this.isProcessing || !this.isActive) return;

        this.isProcessing = true;
        this.lastCaptureTime = Date.now();
        this.cancelCaptureTimer();

        this.setStatusText('📸 جاري استخراج بصمة الوجه...');

        try {
            // Perform one more detection to get the freshest descriptor
            const result = await this.human.detect(this.video);
            if (!result.face || result.face.length === 0) {
                throw new Error('لم يتم اكتشاف وجه.');
            }

            const face = result.face[0];
            if (!face.embedding) {
                throw new Error('تعذر استخراج بصمة الوجه.');
            }

            const descriptor = Array.from(face.embedding);
            
            // Capture thumbnail image
            const imageBlob = await this.captureImageBlob();

            // Handle based on mode
            await this.handleModeAction(descriptor, imageBlob);

            this.flashSuccess('تمت العملية بنجاح');
        } catch (error) {
            console.error('Capture error:', error);
            this.flashFailure(error.message || 'فشل في معالجة بصمة الوجه');
        } finally {
            this.isProcessing = false;
            this.resetStability();
        }
    }

    async captureImageBlob() {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let w = this.video.videoWidth;
        let h = this.video.videoHeight;
        const ratio = Math.min(maxDim / w, maxDim / h);
        if (ratio < 1) {
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(this.video, 0, 0, w, h);
        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    }

    // ============================================
    // 📊 UI HELPERS
    // ============================================

    setStatusText(text) {
        if (this.statusElement) {
            this.statusElement.innerHTML = text;
        }
        window.lastCamStatusText = text;
    }

    updateStabilityRingUI() {
        const { container, circle, text } = this.stabilityRing;
        if (!container) return;

        if (this.stabilityScore > 0.1) {
            container.style.display = 'flex';
            const percent = Math.min(this.stabilityScore, 1);
            const circumference = 94.2;
            const offset = circumference - (percent * circumference);
            circle.style.strokeDashoffset = offset;
            text.textContent = Math.round(percent * 100);
        } else {
            container.style.display = 'none';
        }
    }

    flashSuccess(message) {
        this.showMatchResult(true);
        playSound?.('faceid-success');
        this.setStatusText(`<span style="color:#10b981;">✓ ${message}</span>`);
    }

    flashFailure(message) {
        this.showMatchResult(false);
        playSound?.('faceid-error');
        this.setStatusText(`<span style="color:#ef4444;">✕ ${message}</span>`);
    }

    showMatchResult(success) {
        const { container, icon } = this.matchResult;
        if (!container) return;
        container.classList.remove('match-success', 'match-fail');
        if (success) {
            icon.innerHTML = '✓';
            container.classList.add('match-success');
        } else {
            icon.innerHTML = '✕';
            container.classList.add('match-fail');
        }
        setTimeout(() => {
            container.style.opacity = '0';
        }, 1500);
    }

    getInitialStatusMessage() {
        if (this.currentMode === 'register') return '📝 سجل وجهك - ضع وجهك داخل الإطار';
        if (this.currentMode === 'verify' || this.currentMode === 'attendance') return '🔒 ضع وجهك للتحقق';
        return '👤 ضع وجهك داخل الإطار';
    }

    getInstructionMessage() {
        return '🔍 وجّه الكاميرا إلى وجهك';
    }

    getStabilityMessage() {
        return `📐 ثبّت وجهك (${Math.round(this.stabilityScore * 100)}%)`;
    }

    showNonBlockingMessage(message, type = 'warning') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else if (typeof ui !== 'undefined' && ui.showWarning) {
            ui.showWarning(message);
        } else {
            console.warn(message);
        }
    }

    // ============================================
    // 🔄 MODE HANDLING
    // ============================================

    detectModeFromGlobals() {
        if (window.regMode || window.firstTimeSetupMode) return 'register';
        if (window.updateFaceMode || window.adminResetFaceMode) return 'update';
        if (window.attMode) return 'attendance';
        if (window.adminVerifyMode) return 'verify';
        return null;
    }

    clearGlobalFlags() {
        window.regMode = false;
        window.attMode = false;
        window.updateFaceMode = false;
        window.adminVerifyMode = false;
        window.firstTimeSetupMode = false;
        window.adminResetFaceMode = false;
    }

    async handleModeAction(descriptor, imageBlob) {
        // Call appropriate global handler based on mode
        if (this.currentMode === 'register' && typeof handleRegistrationCapture === 'function') {
            await handleRegistrationCapture(descriptor, imageBlob);
        } else if (this.currentMode === 'update' && typeof handleFaceUpdateCapture === 'function') {
            await handleFaceUpdateCapture(descriptor, imageBlob);
        } else if ((this.currentMode === 'verify' || this.currentMode === 'attendance') && typeof handleAttendanceOperation === 'function') {
            await handleAttendanceOperation(descriptor, imageBlob);
        } else {
            console.warn('No handler found for mode:', this.currentMode);
        }
    }

    // ============================================
    // 🧹 RESET & CLEANUP
    // ============================================

    resetDetectionState() {
        this.faceHistory = [];
        this.stabilityScore = 0;
        this.cancelCaptureTimer();
        this.liveness.completed = false;
        window.currentFaceDetected = false;
    }
}

// ============================================
// 🌍 GLOBAL COMPATIBILITY FUNCTIONS
// ============================================

let faceRecognition;

document.addEventListener('DOMContentLoaded', () => {
    faceRecognition = new FaceRecognitionManager();
    window.faceRecognition = faceRecognition;

    if (AppConfig?.features?.biometricAuth !== false) {
        faceRecognition.init();
    }
});

// Maintain existing global function signatures
window.openCamera = async () => faceRecognition?.openCamera();
window.closeCamera = () => faceRecognition?.closeCamera();
window.manualFaceCapture = async () => faceRecognition?.performCapture();
window.setCamStatus = (html) => faceRecognition?.setStatusText(html);
window.switchFaceCamera = async () => {
    if (AppConfig) {
        AppConfig.faceRecognition.camera.facingMode =
            AppConfig.faceRecognition.camera.facingMode === 'user' ? 'environment' : 'user';
        await faceRecognition?.openCamera();
    }
};
window.resetLiveness = () => { if (faceRecognition) faceRecognition.liveness.completed = false; };
window.updateLiveness = () => true; // Human handles this internally
window.getHeadYaw = () => 0;
window.updateStabilityRing = () => {};
window.showMatchResult = (success) => faceRecognition?.showMatchResult(success);

// Utility functions
window.bufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
};
window.base64ToBuffer = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceRecognitionManager;
}
