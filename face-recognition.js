/**
 * ============================================
 * 📷 AXENTRO FACE RECOGNITION v4.5 - STABLE MOBILE CAPTURE
 * ✅ Stable Tracking + Canvas-Based Position Check
 * 🔥 Less flicker, faster mobile capture, success/fail indicators
 * ============================================
 */

class FaceRecognitionManager {
    constructor() {
        this.modelsLoaded = false;
        this.modelLoadPromise = null;
        this.initialized = false;
        this.isCameraActive = false;
        this.currentStream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.detectionInterval = null;
        this.detectInFlight = false;
        this.lastDetectAt = 0;
        this.detectEveryMs = 140;
        this.pendingCaptureTimer = null;

        this.lastAutoCaptureAt = 0;
        this.cachedDescriptor = null;
        this.cachedDescriptorAt = 0;
        this.captureCooldownMs = 900;
        this.cameraOpenedAt = 0;
        this.enrollmentAutoTimer = null;
        this.extractTimeoutMs = 7000;

        // Stable tracking state
        this.lastTrackedBox = null;
        this.lastTrackedBoxAt = 0;
        this.facePersistenceMs = 300;
        this.missedDetections = 0;
        this.maxMissedDetections = 2;
        this.smoothedBox = null;
        this.lastDetectionRaw = null;

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
            if (this.initialized) return true;
            this.setupCameraElements();
            this.initialized = true;
            console.log('✅ Face Recognition System Ready');
            return true;
        } catch (error) {
            console.error('❌ Face Recognition Init Error:', error);

            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('التعرف على الوجه غير متوفر - يمكنك استخدام الكود وكلمة المرور');
            }
            return false;
        }
    }

    setupCameraElements() {
        this.ensureOverlayElements();

        this.videoElement =
            document.getElementById('video') ||
            document.getElementById('dashboardVideo') ||
            document.getElementById('registerVideo');

        this.canvasElement =
            document.getElementById('canvas') ||
            document.getElementById('dashboardCanvas') ||
            document.getElementById('registerCanvas');

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
                    <strong id="cameraTitle">التحقق ببصمة الوجه</strong>
                    <div style="display:flex;gap:8px;">
                        <button id="manualCaptureBtn" type="button" onclick="manualFaceCapture()" style="display:none;background:#2563eb;color:#fff;border:none;border-radius:10px;padding:8px 12px;cursor:pointer">التقاط الآن</button>
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

        if (this.modelLoadPromise) {
            return this.modelLoadPromise;
        }

        const modelBase = (AppConfig?.faceRecognition?.models?.baseUrl || './models').replace(/\/$/, '');
        const fallbackBase = (AppConfig?.faceRecognition?.models?.fallbackUrl || modelBase).replace(/\/$/, '');
        const sources = [...new Set([modelBase, fallbackBase])].filter(Boolean);

        const tryLoad = async (label, loader) => {
            let lastError = null;
            for (const source of sources) {
                try {
                    await loader(source);
                    return true;
                } catch (err) {
                    lastError = err;
                    console.warn(`Model source failed for ${label}:`, source, err?.message || err);
                }
            }
            throw lastError || new Error(`Model source unavailable for ${label}`);
        };

        this.modelLoadPromise = (async () => {
            try {
                setStatus('جاري تحميل الذكاء الاصطناعي (1/3)...');
                updateSplashProgress?.(25);
                await tryLoad('tinyFaceDetector', (src) => faceapi.nets.tinyFaceDetector.loadFromUri(src));
                window.lightModels = true;

                setStatus('جاري تحميل الذكاء الاصطناعي (2/3)...');
                updateSplashProgress?.(60);
                await tryLoad('faceLandmark68Net', (src) => faceapi.nets.faceLandmark68Net.loadFromUri(src));

                setStatus('جاري تحميل الذكاء الاصطناعي (3/3)...');
                updateSplashProgress?.(90);
                await tryLoad('faceRecognitionNet', (src) => faceapi.nets.faceRecognitionNet.loadFromUri(src));
                window.heavyModels = true;

                this.modelsLoaded = true;
                setStatus('النظام جاهز');
                updateSplashProgress?.(100);
                return true;
            } catch (error) {
                this.modelsLoaded = false;
                window.lightModels = false;
                window.heavyModels = false;
                console.error('❌ Model loading error:', error);
                throw error;
            } finally {
                setTimeout(() => updateSplashProgress?.(0), 500);
                this.modelLoadPromise = null;
            }
        })();

        return this.modelLoadPromise;
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
        this.modelLoadPromise = null;
        this.initialized = false;
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
            this.ensureOverlayElements();
            this.videoElement = document.getElementById('video') || this.videoElement;
            this.canvasElement = document.getElementById('canvas') || this.canvasElement;

            const requestedModes = {
                regMode: !!window.regMode,
                attMode: !!window.attMode,
                updateFaceMode: !!window.updateFaceMode,
                adminVerifyMode: !!window.adminVerifyMode,
                firstTimeSetupMode: !!window.firstTimeSetupMode,
                adminResetFaceMode: !!window.adminResetFaceMode,
                attType: window.attType || '',
                targetEmpForAdmin: window.targetEmpForAdmin || null
            };

            this.stopCamera();

            window.regMode = requestedModes.regMode;
            window.attMode = requestedModes.attMode;
            window.updateFaceMode = requestedModes.updateFaceMode;
            window.adminVerifyMode = requestedModes.adminVerifyMode;
            window.firstTimeSetupMode = requestedModes.firstTimeSetupMode;
            window.adminResetFaceMode = requestedModes.adminResetFaceMode;
            window.attType = requestedModes.attType;
            window.targetEmpForAdmin = requestedModes.targetEmpForAdmin;

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('الكاميرا غير مدعومة في هذا المتصفح');
            }

            const overlay = document.getElementById('cameraOverlay');
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.classList.add('active');
            }

            const enrollmentMode = !!(window.regMode || window.firstTimeSetupMode || window.updateFaceMode || window.adminResetFaceMode);
            const cameraTitle = document.getElementById('cameraTitle');
            const manualCaptureBtn = document.getElementById('manualCaptureBtn');
            if (cameraTitle) {
                cameraTitle.textContent = enrollmentMode ? 'تسجيل بصمة الوجه' : 'التحقق ببصمة الوجه';
            }
            if (manualCaptureBtn) {
                manualCaptureBtn.style.display = enrollmentMode ? 'inline-block' : 'none';
            }

            setCamStatus?.('<i class="fas fa-video"></i> جاري تشغيل الكاميرا...');

            const facingMode = AppConfig?.faceRecognition?.camera?.facingMode || 'user';

            const preferredConstraints = {
                video: {
                    facingMode,
                    width: { ideal: AppConfig?.faceRecognition?.camera?.width || 1280 },
                    height: { ideal: AppConfig?.faceRecognition?.camera?.height || 720 },
                    frameRate: { ideal: AppConfig?.faceRecognition?.camera?.frameRate || 30, max: 30 }
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
            this.clearTrackedFace();

            window.lastCamStatusText = '';
            window.currentFaceDetected = false;
            window.stabilityCounter = 0;
            window.isProcessingCapture = false;
            window.autoCaptureTimeout = null;

            updateStabilityRing?.(0, 2);

            if (window.attMode || window.adminVerifyMode || window.adminResetFaceMode) {
                resetLiveness?.();
            }

            setCamStatus?.('<i class="fas fa-cog fa-spin"></i> تجهيز الكاميرا...');
            this.isCameraActive = true;
            this.cameraOpenedAt = Date.now();

            const ready = this.modelsLoaded ? true : await this.loadModelsWithSafetyNet();
            if (!ready) throw new Error('تعذر تحميل نماذج التعرف على الوجه');

            setCamStatus?.(enrollmentMode ? '<i class="fas fa-user-plus"></i> ضع الوجه داخل الإطار وسيتم حفظ البصمة تلقائياً...' : '<i class="fas fa-spinner fa-spin"></i> ضع الوجه داخل الإطار وسيتم الالتقاط تلقائياً...');
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
        this.clearTrackedFace();

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
        if (this.enrollmentAutoTimer) {
            clearTimeout(this.enrollmentAutoTimer);
            this.enrollmentAutoTimer = null;
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
    // 🔍 TRACKING HELPERS
    // ============================================

    getCoverMetrics(video, canvas) {
        const videoW = video.videoWidth || canvas.width || 1;
        const videoH = video.videoHeight || canvas.height || 1;
        const canvasW = canvas.width || videoW;
        const canvasH = canvas.height || videoH;

        const videoRatio = videoW / videoH;
        const canvasRatio = canvasW / canvasH;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoRatio > canvasRatio) {
            drawHeight = canvasH;
            drawWidth = drawHeight * videoRatio;
            offsetX = (canvasW - drawWidth) / 2;
            offsetY = 0;
        } else {
            drawWidth = canvasW;
            drawHeight = drawWidth / videoRatio;
            offsetX = 0;
            offsetY = (canvasH - drawHeight) / 2;
        }

        return {
            videoW,
            videoH,
            canvasW,
            canvasH,
            drawWidth,
            drawHeight,
            offsetX,
            offsetY,
            scaleX: drawWidth / videoW,
            scaleY: drawHeight / videoH
        };
    }

    mapVideoBoxToCanvas(box, video, canvas) {
        const metrics = this.getCoverMetrics(video, canvas);

        return {
            x: (box.x * metrics.scaleX) + metrics.offsetX,
            y: (box.y * metrics.scaleY) + metrics.offsetY,
            width: box.width * metrics.scaleX,
            height: box.height * metrics.scaleY
        };
    }

    smoothTrackedBox(newBox) {
        if (!this.smoothedBox) {
            this.smoothedBox = { ...newBox };
            return this.smoothedBox;
        }

        const alpha = 0.32;
        this.smoothedBox = {
            x: this.smoothedBox.x + ((newBox.x - this.smoothedBox.x) * alpha),
            y: this.smoothedBox.y + ((newBox.y - this.smoothedBox.y) * alpha),
            width: this.smoothedBox.width + ((newBox.width - this.smoothedBox.width) * alpha),
            height: this.smoothedBox.height + ((newBox.height - this.smoothedBox.height) * alpha)
        };

        return this.smoothedBox;
    }

    storeTrackedFace(box) {
        this.lastTrackedBox = { ...box };
        this.lastTrackedBoxAt = Date.now();
        this.missedDetections = 0;
    }

    getTrackedFace() {
        if (!this.lastTrackedBox) return null;
        if ((Date.now() - this.lastTrackedBoxAt) > this.facePersistenceMs) return null;
        return this.lastTrackedBox;
    }

    clearTrackedFace() {
        this.lastTrackedBox = null;
        this.lastTrackedBoxAt = 0;
        this.smoothedBox = null;
        this.lastDetectionRaw = null;
        this.missedDetections = 0;
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

            const now = Date.now();
            if (!window.isProcessingCapture && !this.detectInFlight && (now - this.lastDetectAt) >= this.detectEveryMs) {
                this.detectInFlight = true;
                this.lastDetectAt = now;
                try {
                    await this.drawFaceBox();
                } finally {
                    this.detectInFlight = false;
                }
            }

            window.detectionLoopTimeout = setTimeout(detect, 90);
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

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const verificationMode = !!(window.attMode || window.adminVerifyMode);

        try {
            let detection = null;

            if (verificationMode) {
                detection = await faceapi
                    .detectSingleFace(
                        video,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: AppConfig?.faceRecognition?.detection?.inputSize || 320,
                            scoreThreshold: AppConfig?.faceRecognition?.detection?.scoreThreshold || 0.52
                        })
                    )
                    .withFaceLandmarks(true);
            } else {
                detection = await faceapi.detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: AppConfig?.faceRecognition?.detection?.inputSize || 320,
                        scoreThreshold: AppConfig?.faceRecognition?.detection?.scoreThreshold || 0.52
                    })
                );
            }

            if (detection?.detection?.box || detection?.box) {
                const rawBox = detection.detection?.box || detection.box;
                window.currentFaceDetected = true;

                if (verificationMode && detection.landmarks) {
                    this.lastDetectionRaw = detection;
                } else {
                    this.lastDetectionRaw = { detection: { box: rawBox } };
                }

                const canvasBox = this.mapVideoBoxToCanvas(rawBox, video, canvas);
                const trackedBox = this.smoothTrackedBox(canvasBox);

                this.storeTrackedFace(trackedBox);
                this.drawTrackedGuides(ctx, trackedBox);
                this.handleDetectionModes(detection, trackedBox, canvas);
                return;
            }

            window.currentFaceDetected = false;
            this.missedDetections++;

            const tracked = this.getTrackedFace();
            if (tracked && this.missedDetections <= this.maxMissedDetections) {
                this.drawTrackedGuides(ctx, tracked);
                setCamStatus?.('<i class="fas fa-spinner fa-pulse"></i> ثبت وجهك...');
                return;
            }

            this.clearTrackedFace();
            window.stabilityCounter = 0;
            updateStabilityRing?.(0, 2);
            setCamStatus?.((window.regMode || window.firstTimeSetupMode || window.updateFaceMode || window.adminResetFaceMode) ? '<i class="fas fa-user-plus"></i> قرّب الوجه قليلًا داخل الإطار لحفظ البصمة...' : '<i class="fas fa-spinner fa-spin"></i> وجّه الكاميرا إلى وجهك الأمامي داخل الإطار...');
        } catch (e) {
            console.error('Face detection error:', e);
        }
    }

    drawTrackedGuides(ctx, box) {
        if (!ctx || !box) return;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        const cLen = 24;
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

    isFaceWellPositionedCanvas(box, canvas) {
        if (!box || !canvas?.width || !canvas?.height) return false;

        const faceWidthRatio = box.width / canvas.width;
        const faceHeightRatio = box.height / canvas.height;

        const centerX = box.x + (box.width / 2);
        const centerY = box.y + (box.height / 2);

        const xOffset = Math.abs(centerX - (canvas.width / 2)) / canvas.width;
        const yOffset = Math.abs(centerY - (canvas.height / 2)) / canvas.height;

        return (
            faceWidthRatio >= 0.07 &&
            faceHeightRatio >= 0.09 &&
            faceWidthRatio <= 0.78 &&
            faceHeightRatio <= 0.88 &&
            xOffset <= 0.38 &&
            yOffset <= 0.40
        );
    }

    handleDetectionModes(detection, trackedBox = null, canvas = null) {
        const enrollmentMode = !!(
            window.regMode ||
            window.updateFaceMode ||
            window.firstTimeSetupMode ||
            window.adminResetFaceMode
        );

        const verificationMode = !!(window.attMode || window.adminVerifyMode);
        const configuredStableFrames = AppConfig?.faceRecognition?.antiSpoof?.minStableFrames || 4;
        const stableFramesRequired = enrollmentMode ? Math.min(3, configuredStableFrames) : configuredStableFrames;
        const faceReady = this.isFaceWellPositionedCanvas(trackedBox, canvas) || (!!trackedBox && (trackedBox.width / (canvas?.width || 1)) >= 0.07);

        if (!faceReady) {
            window.stabilityCounter = 0;
            updateStabilityRing?.(0, stableFramesRequired);
            setCamStatus?.('<i class="fas fa-face-smile"></i> ضع الوجه داخل الإطار وسيتم الالتقاط تلقائياً...');
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
                setCamStatus?.('<i class="fas fa-camera"></i> تم اكتشاف الوجه - جاري حفظ بصمة الوجه...');
                const now = Date.now();

                if (
                    !window.isProcessingCapture &&
                    (!this.lastAutoCaptureAt || (now - this.lastAutoCaptureAt) > this.captureCooldownMs)
                ) {
                    this.lastAutoCaptureAt = now;
                    if (window.autoCaptureTimeout) clearTimeout(window.autoCaptureTimeout);
                    window.autoCaptureTimeout = setTimeout(() => this.performCapture(), 120);
                }
            } else {
                setCamStatus?.('<i class="fas fa-spinner fa-pulse"></i> ثبت وجهك لحظة وسيتم حفظ البصمة تلقائياً...');
            }

            return;
        }

        if (verificationMode) {
            if (!window.heavyModels) {
                setCamStatus?.('<i class="fas fa-cog fa-spin"></i> تحميل نموذج التعرف...');
                return;
            }

            if (!detection?.landmarks) {
                setCamStatus?.('<i class="fas fa-cog fa-spin"></i> تجهيز التحقق الحيوي...');
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
                    window.autoCaptureTimeout = setTimeout(() => this.performCapture(), 180);
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
            newDescriptor = await this.extractQuickDescriptor();
        }

        if (!newDescriptor) {
            this.flashFailure('تعذر استخراج بصمة الوجه، حسّن الإضاءة وثبّت الوجه ثم جرّب مرة أخرى.');
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

        if (this.cachedDescriptor && (Date.now() - this.cachedDescriptorAt < 2500)) {
            return this.cachedDescriptor;
        }

        const descriptors = [];
        const attempts = 6;

        for (let i = 0; i < attempts; i++) {
            try {
                const det = await Promise.race([
                    faceapi
                        .detectSingleFace(
                            video,
                            new faceapi.TinyFaceDetectorOptions({
                                inputSize: 416,
                                scoreThreshold: 0.22
                            })
                        )
                        .withFaceLandmarks()
                        .withFaceDescriptor(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('descriptor-timeout')), 3200))
                ]);

                if (det?.descriptor) {
                    const arr = Array.from(det.descriptor);
                    descriptors.push(arr);
                    this.cachedDescriptor = arr;
                    this.cachedDescriptorAt = Date.now();

                    if (descriptors.length >= 4) break;
                }
            } catch (_e) {}

            await new Promise((resolve) => setTimeout(resolve, 60));
        }

        if (!descriptors.length) return null;
        if (descriptors.length === 1) return descriptors[0];

        const avg = new Array(descriptors[0].length).fill(0);
        for (const d of descriptors) {
            for (let i = 0; i < d.length; i++) {
                avg[i] += d[i] / descriptors.length;
            }
        }

        this.cachedDescriptor = avg;
        this.cachedDescriptorAt = Date.now();
        return avg;
    }

    async extractQuickDescriptor() {
        const video = this.videoElement || document.getElementById('video');
        if (!video) return null;

        try {
            const det = await faceapi
                .detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 416,
                        scoreThreshold: 0.25
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

            return det?.descriptor ? Array.from(det.descriptor) : null;
        } catch (_e) {
            return null;
        }
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
        window.livenessState = {
            stage: 'blink',
            blinkClosed: false,
            blinkCount: 0,
            startedAt: Date.now(),
            passAt: Date.now() + 1800
        };
        window.stabilityCounter = 0;
    }

    updateLiveness(yaw, landmarks = null) {
        if (!window.livenessActive) return true;

        const anti = AppConfig?.faceRecognition?.antiSpoof || {};
        const state = window.livenessState || {
            stage: 'blink',
            blinkClosed: false,
            blinkCount: 0,
            startedAt: Date.now(),
            passAt: Date.now() + 1800
        };
        window.livenessState = state;

        if (!landmarks) {
            setCamStatus?.('<i class="fas fa-spinner fa-spin"></i> تجهيز التحقق...');
            return false;
        }

        const leftEAR = this.getEyeAspectRatio(landmarks.getLeftEye?.() || []);
        const rightEAR = this.getEyeAspectRatio(landmarks.getRightEye?.() || []);
        const ear = (leftEAR + rightEAR) / 2;
        const blinkThreshold = anti.earBlinkThreshold || 0.19;

        if (state.stage === 'blink') {
            setCamStatus?.('<i class="fas fa-eye"></i> ارمش مرة واحدة أو ثبت وجهك لثانية...');
            if (ear && ear < blinkThreshold && !state.blinkClosed) {
                state.blinkClosed = true;
            } else if (ear && ear >= blinkThreshold && state.blinkClosed) {
                state.blinkClosed = false;
                state.blinkCount += 1;
            }

            if (state.blinkCount >= 1 || Date.now() >= state.passAt) {
                state.stage = 'done';
            } else {
                return false;
            }
        }

        if (state.stage === 'done') {
            window.livenessActive = false;
            setCamStatus?.('<i class="fas fa-check-circle"></i> ممتاز، ثبت وجهك لحظة...');
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

        const sourceBox = this.lastDetectionRaw?.detection?.box || this.lastDetectionRaw?.box || null;
        const canvas = document.createElement('canvas');
        const maxDim = AppConfig?.faceRecognition?.imageStorage?.maxWidth || 900;
        const quality = AppConfig?.faceRecognition?.imageStorage?.quality || 0.96;

        let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
        if (sourceBox && video.videoWidth && video.videoHeight) {
            const padX = sourceBox.width * 0.32;
            const padY = sourceBox.height * 0.38;
            sx = Math.max(0, Math.floor(sourceBox.x - padX));
            sy = Math.max(0, Math.floor(sourceBox.y - padY));
            sw = Math.min(video.videoWidth - sx, Math.floor(sourceBox.width + padX * 2));
            sh = Math.min(video.videoHeight - sy, Math.floor(sourceBox.height + padY * 2));
        }

        let w = sw;
        let h = sh;
        const ratio = Math.min(maxDim / w, maxDim / h, 1);
        w = Math.max(1, Math.round(w * ratio));
        h = Math.max(1, Math.round(h * ratio));

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
        }

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
}

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
