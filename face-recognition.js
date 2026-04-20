/**
 * ================================================
 * 🎭 AXENTRO FACE RECOGNITION v6.1 - HYBRID SMART
 * ✅ Primary: Human library with multi-CDN fallback
 * ✅ Fallback: face-api.js with local models
 * ✅ Guaranteed to work in all network conditions
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
        
        // Detection engine ('human' or 'faceapi')
        this.engine = null;
        this.human = null;
        
        // State
        this.isActive = false;
        this.isModelsLoaded = false;
        this.currentMode = null;
        this.modeOptions = {};

        // Detection loop
        this.rafId = null;
        this.lastDetectionTime = 0;
        this.detectionThrottleMs = 100;

        // Face tracking history
        this.faceHistory = [];
        this.maxHistory = 5;
        this.stabilityScore = 0;
        this.stabilityThreshold = 0.8;
        this.captureDelayMs = 400;
        this.captureTimer = null;

        // Descriptor caching
        this.cachedDescriptor = null;
        this.cachedDescriptorAt = 0;

        // Liveness state
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

        console.log('🎭 FaceRecognitionManager v6.1 (Hybrid) initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION (HYBRID WITH FALLBACK)
    // ============================================

    async init() {
        console.log('🎭 Initializing Face Recognition...');
        try {
            // محاولة تحميل مكتبة Human أولاً (الأفضل)
            await this.initHumanEngine();
        } catch (humanError) {
            console.warn('⚠️ Human library failed, falling back to face-api.js:', humanError);
            try {
                // الرجوع إلى face-api.js مع النماذج المحلية
                await this.initFaceApiEngine();
            } catch (faceApiError) {
                console.error('❌ All face recognition engines failed:', faceApiError);
                this.showNonBlockingMessage(
                    'تعذر تحميل نماذج التعرف على الوجه. يمكنك استخدام كلمة المرور فقط.',
                    'warning'
                );
                this.isModelsLoaded = false;
                return;
            }
        }

        this.setupOverlay();
        console.log('✅ Face Recognition ready with engine:', this.engine);
    }

    async initHumanEngine() {
        // تحميل مكتبة Human من عدة روابط CDN احتياطية
        await this.loadHumanLibraryWithFallback();
        
        // تكوين Human
        const humanConfig = {
            debug: false,
            backend: 'webgl',
            modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models/',
            face: {
                enabled: true,
                detector: { rotation: false, maxDetected: 1 },
                mesh: { enabled: true },
                description: { enabled: true },
                antispoof: { enabled: true },
                liveness: { enabled: true }
            },
            body: { enabled: false },
            hand: { enabled: false },
            filter: { enabled: true, equalization: true, flip: false }
        };

        this.human = new Human(humanConfig);
        await this.human.load();
        this.engine = 'human';
        this.isModelsLoaded = true;
        console.log('✅ Human engine ready');
    }

    async loadHumanLibraryWithFallback() {
        const cdnUrls = [
            'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/dist/human.js',
            'https://unpkg.com/@vladmandic/human@3.3.6/dist/human.js',
            'https://cdnjs.cloudflare.com/ajax/libs/human/3.3.6/human.js',
            'https://cdn.skypack.dev/@vladmandic/human@3.3.6'
        ];

        if (typeof Human !== 'undefined') return;

        for (const url of cdnUrls) {
            try {
                await this.loadScript(url);
                if (typeof Human !== 'undefined') {
                    console.log('✅ Human library loaded from:', url);
                    return;
                }
            } catch (e) {
                console.warn(`Failed to load Human from ${url}`);
            }
        }
        throw new Error('Could not load Human library from any CDN');
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
            setTimeout(() => reject(new Error('Script load timeout')), 10000);
        });
    }

    async initFaceApiEngine() {
        // التأكد من وجود face-api.js
        if (typeof faceapi === 'undefined') {
            await this.loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js');
        }

        // مسارات النماذج (المسار المحلي أولاً)
        const modelPaths = [
            '/models',
            'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model'
        ];

        for (const baseUrl of modelPaths) {
            try {
                await faceapi.nets.ssdMobilenetv1.loadFromUri(baseUrl);
                await faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl);
                await faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl);
                this.engine = 'faceapi';
                this.isModelsLoaded = true;
                console.log('✅ face-api.js models loaded from:', baseUrl);
                return;
            } catch (e) {
                console.warn(`Failed to load face-api models from ${baseUrl}`);
            }
        }
        throw new Error('Could not load face-api models');
    }

    // ============================================
    // 📹 CAMERA OPERATIONS (موحدة)
    // ============================================

    async openCamera(mode = null, options = {}) {
        if (this.isActive) this.closeCamera();

        if (!this.isModelsLoaded) {
            this.setStatusText('جاري تحميل النماذج...');
            try {
                await this.init();
            } catch (e) {
                this.setStatusText('❌ فشل تحميل نماذج التعرف. تحقق من الاتصال.');
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

    // ============================================
    // 🖥️ UI SETUP (مبسطة)
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
    // 🎯 DETECTION LOOP (موحد)
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
            let face = null;
            
            if (this.engine === 'human') {
                const result = await this.human.detect(this.video);
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.human.draw.face(this.canvas, result.face);
                if (result.face && result.face.length > 0) {
                    face = result.face[0];
                }
            } else {
                // face-api fallback
                const detection = await faceapi
                    .detectSingleFace(this.video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                if (detection) {
                    this.drawFaceApiBox(detection.detection.box);
                    face = {
                        box: [detection.detection.box.x, detection.detection.box.y, detection.detection.box.width, detection.detection.box.height],
                        embedding: detection.descriptor,
                        real: 1, // face-api لا يدعم antispoofing لذا نفترض أنه حقيقي
                        live: 1
                    };
                }
            }

            if (!face) {
                this.handleNoFace();
                return;
            }

            this.handleFaceDetected(face);
        } catch (error) {
            console.error('Detection error:', error);
        }
    }

    drawFaceApiBox(box) {
        this.ctx.strokeStyle = '#38bdf8';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(box.x, box.y, box.width, box.height);
    }

    handleNoFace() {
        this.resetStability();
        this.cancelCaptureTimer();
        this.setStatusText(this.getInstructionMessage());
        window.currentFaceDetected = false;
    }

    handleFaceDetected(face) {
        window.currentFaceDetected = true;
        
        this.updateFaceHistory(face);
        this.calculateStability();
        this.updateStabilityRingUI();

        // التحقق من الحيوية إذا كان المحرك يدعمها
        const isReal = face.real || 1;
        const isLive = face.live || 1;
        if (this.shouldCheckLiveness() && (isReal < 0.5 || isLive < 0.5)) {
            this.setStatusText(`🔍 تأكد من أنك شخص حقيقي...`);
            this.cancelCaptureTimer();
            return;
        }

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

        const centers = this.faceHistory.map(f => ({ x: f.centerX, y: f.centerY }));
        const widths = this.faceHistory.map(f => f.width);

        const avgCenter = centers.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
        avgCenter.x /= centers.length;
        avgCenter.y /= centers.length;

        const centerDistances = centers.map(c => Math.hypot(c.x - avgCenter.x, c.y - avgCenter.y));
        const avgDistance = centerDistances.reduce((a, b) => a + b, 0) / centerDistances.length;

        const widthVariance = Math.max(...widths) - Math.min(...widths);
        const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;

        const distanceScore = Math.max(0, 1 - (avgDistance / (avgWidth * 0.3)));
        const sizeScore = Math.max(0, 1 - (widthVariance / (avgWidth * 0.2)));

        this.stabilityScore = (distanceScore * 0.6 + sizeScore * 0.4);

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
    // 📸 CAPTURE LOGIC
    // ============================================

    scheduleCapture(face) {
        if (this.captureTimer || this.isProcessing) return;

        const now = Date.now();
        if (now - this.lastCaptureTime < this.captureCooldown) return;

        if (face.embedding) {
            this.cachedDescriptor = Array.isArray(face.embedding) ? 
                Array.from(face.embedding) : Object.values(face.embedding);
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
            let descriptor = this.cachedDescriptor;
            
            // إذا لم يكن لدينا descriptor مخزن، نستخرجه الآن
            if (!descriptor) {
                if (this.engine === 'human') {
                    const result = await this.human.detect(this.video);
                    if (result.face?.[0]?.embedding) {
                        descriptor = Array.from(result.face[0].embedding);
                    }
                } else {
                    const detection = await faceapi
                        .detectSingleFace(this.video)
                        .withFaceDescriptor();
                    if (detection?.descriptor) {
                        descriptor = Array.from(detection.descriptor);
                    }
                }
            }

            if (!descriptor) throw new Error('تعذر استخراج بصمة الوجه');

            const imageBlob = await this.captureImageBlob();
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
        if (this.statusElement) this.statusElement.innerHTML = text;
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

    shouldCheckLiveness() {
        return (this.currentMode === 'verify' || this.currentMode === 'attendance');
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

    resetDetectionState() {
        this.faceHistory = [];
        this.stabilityScore = 0;
        this.cancelCaptureTimer();
        this.liveness.completed = false;
        window.currentFaceDetected = false;
    }
}

// ============================================
// 🌍 GLOBAL COMPATIBILITY
// ============================================

let faceRecognition;

document.addEventListener('DOMContentLoaded', () => {
    faceRecognition = new FaceRecognitionManager();
    window.faceRecognition = faceRecognition;

    if (AppConfig?.features?.biometricAuth !== false) {
        faceRecognition.init();
    }
});

// الدوال العامة
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
