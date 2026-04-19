/**
 * ============================================
 * 📷 AXENTRO FACE RECOGNITION v4.3 - ENHANCED
 * ✅ Faster Auto Capture + Better UX Feedback
 * 🔥 Auto-capture, Success/Fail Indicators, Anti-Spoof
 * ============================================
 */

class FaceRecognitionManager {
    constructor() {
        this.modelsLoaded = false;
        this.isCameraActive = false;
        this.currentStream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.detectionInterval = null;

        this.lastAutoCaptureAt = 0;
        this.cachedDescriptor = null;
        this.cachedDescriptorAt = 0;
        this.lastDetectionAt = 0;
        this.captureCooldownMs = 1200;
        this.extractTimeoutMs = 9000;

        // Mode flags
        window.regMode = false;
        window.attMode = false;
        window.updateFaceMode = false;
        window.adminVerifyMode = false;
        window.firstTimeSetupMode = false;
        window.adminResetFaceMode = false;
        window.attType = '';
        window.targetEmpForAdmin = null;
        window.isProcessingCapture = false;

        // Liveness detection
        window.livenessActive = false;
        window.livenessStartYaw = null;
        window.livenessStartNoseY = null;
        window.livenessMoved = false;
        window.livenessCounter = { blink: 0, turn: false, nod: false };
        window.livenessBlinkClosed = false;
        window.stabilityCounter = 0;
        window.currentFaceDetected = false;

        console.log('🎭 Face Recognition Manager initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    async init() {
        console.log('🎭 Initializing Face Recognition System...');

        try {
            this.setupCameraElements();
            await this.loadModelsWithSafetyNet();
            console.log('✅ Face Recognition System Ready');
        } catch (error) {
            console.error('❌ Face Recognition Init Error:', error);

            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('التعرف على الوجه غير متوفر - يمكنك استخدام الكود وكلمة المرور');
            }
        }
    }

    setupCameraElements() {
        this.videoElement =
            document.getElementById('video') ||
            document.getElementById('dashboardVideo') ||
            document.getElementById('registerVideo');

        this.canvasElement =
            document.getElementById('canvas') ||
            document.getElementById('dashboardCanvas') ||
            document.getElementById('registerCanvas');

        this.ensureOverlayElements();

        console.log('📹 Camera elements set up');
    }

    ensureOverlayElements() {
        if (document.getElementById('cameraOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'cameraOverlay';
        overlay.style.cssText = `
            position:fixed;
            inset:0;
            background:rgba(2,6,23,.88);
            display:none;
            align-items:center;
            justify-content:center;
            z-index:9999;
            padding:16px;
        `;

        overlay.innerHTML = `
            <div id="cameraCard" style="
                width:min(720px,96vw);
                background:#0f172a;
                border:1px solid rgba(148,163,184,.2);
                border-radius:20px;
                padding:16px;
                color:#fff;
                box-shadow:0 20px 60px rgba(0,0,0,.45);
                transition:transform .18s ease, box-shadow .18s ease;
            ">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;">
                    <strong>التحقق ببصمة الوجه</strong>
                    <div style="display:flex;gap:8px;">
                        <button type="button" onclick="closeCamera()" style="
                            background:#ef4444;
                            color:#fff;
                            border:none;
                            border-radius:10px;
                            padding:8px 12px;
                            cursor:pointer
                        ">إغلاق</button>
                    </div>
                </div>

                <div id="cameraViewport" style="
                    position:relative;
                    aspect-ratio:4/3;
                    background:#020617;
                    border-radius:16px;
                    overflow:hidden;
                ">
                    <video id="video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
                    <canvas id="canvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>

                    <div id="scanLine" style="
                        position:absolute;
                        left:10%;
                        right:10%;
                        top:12%;
                        height:3px;
                        background:linear-gradient(90deg,transparent,#38bdf8,transparent);
                        box-shadow:0 0 18px #38bdf8;
                        animation:scanline 2s linear infinite;
                    "></div>

                    <div id="matchResult" style="
                        position:absolute;
                        top:12px;
                        left:12px;
                        width:56px;
                        height:56px;
                        border-radius:50%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:rgba(15,23,42,.4);
                        border:2px solid rgba(255,255,255,.08);
                        opacity:0;
                        transform:scale(.85);
                        transition:all .2s ease;
                        box-shadow:0 12px 30px rgba(0,0,0,.25);
                        backdrop-filter:blur(4px);
                        z-index:4;
                    ">
                        <span id="matchResultIcon" style="font-size:24px;font-weight:700;color:#fff;"></span>
                    </div>

                    <div id="stabilityRing" style="
                        position:absolute;
                        bottom:12px;
                        left:12px;
                        display:none;
                        align-items:center;
                        gap:10px;
                        background:rgba(15,23,42,.75);
                        padding:8px 10px;
                        border-radius:12px;
                    ">
                        <svg width="48" height="48" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,.15)" stroke-width="4" fill="none"></circle>
                            <circle id="stabilityCircle" cx="24" cy="24" r="20" stroke="#10b981" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="126" stroke-dashoffset="126"></circle>
                        </svg>
                        <strong id="stabilityText">0</strong>
                    </div>
                </div>

                <div id="camStatus" style="margin-top:12px;text-align:center;color:#cbd5e1">جاهز</div>
            </div>
        `;

        document.body.appendChild(overlay);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes scanline {
                0% { transform:translateY(0) }
                50% { transform:translateY(240px) }
                100% { transform:translateY(0) }
            }

            @keyframes cameraShake {
                0% { transform:translateX(0) }
                20% { transform:translateX(-4px) }
                40% { transform:translateX(4px) }
                60% { transform:translateX(-3px) }
                80% { transform:translateX(3px) }
                100% { transform:translateX(0) }
            }

            .camera-shake {
                animation: cameraShake .28s ease;
            }

            .match-success {
                opacity:1 !important;
                transform:scale(1) !important;
                background:rgba(16,185,129,.95) !important;
                border-color:rgba(255,255,255,.24) !important;
                box-shadow:0 0 0 5px rgba(16,185,129,.18), 0 16px 32px rgba(0,0,0,.28) !important;
            }

            .match-fail {
                opacity:1 !important;
                transform:scale(1) !important;
                background:rgba(239,68,68,.96) !important;
                border-color:rgba(255,255,255,.22) !important;
                box-shadow:0 0 0 5px rgba(239,68,68,.18), 0 16px 32px rgba(0,0,0,.28) !important;
            }
        `;
        document.head.appendChild(style);

        this.videoElement = document.getElementById('video') || this.videoElement;
        this.canvasElement = document.getElementById('canvas') || this.canvasElement;
    }

    // ============================================
    // 📚 MODEL LOADING
    // ============================================

    async loadModels() {
        if (this.modelsLoaded) {
            console.log('✅ Models already loaded');
            return true;
        }

        const MODELS_URL =
            AppConfig?.faceRecognition?.models?.baseUrl ||
            AppConfig?.faceRecognition?.models?.fallbackUrl ||
            'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';

        try {
            setStatus('جاري تحميل الذكاء الاصطناعي (1/4)...');
            updateSplashProgress?.(25);
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
            } catch (e) {
                await faceapi.nets.tinyFaceDetector.loadFromUri(AppConfig?.faceRecognition?.models?.fallbackUrl);
            }
            window.lightModels = true;

            setStatus('جاري تحميل الذكاء الاصطناعي (2/4)...');
            updateSplashProgress?.(50);
            try {
                await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL);
            } catch (e) {
                await faceapi.nets.faceLandmark68TinyNet.loadFromUri(AppConfig?.faceRecognition?.models?.fallbackUrl);
            }

            setStatus('جاري تحميل الذكاء الاصطناعي (3/4)...');
            updateSplashProgress?.(75);
            try {
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
            } catch (e) {
                await faceapi.nets.faceLandmark68Net.loadFromUri(AppConfig?.faceRecognition?.models?.fallbackUrl);
            }

            setStatus('جاري تحميل الذكاء الاصطناعي (4/4)...');
            updateSplashProgress?.(100);
            try {
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
            } catch (e) {
                await faceapi.nets.faceRecognitionNet.loadFromUri(AppConfig?.faceRecognition?.models?.fallbackUrl);
            }
            window.heavyModels = true;

            this.modelsLoaded = true;

            setTimeout(() => updateSplashProgress?.(0), 600);
            setStatus('النظام جاهز');

            return true;
        } catch (error) {
            console.error('❌ Model loading error:', error);
            throw error;
        }
    }

    async loadModelsWithSafetyNet() {
        try {
            const timeoutMs = AppConfig?.faceRecognition?.timeout?.modelLoad || 15000;
            const loadPromise = this.loadModels();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('تجاوز وقت تحميل النماذج')), timeoutMs)
            );

            return await Promise.race([loadPromise, timeoutPromise]);
        } catch (error) {
            console.error('❌ Models failed to load:', error.message);
            this.modelsLoaded = false;
            return false;
        }
    }

    areModelsLoaded() {
        return this.modelsLoaded;
    }

    // ============================================
    // 📹 CAMERA OPERATIONS
    // ============================================

    async openCamera() {
        try {
            this.stopCamera();

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('الكاميرا غير مدعومة في هذا المتصفح');
            }

            const overlay = document.getElementById('cameraOverlay');
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.classList.add('active');
            }

            setCamStatus?.('<i class="fas fa-video"></i> جاري تشغيل الكاميرا...');

            const facingMode = AppConfig?.faceRecognition?.camera?.facingMode || 'user';

            const preferredConstraints = {
                video: {
                    facingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 24, max: 30 }
                },
                audio: false
            };

            const fallbackConstraints = {
                video: {
                    facingMode,
                    width: { ideal: 480 },
                    height: { ideal: 360 }
                },
                audio: false
            };

            try {
                window.currentStream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
            } catch (_e) {
                window.currentStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            }

            const video = this.videoElement || document.getElementById('video');
            if (!video) throw new Error('Video element not found');

            video.srcObject = window.currentStream;
            video.setAttribute('playsinline', 'true');
            video.muted = true;

            await new Promise((resolve) => {
                let done = false;
                const finish = () => {
                    if (!done) {
                        done = true;
                        resolve();
                    }
                };
                video.onloadedmetadata = finish;
                video.oncanplay = finish;
                setTimeout(finish, 700);
            });

            try {
                await video.play();
            } catch (_e) {}

            const scanLine = document.getElementById('scanLine');
            if (scanLine) scanLine.classList.add('active');

            const canvas = this.canvasElement || document.getElementById('canvas');
            if (canvas && video) {
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
            }

            this.clearMatchResult();
            window.lastCamStatusText = '';
            window.currentFaceDetected = false;
            window.stabilityCounter = 0;
            window.isProcessingCapture = false;
            window.autoCaptureTimeout = null;

            updateStabilityRing?.(0, 2);

            if (window.attMode || window.adminVerifyMode || window.adminResetFaceMode) {
                resetLiveness?.();
            }

            setCamStatus?.(
                window.lightModels && window.heavyModels
                    ? '<i class="fas fa-spinner fa-spin"></i> ضع الوجه داخل الإطار وسيتم الالتقاط تلقائياً...'
                    : '<i class="fas fa-cog fa-spin"></i> جاري تحميل نماذج الذكاء الاصطناعي...'
            );

            this.isCameraActive = true;
            this.startDetectionLoop();
            return true;
        } catch (e) {
            console.error('❌ Camera error:', e);
            this.flashFailure('فشل الوصول للكاميرا');
            showToast?.('فشل الوصول للكاميرا', 'error');
            return false;
        }
    }

    closeCamera() {
        if (window.currentStream) {
            window.currentStream.getTracks().forEach((track) => track.stop());
            window.currentStream = null;
        }

        const video = this.videoElement || document.getElementById('video');
        if (video) video.srcObject = null;

        const overlay = document.getElementById('cameraOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        }

        const scanLine = document.getElementById('scanLine');
        if (scanLine) scanLine.classList.remove('active');

        const stabilityRing = document.getElementById('stabilityRing');
        if (stabilityRing) {
            stabilityRing.classList.remove('active');
            stabilityRing.style.display = 'none';
        }

        this.clearMatchResult();

        window.regMode = false;
        window.attMode = false;
        window.updateFaceMode = false;
        window.adminVerifyMode = false;
        window.firstTimeSetupMode = false;
        window.adminResetFaceMode = false;
        window.attType = '';
        window.targetEmpForAdmin = null;
        window.isProcessingCapture = false;

        if (window.autoCaptureTimeout) {
            clearTimeout(window.autoCaptureTimeout);
            window.autoCaptureTimeout = null;
        }
        if (window.detectionLoopTimeout) {
            clearTimeout(window.detectionLoopTimeout);
            window.detectionLoopTimeout = null;
        }

        window.stabilityCounter = 0;
        window.livenessActive = false;
        this.isCameraActive = false;
    }

    stopCamera() {
        this.closeCamera();
    }

    isCameraRunning() {
        return this.isCameraActive;
    }

    // ============================================
    // 🔍 DETECTION LOOP
    // ============================================

    startDetectionLoop() {
        if (window.detectionLoopTimeout) {
            clearTimeout(window.detectionLoopTimeout);
        }

        const detect = async () => {
            const video = this.videoElement || document.getElementById('video');
            const overlay = document.getElementById('cameraOverlay');

            if (!video?.srcObject || !overlay?.classList.contains('active')) {
                return;
            }

            if (!window.isProcessingCapture) {
                await this.drawFaceBox();
            }

            window.detectionLoopTimeout = setTimeout(detect, 140);
        };

        detect();
    }

    async drawFaceBox() {
        const video = this.videoElement || document.getElementById('video');
        const canvas = this.canvasElement || document.getElementById('canvas');

        if (!video?.srcObject || !video.videoWidth || !canvas) return;
        if (!window.lightModels) {
            setCamStatus?.('<i class="fas fa-cog fa-spin"></i> جاري تحميل النماذج...');
            return;
        }

        try {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const detection = await faceapi
                .detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: AppConfig?.faceRecognition?.detection?.inputSize || 320,
                        scoreThreshold: AppConfig?.faceRecognition?.detection?.scoreThreshold || 0.08
                    })
                )
                .withFaceLandmarks(true);

            if (!detection) {
                window.currentFaceDetected = false;
                window.stabilityCounter = 0;
                updateStabilityRing?.(0, 2);
                setCamStatus?.('<i class="fas fa-spinner fa-spin"></i> وجّه الكاميرا إلى وجهك الأمامي داخل الإطار...');
                return;
            }

            window.currentFaceDetected = true;
            const box = detection.detection.box;
            this.drawGuides(ctx, box);
            this.handleDetectionModes(detection);
        } catch (e) {
            console.error('Face detection error:', e);
        }
    }

    drawGuides(ctx, box) {
        if (!ctx || !box) return;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        const cLen = 25;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + cLen);
        ctx.lineTo(box.x, box.y);
        ctx.lineTo(box.x + cLen, box.y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(box.x + box.width - cLen, box.y);
        ctx.lineTo(box.x + box.width, box.y);
        ctx.lineTo(box.x + box.width, box.y + cLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(box.x, box.y + box.height - cLen);
        ctx.lineTo(box.x, box.y + box.height);
        ctx.lineTo(box.x + cLen, box.y + box.height);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(box.x + box.width - cLen, box.y + box.height);
        ctx.lineTo(box.x + box.width, box.y + box.height);
        ctx.lineTo(box.x + box.width, box.y + box.height - cLen);
        ctx.stroke();
    }

    isFaceWellPositioned(box, video) {
        if (!box || !video?.videoWidth || !video?.videoHeight) return false;

        const faceWidthRatio = box.width / video.videoWidth;
        const faceHeightRatio = box.height / video.videoHeight;

        const centerX = box.x + (box.width / 2);
        const centerY = box.y + (box.height / 2);

        const xOffset = Math.abs(centerX - (video.videoWidth / 2)) / video.videoWidth;
        const yOffset = Math.abs(centerY - (video.videoHeight / 2)) / video.videoHeight;

        return (
            faceWidthRatio >= 0.16 &&
            faceHeightRatio >= 0.18 &&
            xOffset <= 0.24 &&
            yOffset <= 0.26
        );
    }

    handleDetectionModes(detection) {
        const video = this.videoElement || document.getElementById('video');
        const box = detection?.detection?.box;
        const enrollmentMode = !!(
            window.regMode ||
            window.updateFaceMode ||
            window.firstTimeSetupMode ||
            window.adminResetFaceMode
        );
        const verificationMode = !!(window.attMode || window.adminVerifyMode);

        const stableFramesRequired = enrollmentMode ? 2 : 2;
        const faceReady = this.isFaceWellPositioned(box, video);

        if (!faceReady) {
            window.stabilityCounter = 0;
            updateStabilityRing?.(0, stableFramesRequired);
            setCamStatus?.('<i class="fas fa-face-smile"></i> قرّب وجهك داخل الإطار وثبّته لثانية واحدة...');
            return;
        }

        if (enrollmentMode) {
            if (!window.heavyModels) {
                setCamStatus?.('<i class="fas fa-cog fa-spin"></i> تحميل نموذج التعرف...');
                return;
            }

            window.stabilityCounter++;
            updateStabilityRing?.(window.stabilityCounter, stableFramesRequired);

            if (window.stabilityCounter >= stableFramesRequired) {
                setCamStatus?.('<i class="fas fa-camera"></i> تم اكتشاف الوجه - جاري الالتقاط التلقائي...');
                const now = Date.now();

                if (
                    !window.isProcessingCapture &&
                    (!this.lastAutoCaptureAt || (now - this.lastAutoCaptureAt) > this.captureCooldownMs)
                ) {
                    this.lastAutoCaptureAt = now;
                    window.autoCaptureTimeout = setTimeout(() => this.performCapture(), 80);
                }
            } else {
                setCamStatus?.('<i class="fas fa-spinner fa-pulse"></i> ثبت وجهك...');
            }
            return;
        }

        if (verificationMode) {
            if (!window.heavyModels) {
                setCamStatus?.('<i class="fas fa-cog fa-spin"></i> تحميل نموذج التعرف...');
                return;
            }

            const livenessOk = updateLiveness?.(getHeadYaw?.(detection.landmarks), detection.landmarks);
            if (livenessOk === false) {
                if (window.autoCaptureTimeout) clearTimeout(window.autoCaptureTimeout);
                window.stabilityCounter = 0;
                updateStabilityRing?.(0, stableFramesRequired);
                return;
            }

            window.stabilityCounter++;
            updateStabilityRing?.(window.stabilityCounter, stableFramesRequired);

            if (window.stabilityCounter >= stableFramesRequired) {
                setCamStatus?.('<i class="fas fa-check-circle" style="color:#10b981;"></i> تم التحقق - جاري الالتقاط...');
                const now = Date.now();

                if (
                    !window.isProcessingCapture &&
                    (!this.lastAutoCaptureAt || (now - this.lastAutoCaptureAt) > this.captureCooldownMs)
                ) {
                    this.lastAutoCaptureAt = now;
                    window.autoCaptureTimeout = setTimeout(() => this.performCapture(), 80);
                }
            } else {
                setCamStatus?.('<i class="fas fa-spinner fa-pulse"></i> ثبت وجهك...');
            }
        }
    }

    // ============================================
    // 🎯 CAPTURE OPERATIONS
    // ============================================

    async performCapture() {
        if (window.isProcessingCapture) return;

        window.isProcessingCapture = true;
        window.autoCaptureTimeout = null;

        if (window.detectionLoopTimeout) {
            clearTimeout(window.detectionLoopTimeout);
            window.detectionLoopTimeout = null;
        }

        const scanLine = document.getElementById('scanLine');
        if (scanLine) scanLine.classList.remove('active');

        setCamStatus?.('<i class="fas fa-brain"></i> جاري استخراج بصمة الوجه...');

        let newDescriptor = null;

        try {
            newDescriptor = await Promise.race([
                this.extractStableDescriptor(),
                new Promise((resolve) => setTimeout(() => resolve(null), this.extractTimeoutMs))
            ]);
        } catch (_e) {}

        if (!newDescriptor) {
            this.flashFailure('تعذر استخراج بصمة الوجه، ثبّت وجهك وجرّب ثانية.');
            window.isProcessingCapture = false;
            window.stabilityCounter = 0;
            updateStabilityRing?.(0, 2);

            if (scanLine) scanLine.classList.add('active');
            this.startDetectionLoop();
            return;
        }

        try {
            if (window.regMode) {
                await this.handleRegistration(newDescriptor);
                this.flashSuccess('تم تسجيل البصمة بنجاح');
            } else if (window.firstTimeSetupMode) {
                await this.handleFirstTimeSetup(newDescriptor);
                this.flashSuccess('تم تسجيل البصمة بنجاح');
            } else if (window.updateFaceMode || window.adminResetFaceMode) {
                await this.handleFaceUpdate(newDescriptor);
                this.flashSuccess('تم تحديث البصمة بنجاح');
            } else if (window.adminVerifyMode) {
                await this.handleAdminVerification(newDescriptor);
                this.flashSuccess('تم التحقق بنجاح');
            } else if (window.attMode) {
                await this.handleAttendanceCapture(newDescriptor);
                this.flashSuccess('تم التحقق بنجاح');
            }
        } catch (error) {
            console.error('Capture handler error:', error);
            this.flashFailure(error?.message || 'فشل الإجراء ببصمة الوجه');
            throw error;
        } finally {
            window.isProcessingCapture = false;
        }
    }

    // ============================================
    // 🧬 STABLE DESCRIPTOR EXTRACTION
    // ============================================

    async extractStableDescriptor() {
        const video = this.videoElement || document.getElementById('video');
        if (!video) return null;

        if (this.cachedDescriptor && (Date.now() - this.cachedDescriptorAt < 5000)) {
            return this.cachedDescriptor;
        }

        const descriptors = [];
        const attempts = 4;

        for (let i = 0; i < attempts; i++) {
            try {
                const det = await Promise.race([
                    faceapi
                        .detectSingleFace(
                            video,
                            new faceapi.TinyFaceDetectorOptions({
                                inputSize: 320,
                                scoreThreshold: 0.06
                            })
                        )
                        .withFaceLandmarks()
                        .withFaceDescriptor(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('descriptor-timeout')), 2200))
                ]);

                if (det?.descriptor) {
                    const arr = Array.from(det.descriptor);
                    descriptors.push(arr);
                    this.cachedDescriptor = arr;
                    this.cachedDescriptorAt = Date.now();

                    if (descriptors.length >= 2) break;
                }
            } catch (_e) {}

            await new Promise((resolve) => setTimeout(resolve, 120));
        }

        if (!descriptors.length) return null;
        if (descriptors.length === 1) return descriptors[0];

        const avg = new Array(descriptors[0].length).fill(0);
        for (const s of descriptors) {
            for (let j = 0; j < s.length; j++) {
                avg[j] += s[j] / descriptors.length;
            }
        }

        this.cachedDescriptor = avg;
        this.cachedDescriptorAt = Date.now();
        return avg;
    }

    // ============================================
    // 🎭 LIVENESS DETECTION
    // ============================================

    getHeadYaw(landmarks) {
        try {
            const nose = landmarks.getNose()[3];
            const leftEye = landmarks.getLeftEye()[0];
            const rightEye = landmarks.getRightEye()[3];

            return nose.x - ((leftEye.x + rightEye.x) / 2);
        } catch (e) {
            return 0;
        }
    }

    resetLiveness() {
        window.livenessActive = true;
        window.livenessStartYaw = null;
        window.livenessStartNoseY = null;
        window.livenessMoved = false;
        window.livenessCounter = { blink: 0, turn: false, nod: false };
        window.livenessBlinkClosed = false;
        window.stabilityCounter = 0;
    }

    updateLiveness(yaw, landmarks = null) {
        if (!window.livenessActive) return true;

        const anti = AppConfig?.faceRecognition?.antiSpoof || {};

        if (window.livenessStartYaw === null) {
            window.livenessStartYaw = yaw;
            const nose = landmarks?.getNose?.()?.[3];
            window.livenessStartNoseY = nose ? nose.y : null;
            setCamStatus?.('<i class="fas fa-eye"></i> ارمش ثم حرك رأسك يمين/يسار ثم ارفع أو اخفض رأسك قليلاً');
            return false;
        }

        if (landmarks) {
            const leftEAR = this.getEyeAspectRatio(landmarks.getLeftEye?.() || []);
            const rightEAR = this.getEyeAspectRatio(landmarks.getRightEye?.() || []);
            const ear = (leftEAR + rightEAR) / 2;

            if (ear && ear < (anti.earBlinkThreshold || 0.19) && !window.livenessBlinkClosed) {
                window.livenessBlinkClosed = true;
            } else if (ear && ear >= (anti.earBlinkThreshold || 0.19) && window.livenessBlinkClosed) {
                window.livenessCounter.blink += 1;
                window.livenessBlinkClosed = false;
            }

            if (Math.abs(yaw - window.livenessStartYaw) > (anti.yawMovementPx || 12)) {
                window.livenessCounter.turn = true;
            }

            const nose = landmarks.getNose?.()?.[3];
            if (nose && window.livenessStartNoseY !== null && Math.abs(nose.y - window.livenessStartNoseY) > (anti.pitchMovementPx || 10)) {
                window.livenessCounter.nod = true;
            }
        }

        const blinkOk = !anti.requireBlink || window.livenessCounter.blink >= (anti.minBlinks || 1);
        const turnOk = !anti.requireTurnLeftRight || !!window.livenessCounter.turn;
        const nodOk = !anti.requireNod || !!window.livenessCounter.nod;

        if (blinkOk && turnOk && nodOk) {
            window.livenessMoved = true;
            window.livenessActive = false;
            setCamStatus?.('<i class="fas fa-check-circle"></i> تم التحقق من الحيوية، ثبت وجهك...');
            return true;
        }

        return false;
    }

    getEyeAspectRatio(points) {
        try {
            if (!points || points.length < 6) return 0;

            const dist = (a, b) => Math.hypot((a.x - b.x), (a.y - b.y));
            const A = dist(points[1], points[5]);
            const B = dist(points[2], points[4]);
            const C = dist(points[0], points[3]);

            if (!C) return 0;
            return (A + B) / (2.0 * C);
        } catch (e) {
            return 0;
        }
    }

    // ============================================
    // 📊 STABILITY RING
    // ============================================

    updateStabilityRing(current, max) {
        const circle = document.getElementById('stabilityCircle');
        const text = document.getElementById('stabilityText');
        const ring = document.getElementById('stabilityRing');

        if (!circle || !text || !ring) return;

        const circumference = 2 * Math.PI * (AppConfig?.liveness?.stabilityRing?.radius || 20);
        const offset = circumference - (current / max) * circumference;

        circle.style.strokeDashoffset = offset;
        text.textContent = current;

        if (current > 0) {
            ring.classList.add('active');
            ring.style.display = 'flex';
        } else {
            ring.classList.remove('active');
            ring.style.display = 'none';
        }
    }

    showMatchResult(success) {
        const el = document.getElementById('matchResult');
        const icon = document.getElementById('matchResultIcon');
        if (!el || !icon) return;

        el.classList.remove('match-success', 'match-fail', 'camera-shake');

        if (success) {
            icon.innerHTML = '✓';
            el.classList.add('match-success');
        } else {
            icon.innerHTML = '✕';
            el.classList.add('match-fail', 'camera-shake');
        }

        setTimeout(() => {
            this.clearMatchResult();
        }, 1400);
    }

    clearMatchResult() {
        const el = document.getElementById('matchResult');
        const icon = document.getElementById('matchResultIcon');
        if (!el || !icon) return;

        el.classList.remove('match-success', 'match-fail', 'camera-shake');
        el.style.opacity = '0';
        el.style.transform = 'scale(.85)';
        icon.innerHTML = '';
    }

    flashSuccess(message = 'تم التحقق بنجاح') {
        this.showMatchResult(true);
        playSound?.('faceid-success');
        setCamStatus?.(`<i class="fas fa-check-circle" style="color:#10b981;"></i> ${message}`);
    }

    flashFailure(message = 'فشل التحقق') {
        this.showMatchResult(false);
        playSound?.('faceid-error');
        setCamStatus?.(`<i class="fas fa-times-circle" style="color:#ef4444;"></i> ${message}`);
    }

    // ============================================
    // 🖼️ IMAGE PROCESSING
    // ============================================

    createStorageImageBlob() {
        const video = this.videoElement || document.getElementById('video');
        if (!video) return Promise.resolve(null);

        const canvas = document.createElement('canvas');
        let w = video.videoWidth;
        let h = video.videoHeight;

        const maxDim = AppConfig?.faceRecognition?.imageStorage?.maxWidth || 400;
        const ratio = Math.min(maxDim / w, maxDim / h);

        if (ratio < 1) {
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);

        const quality = AppConfig?.faceRecognition?.imageStorage?.quality || 0.8;
        return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    }

    // ============================================
    // 📏 DISTANCE CALCULATION
    // ============================================

    euclideanDistance(desc1, desc2) {
        if (!desc1 || !desc2 || desc1.length !== desc2.length) return Infinity;

        let sum = 0;
        for (let i = 0; i < desc1.length; i++) {
            sum += (desc1[i] - desc2[i]) ** 2;
        }
        return Math.sqrt(sum);
    }

    // ============================================
    // 🎯 MODE HANDLERS
    // ============================================

    async handleRegistration(descriptor) {
        if (typeof handleRegistrationCapture === 'function') {
            await handleRegistrationCapture(descriptor);
        }
    }

    async handleFirstTimeSetup(descriptor) {
        if (typeof handleFirstTimeSetupCapture === 'function') {
            await handleFirstTimeSetupCapture(descriptor);
        }
    }

    async handleFaceUpdate(descriptor) {
        if (typeof handleFaceUpdateCapture === 'function') {
            await handleFaceUpdateCapture(descriptor);
        }
    }

    async handleAdminVerification(descriptor) {
        if (typeof handleAdminVerificationCapture === 'function') {
            await handleAdminVerificationCapture(descriptor);
        }
    }

    async handleAttendanceCapture(descriptor) {
        if (typeof handleAttendanceOperation === 'function') {
            await handleAttendanceOperation(descriptor);
        }
    }

    restartCamLoop() {
        window.isProcessingCapture = false;
        window.stabilityCounter = 0;
        updateStabilityRing?.(0, 2);

        const scanLine = document.getElementById('scanLine');
        if (scanLine) scanLine.classList.add('active');

        this.startDetectionLoop();
    }
}

// ============================================
// 🌍 GLOBAL FUNCTIONS
// ============================================

window.manualFaceCapture = async function () {
    if (typeof faceRecognition !== 'undefined') {
        return await faceRecognition.performCapture();
    }
    return false;
};

window.openCamera = async function () {
    if (typeof faceRecognition !== 'undefined') {
        return await faceRecognition.openCamera();
    }
    return false;
};

window.closeCamera = function () {
    if (typeof faceRecognition !== 'undefined') {
        faceRecognition.closeCamera();
    }
};

window.setCamStatus = function (html) {
    if (html !== window.lastCamStatusText) {
        const el = document.getElementById('camStatus');
        if (el) el.innerHTML = html;
        window.lastCamStatusText = html;
    }
};

window.resetLiveness = function () {
    if (typeof faceRecognition !== 'undefined') {
        faceRecognition.resetLiveness();
    }
};

window.updateLiveness = function (yaw, landmarks) {
    if (typeof faceRecognition !== 'undefined') {
        return faceRecognition.updateLiveness(yaw, landmarks);
    }
    return true;
};

window.getHeadYaw = function (landmarks) {
    if (typeof faceRecognition !== 'undefined') {
        return faceRecognition.getHeadYaw(landmarks);
    }
    return 0;
};

window.updateStabilityRing = function (current, max) {
    if (typeof faceRecognition !== 'undefined') {
        faceRecognition.updateStabilityRing(current, max);
    }
};

window.showMatchResult = function (success) {
    if (typeof faceRecognition !== 'undefined') {
        faceRecognition.showMatchResult(success);
    }
};

window.bufferToBase64 = function (buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

window.base64ToBuffer = function (base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

window.playSound = function (id) {
    if (typeof app !== 'undefined' && app.playSound) {
        app.playSound(id);
    }
};

window.showToast = function (msg, type) {
    if (typeof showToast === 'function') {
        showToast(msg, type);
    }
};

window.setStatus = function (txt) {
    if (typeof setStatus === 'function') {
        setStatus(txt);
    }
};

window.updateSplashProgress = function (percent) {
    const bar = document.getElementById('loadProgress');
    if (bar) bar.style.width = `${percent}%`;
};

// ============================================
// 🚀 INITIALIZE FACE RECOGNITION
// ============================================

let faceRecognition;

document.addEventListener('DOMContentLoaded', () => {
    faceRecognition = new FaceRecognitionManager();
    window.faceRecognition = faceRecognition;

    if (AppConfig?.features?.biometricAuth !== false) {
        faceRecognition.init();
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceRecognitionManager;
};

window.switchFaceCamera = async function () {
    try {
        AppConfig.faceRecognition.camera.facingMode =
            AppConfig.faceRecognition.camera.facingMode === 'user' ? 'environment' : 'user';

        if (typeof faceRecognition !== 'undefined') {
            await faceRecognition.openCamera();
        }
    } catch (e) {
        console.warn('switch camera failed', e);
    }
};
