/**
 * ================================================
 * 🎭 AXENTRO FACE RECOGNITION v5.0 - PRO EDITION
 * ✅ Stable Detection, Anti-Spoofing, Auto-Capture
 * 🔥 Built with requestAnimationFrame & MediaPipe-ready
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

        // State
        this.isActive = false;
        this.modelsLoaded = false;
        this.currentMode = null; // 'register', 'verify', 'update', 'attendance'
        this.modeOptions = {};

        // Detection loop
        this.rafId = null;
        this.lastDetectionTime = 0;
        this.detectionThrottleMs = 100; // ~10 FPS detection

        // Face tracking history for stability
        this.faceHistory = [];
        this.maxHistory = 5;
        this.stabilityScore = 0;
        this.stabilityThreshold = 0.75;
        this.captureDelayMs = 400;
        this.captureTimer = null;

        // Descriptor caching
        this.cachedDescriptor = null;
        this.cachedDescriptorAt = 0;
        this.extractTimeoutMs = 7000;

        // Liveness (anti-spoofing)
        this.liveness = {
            active: false,
            required: {
                blink: true,
                turn: true,
                nod: true
            },
            completed: {
                blink: false,
                turn: false,
                nod: false
            },
            startYaw: null,
            startPitch: null,
            blinkState: 'open', // 'open', 'closed'
            blinkCount: 0,
            earThreshold: 0.2
        };

        // UI state
        this.statusElement = null;
        this.stabilityRing = null;
        this.matchResult = null;

        // Cooldown for auto-capture
        this.lastCaptureTime = 0;
        this.captureCooldown = 1500;

        // Processing flag
        this.isProcessing = false;

        console.log('🎭 FaceRecognitionManager v5.0 initialized');
    }

    // ============================================
    // 🚀 PUBLIC API (compatible with existing calls)
    // ============================================

    async init() {
        try {
            await this.loadModels();
            this.setupOverlay();
            console.log('✅ Face Recognition ready');
        } catch (error) {
            console.error('❌ Init failed:', error);
            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('التعرف على الوجه غير متوفر - يمكنك استخدام الكود وكلمة المرور');
            }
        }
    }

    async openCamera(mode = null, options = {}) {
        if (this.isActive) this.closeCamera();

        // Set mode and options
        this.currentMode = mode || this.detectModeFromGlobals();
        this.modeOptions = options;

        // Ensure overlay is visible
        this.ensureOverlayElements();
        this.overlay.style.display = 'flex';
        this.overlay.classList.add('active');

        // Reset state
        this.resetDetectionState();
        this.isProcessing = false;

        // Request camera
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

            // Set canvas dimensions
            this.canvas.width = this.video.videoWidth || 640;
            this.canvas.height = this.video.videoHeight || 480;
            this.ctx = this.canvas.getContext('2d');

            this.isActive = true;
            this.setStatus(this.getInitialStatusMessage());

            // Start detection loop
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

        // Stop media tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Clear video source
        if (this.video) this.video.srcObject = null;

        // Cancel animation frame
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        // Clear timers
        if (this.captureTimer) {
            clearTimeout(this.captureTimer);
            this.captureTimer = null;
        }

        // Hide overlay
        if (this.overlay) {
            this.overlay.style.display = 'none';
            this.overlay.classList.remove('active');
        }

        // Reset global flags
        this.clearGlobalFlags();

        console.log('📴 Camera closed');
    }

    stopCamera() {
        this.closeCamera();
    }

    isCameraRunning() {
        return this.isActive;
    }

    areModelsLoaded() {
        return this.modelsLoaded;
    }

    // ============================================
    // 🔧 MODELS LOADING
    // ============================================

    async loadModels() {
        if (this.modelsLoaded) return true;

        const baseUrl = AppConfig?.faceRecognition?.models?.baseUrl ||
                       'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

        try {
            setStatus?.('جاري تحميل نماذج الذكاء الاصطناعي...');
            updateSplashProgress?.(20);

            // Load lightweight models first
            await faceapi.nets.ssdMobilenetv1.loadFromUri(baseUrl);
            updateSplashProgress?.(50);

            await faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl);
            updateSplashProgress?.(75);

            await faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl);
            updateSplashProgress?.(100);

            this.modelsLoaded = true;
            setStatus?.('النظام جاهز');
            setTimeout(() => updateSplashProgress?.(0), 500);

            return true;
        } catch (error) {
            console.error('Model loading failed:', error);
            this.modelsLoaded = false;
            throw error;
        }
    }

    // ============================================
    // 🖥️ UI SETUP
    // ============================================

    setupOverlay() {
        // Create overlay if not exists
        if (document.getElementById('cameraOverlay')) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'cameraOverlay';
        this.overlay.innerHTML = this.getOverlayHTML();
        document.body.appendChild(this.overlay);

        // Add styles
        this.injectStyles();

        // Cache elements
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.statusElement = document.getElementById('camStatus');
        this.stabilityRing = {
            container: document.getElementById('stabilityRing'),
            circle: document.getElementById('stabilityCircle'),
            text: document.getElementById('stabilityText')
        };
        this.matchResult = {
            container: document.getElementById('matchResult'),
            icon: document.getElementById('matchResultIcon')
        };

        // Bind close button
        const closeBtn = this.overlay.querySelector('#closeCameraBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeCamera());
    }

    ensureOverlayElements() {
        this.overlay = document.getElementById('cameraOverlay');
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.statusElement = document.getElementById('camStatus');
        if (!this.stabilityRing) {
            this.stabilityRing = {
                container: document.getElementById('stabilityRing'),
                circle: document.getElementById('stabilityCircle'),
                text: document.getElementById('stabilityText')
            };
        }
        if (!this.matchResult) {
            this.matchResult = {
                container: document.getElementById('matchResult'),
                icon: document.getElementById('matchResultIcon')
            };
        }
        this.ctx = this.canvas?.getContext('2d');
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

                    <!-- Face Guide Frame -->
                    <div style="position:absolute;top:15%;left:15%;right:15%;bottom:15%;border:2px dashed rgba(56,189,248,0.6);border-radius:24px;pointer-events:none;"></div>

                    <!-- Stability Ring -->
                    <div id="stabilityRing" style="position:absolute;bottom:16px;left:16px;display:none;align-items:center;gap:8px;background:rgba(15,23,42,0.8);padding:6px 12px;border-radius:40px;backdrop-filter:blur(4px);">
                        <svg width="36" height="36" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.2)" stroke-width="3" fill="none"></circle>
                            <circle id="stabilityCircle" cx="18" cy="18" r="15" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="94.2" stroke-dashoffset="94.2" transform="rotate(-90 18 18)"></circle>
                        </svg>
                        <span id="stabilityText" style="font-weight:600;min-width:24px;">0</span>
                    </div>

                    <!-- Match Result Indicator -->
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
            @keyframes pulse-ring {
                0% { transform: scale(0.95); opacity: 0.7; }
                50% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(0.95); opacity: 0.7; }
            }
            .stability-pulse {
                animation: pulse-ring 1.5s infinite;
            }
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
    // 🎯 DETECTION LOOP (Stable, No Flicker)
    // ============================================

    startDetectionLoop() {
        const loop = (timestamp) => {
            if (!this.isActive) return;

            // Throttle detection to reduce flicker and CPU usage
            if (timestamp - this.lastDetectionTime >= this.detectionThrottleMs) {
                this.lastDetectionTime = timestamp;
                this.detectAndProcess().catch(e => console.warn('Detection error:', e));
            }

            // Always draw guides (but don't clear canvas unnecessarily)
            this.drawGuides();

            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    async detectAndProcess() {
        if (!this.modelsLoaded || !this.video?.videoWidth) return;

        try {
            const options = new faceapi.SsdMobilenetv1Options({
                minConfidence: 0.5,
                maxResults: 1
            });

            const detection = await faceapi
                .detectSingleFace(this.video, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

            // Clear canvas for fresh drawing
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (!detection) {
                this.handleNoFace();
                return;
            }

            // Face found
            this.handleFaceDetected(detection);

        } catch (error) {
            console.error('Detection error:', error);
        }
    }

    handleNoFace() {
        this.resetStability();
        this.cancelCaptureTimer();
        this.setStatus(this.getInstructionMessage());
        window.currentFaceDetected = false;
    }

    handleFaceDetected(detection) {
        window.currentFaceDetected = true;

        // Draw face box and landmarks
        this.drawFaceBox(detection.detection.box);
        this.drawLandmarks(detection.landmarks);

        // Update face history for stability calculation
        this.updateFaceHistory(detection);
        this.calculateStability();

        // Update UI
        this.updateStabilityRingUI();

        // Liveness check if needed
        if (this.shouldCheckLiveness()) {
            const livenessPassed = this.checkLiveness(detection.landmarks);
            if (!livenessPassed) {
                this.cancelCaptureTimer();
                return;
            }
        }

        // Auto-capture logic
        if (this.stabilityScore >= this.stabilityThreshold) {
            this.setStatus('✅ الوجه ثابت - جاري الالتقاط...');
            this.scheduleCapture(detection.descriptor);
        } else {
            this.cancelCaptureTimer();
            this.setStatus(this.getStabilityMessage());
        }
    }

    // ============================================
    // 📐 STABILITY CALCULATION
    // ============================================

    updateFaceHistory(detection) {
        const box = detection.detection.box;
        const faceData = {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            centerX: box.x + box.width / 2,
            centerY: box.y + box.height / 2,
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

        // Combined score
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
    // 🧬 LIVENESS DETECTION (Enhanced)
    // ============================================

    shouldCheckLiveness() {
        // Only for verification/attendance modes
        return (this.currentMode === 'verify' || this.currentMode === 'attendance') &&
               this.liveness.active &&
               !this.allLivenessCompleted();
    }

    allLivenessCompleted() {
        const req = this.liveness.required;
        const comp = this.liveness.completed;
        return (!req.blink || comp.blink) &&
               (!req.turn || comp.turn) &&
               (!req.nod || comp.nod);
    }

    checkLiveness(landmarks) {
        if (!this.liveness.active) {
            // Initialize liveness
            this.liveness.active = true;
            this.liveness.startYaw = this.getYaw(landmarks);
            this.liveness.startPitch = this.getPitch(landmarks);
            this.liveness.completed = { blink: false, turn: false, nod: false };
            this.setStatus('🔍 للتحقق من الحيوية: ارمش، ثم حرك رأسك يمين/يسار، ثم لأعلى/أسفل');
            return false;
        }

        // Blink detection
        if (this.liveness.required.blink && !this.liveness.completed.blink) {
            const ear = this.getEyeAspectRatio(landmarks);
            if (ear < this.liveness.earThreshold) {
                this.liveness.blinkState = 'closed';
            } else if (this.liveness.blinkState === 'closed') {
                this.liveness.blinkCount++;
                this.liveness.blinkState = 'open';
                if (this.liveness.blinkCount >= 1) {
                    this.liveness.completed.blink = true;
                    this.setStatus('✅ رمشة مكتشفة. الآن حرك رأسك يمين/يسار');
                }
            }
        }

        // Turn (yaw) detection
        if (this.liveness.required.turn && !this.liveness.completed.turn) {
            const currentYaw = this.getYaw(landmarks);
            const yawDiff = Math.abs(currentYaw - this.liveness.startYaw);
            if (yawDiff > 0.15) { // threshold normalized
                this.liveness.completed.turn = true;
                this.setStatus('✅ حركة الرأس الجانبية مكتشفة. الآن حرك رأسك لأعلى/أسفل');
            }
        }

        // Nod (pitch) detection
        if (this.liveness.required.nod && !this.liveness.completed.nod) {
            const currentPitch = this.getPitch(landmarks);
            const pitchDiff = Math.abs(currentPitch - this.liveness.startPitch);
            if (pitchDiff > 0.12) {
                this.liveness.completed.nod = true;
                this.setStatus('✅ تم التحقق من الحيوية. ثبّت وجهك للالتقاط...');
            }
        }

        // If all completed, deactivate liveness
        if (this.allLivenessCompleted()) {
            this.liveness.active = false;
            return true;
        }

        return false;
    }

    getYaw(landmarks) {
        const nose = landmarks.getNose()[3];
        const leftEye = landmarks.getLeftEye()[0];
        const rightEye = landmarks.getRightEye()[3];
        const eyeCenterX = (leftEye.x + rightEye.x) / 2;
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        return (nose.x - eyeCenterX) / eyeDistance;
    }

    getPitch(landmarks) {
        const nose = landmarks.getNose()[3];
        const leftEye = landmarks.getLeftEye()[1];
        const rightEye = landmarks.getRightEye()[2];
        const eyeCenterY = (leftEye.y + rightEye.y) / 2;
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        return (nose.y - eyeCenterY) / eyeDistance;
    }

    getEyeAspectRatio(landmarks) {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const earLeft = this.calculateEAR(leftEye);
        const earRight = this.calculateEAR(rightEye);
        return (earLeft + earRight) / 2.0;
    }

    calculateEAR(eyePoints) {
        if (eyePoints.length < 6) return 1.0;
        const A = Math.hypot(eyePoints[1].x - eyePoints[5].x, eyePoints[1].y - eyePoints[5].y);
        const B = Math.hypot(eyePoints[2].x - eyePoints[4].x, eyePoints[2].y - eyePoints[4].y);
        const C = Math.hypot(eyePoints[0].x - eyePoints[3].x, eyePoints[0].y - eyePoints[3].y);
        return (A + B) / (2.0 * C);
    }

    // ============================================
    // 📸 CAPTURE LOGIC
    // ============================================

    scheduleCapture(descriptor) {
        if (this.captureTimer || this.isProcessing) return;

        // Cooldown check
        const now = Date.now();
        if (now - this.lastCaptureTime < this.captureCooldown) return;

        this.cachedDescriptor = Array.from(descriptor);
        this.cachedDescriptorAt = now;

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

        this.setStatus('📸 جاري استخراج بصمة الوجه...');

        try {
            // Get stable descriptor (may use cached)
            const descriptor = await this.extractStableDescriptor();
            if (!descriptor) throw new Error('تعذر استخراج بصمة الوجه');

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
            // Restart detection loop (already running)
            this.resetStability();
        }
    }

    async extractStableDescriptor() {
        // Try to get a fresh descriptor multiple times and average
        const descriptors = [];
        const attempts = 3;

        for (let i = 0; i < attempts; i++) {
            try {
                const detection = await faceapi
                    .detectSingleFace(this.video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection?.descriptor) {
                    descriptors.push(Array.from(detection.descriptor));
                }
            } catch (e) {
                // ignore
            }
            await new Promise(r => setTimeout(r, 100));
        }

        if (descriptors.length === 0) {
            // fallback to cached
            if (this.cachedDescriptor && (Date.now() - this.cachedDescriptorAt < 5000)) {
                return this.cachedDescriptor;
            }
            return null;
        }

        // Average descriptors
        const avg = new Array(descriptors[0].length).fill(0);
        for (const desc of descriptors) {
            for (let j = 0; j < desc.length; j++) {
                avg[j] += desc[j] / descriptors.length;
            }
        }
        this.cachedDescriptor = avg;
        this.cachedDescriptorAt = Date.now();
        return avg;
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
    // 🎨 DRAWING (No Flicker)
    // ============================================

    drawGuides() {
        // Only draw static guides, face box is drawn separately
        // This method is called every frame but does minimal work
    }

    drawFaceBox(box) {
        this.ctx.strokeStyle = '#38bdf8';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Corner brackets
        const len = 20;
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 4;
        // Top-left
        this.ctx.beginPath();
        this.ctx.moveTo(box.x, box.y + len);
        this.ctx.lineTo(box.x, box.y);
        this.ctx.lineTo(box.x + len, box.y);
        this.ctx.stroke();
        // Top-right
        this.ctx.beginPath();
        this.ctx.moveTo(box.x + box.width - len, box.y);
        this.ctx.lineTo(box.x + box.width, box.y);
        this.ctx.lineTo(box.x + box.width, box.y + len);
        this.ctx.stroke();
        // Bottom-left
        this.ctx.beginPath();
        this.ctx.moveTo(box.x, box.y + box.height - len);
        this.ctx.lineTo(box.x, box.y + box.height);
        this.ctx.lineTo(box.x + len, box.y + box.height);
        this.ctx.stroke();
        // Bottom-right
        this.ctx.beginPath();
        this.ctx.moveTo(box.x + box.width - len, box.y + box.height);
        this.ctx.lineTo(box.x + box.width, box.y + box.height);
        this.ctx.lineTo(box.x + box.width, box.y + box.height - len);
        this.ctx.stroke();
    }

    drawLandmarks(landmarks) {
        // Optionally draw points for debugging
        if (!AppConfig?.debug) return;
        this.ctx.fillStyle = '#fbbf24';
        landmarks.positions.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    // ============================================
    // 📊 UI HELPERS
    // ============================================

    setStatus(text) {
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
        this.setStatus(`<span style="color:#10b981;">✓ ${message}</span>`);
    }

    flashFailure(message) {
        this.showMatchResult(false);
        playSound?.('faceid-error');
        this.setStatus(`<span style="color:#ef4444;">✕ ${message}</span>`);
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
        this.liveness.active = (this.currentMode === 'verify' || this.currentMode === 'attendance');
        this.liveness.completed = { blink: false, turn: false, nod: false };
        this.liveness.blinkCount = 0;
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
window.setCamStatus = (html) => faceRecognition?.setStatus(html);
window.resetLiveness = () => { if (faceRecognition) faceRecognition.liveness.active = true; };
window.updateLiveness = (yaw, landmarks) => faceRecognition?.checkLiveness(landmarks);
window.getHeadYaw = (landmarks) => faceRecognition?.getYaw(landmarks);
window.updateStabilityRing = (curr, max) => {}; // handled internally
window.showMatchResult = (success) => faceRecognition?.showMatchResult(success);
window.switchFaceCamera = async () => {
    if (AppConfig) {
        AppConfig.faceRecognition.camera.facingMode =
            AppConfig.faceRecognition.camera.facingMode === 'user' ? 'environment' : 'user';
        await faceRecognition?.openCamera();
    }
};

// Utility functions (unchanged)
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
