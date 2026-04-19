/**
 * ============================================
 * 📷 AXENTRO FACE RECOGNITION v4.2 - COMPLETE
 * ✅ AI-Powered Face Detection & Recognition
 * 🔥 Enhanced with All Legacy Features
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
        
        // Mode flags (من الكود القديم)
        window.regMode = false;
        window.attMode = false;
        window.updateFaceMode = false;
        window.adminVerifyMode = false;
        window.firstTimeSetupMode = false;
        window.adminResetFaceMode = false;
        window.attType = '';
        window.targetEmpForAdmin = null;
        window.isProcessingCapture = false;
        
        // Liveness detection (من الكود القديم)
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
            
            // Try to load models with timeout
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
        this.videoElement = document.getElementById('video') || document.getElementById('dashboardVideo') || document.getElementById('registerVideo');
        this.canvasElement = document.getElementById('canvas') || document.getElementById('dashboardCanvas') || document.getElementById('registerCanvas');
        this.ensureOverlayElements();
        this.lastAutoCaptureAt = 0;
        this.cachedDescriptor = null;
        this.cachedDescriptorAt = 0;
        
        console.log('📹 Camera elements set up');
    }

    ensureOverlayElements() {
        if (document.getElementById('cameraOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'cameraOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.88);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px;';
        overlay.innerHTML = `
            <div style="width:min(720px,96vw);background:#0f172a;border:1px solid rgba(148,163,184,.2);border-radius:20px;padding:16px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.45);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;">
                    <strong>التحقق ببصمة الوجه</strong>
                    <div style="display:flex;gap:8px;">
                        <button type="button" id="manualCaptureBtn" onclick="manualFaceCapture()" style="background:#2563eb;color:#fff;border:none;border-radius:10px;padding:8px 12px;cursor:pointer">التقاط الآن</button>
                        <button type="button" onclick="closeCamera()" style="background:#ef4444;color:#fff;border:none;border-radius:10px;padding:8px 12px;cursor:pointer">إغلاق</button>
                    </div>
                </div>
                <div style="position:relative;aspect-ratio:4/3;background:#020617;border-radius:16px;overflow:hidden;">
                    <video id="video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
                    <canvas id="canvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
                    <div id="scanLine" style="position:absolute;left:10%;right:10%;top:12%;height:3px;background:linear-gradient(90deg,transparent,#38bdf8,transparent);box-shadow:0 0 18px #38bdf8;animation:scanline 2s linear infinite;"></div>
                    <div id="matchResult" class="match-result" style="position:absolute;top:10px;left:10px;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;"></div>
                    <div id="stabilityRing" style="position:absolute;bottom:12px;left:12px;display:none;align-items:center;gap:10px;background:rgba(15,23,42,.75);padding:8px 10px;border-radius:12px;">
                        <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,.15)" stroke-width="4" fill="none"></circle><circle id="stabilityCircle" cx="24" cy="24" r="20" stroke="#10b981" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="126" stroke-dashoffset="126"></circle></svg>
                        <strong id="stabilityText">0</strong>
                    </div>
                </div>
                <div id="camStatus" style="margin-top:12px;text-align:center;color:#cbd5e1">جاهز</div>
            </div>`;
        document.body.appendChild(overlay);
        const style = document.createElement('style');
        style.textContent = '@keyframes scanline{0%{transform:translateY(0)}50%{transform:translateY(240px)}100%{transform:translateY(0)}}';
        document.head.appendChild(style);
        this.videoElement = document.getElementById('video') || this.videoElement;
        this.canvasElement = document.getElementById('canvas') || this.canvasElement;
    }

    // ============================================
    // 📚 MODEL LOADING (من الكود القديم)
    // ============================================

    async loadModels() {
        if (this.modelsLoaded) {
            console.log('✅ Models already loaded');
            return true;
        }

        const MODELS_URL = AppConfig?.faceRecognition?.models?.baseUrl || AppConfig?.faceRecognition?.models?.fallbackUrl || 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';

        try {
            setStatus('جاري تحميل الذكاء الاصطناعي (1/4)...');
            updateSplashProgress?.(25);
            
            try { await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL); } catch(e) { await faceapi.nets.tinyFaceDetector.loadFromUri(AppConfig?.faceRecognition?.models?.fallbackUrl); }
            window.lightModels = true;

            setStatus('جاري تحميل الذكاء الاصطناعي (2/4)...');
            updateSplashProgress?.(50);
            
            try { await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL); } catch(e) { await faceapi.nets.faceLandmark68TinyNet.loadFromUri(AppConfig?.faceRecognition?.models?.fallbackUrl); }

            setStatus('جاري تحميل الذكاء الاصطناعي (3/4)...');
            updateSplashProgress?.(75);
            
            try { await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL); } catch(e) { await faceapi.nets.faceLandmark68Net.loadFromUri(AppConfig?.faceRecognition?.models?.fallbackUrl); }

            setStatus('جاري تحميل الذكاء الاصطناعي (4/4)...');
            updateSplashProgress?.(100);
            
            try { await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL); } catch(e) { await faceapi.nets.faceRecognitionNet.loadFromUri(AppConfig?.faceRecognition?.models?.fallbackUrl); }
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
    // 📹 CAMERA OPERATIONS (من الكود القديم)
    // ============================================

    async openCamera() {
        try {
            // Stop any existing stream
            this.stopCamera();

            // Check camera support
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('الكاميرا غير مدعومة في هذا المتصفح');
            }

            // Request camera access
            const constraints = {
                video: {
                    facingMode: { ideal: AppConfig?.faceRecognition?.camera?.facingMode || 'user' },
                    width: { ideal: AppConfig?.faceRecognition?.camera?.width || 640 },
                    height: { ideal: AppConfig?.faceRecognition?.camera?.height || 480 },
                    frameRate: { ideal: AppConfig?.faceRecognition?.camera?.frameRate || 24 }
                },
                audio: false
            };

            window.currentStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Setup video element
            const video = this.videoElement || document.getElementById('video');
            if (!video) throw new Error('Video element not found');

            video.srcObject = window.currentStream;
            video.setAttribute('playsinline', 'true');
            video.muted = true;
            await new Promise((resolve) => {
                video.onloadedmetadata = () => resolve();
                setTimeout(resolve, 1200);
            });
            await video.play();

            // Show camera overlay
            const overlay = document.getElementById('cameraOverlay');
            if (overlay) { overlay.style.display = 'flex'; overlay.classList.add('active'); }

            // Reset status text
            window.lastCamStatusText = '';
            window.currentFaceDetected = false;
            const manualBtn = document.getElementById('manualCaptureBtn');
            if (manualBtn) manualBtn.disabled = false;

            // Show scan line
            const scanLine = document.getElementById('scanLine');
            if (scanLine) scanLine.classList.add('active');

            // Set initial status
            setCamStatus?.(
                window.lightModels && window.heavyModels ? 
                '<i class="fas fa-spinner fa-spin"></i> جاري البحث عن الوجه...' : 
                '<i class="fas fa-cog fa-spin"></i> جاري تحميل نماذج الذكاء الاصطناعي...'
            );

            // Setup canvas
            const canvas = this.canvasElement || document.getElementById('canvas');
            if (canvas && video) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            // Reset stability counter
            window.stabilityCounter = 0;
            updateStabilityRing?.(0, AppConfig?.liveness?.stableFramesRequired || 5);

            // Setup liveness for attendance/admin modes
            if (window.attMode || window.adminVerifyMode || window.adminResetFaceMode) {
                resetLiveness?.();
            }

            window.isProcessingCapture = false;
            this.isCameraActive = true;

            // Start detection loop
            this.startDetectionLoop();

            return true;

        } catch(e) {
            console.error('❌ Camera error:', e);
            showToast?.('فشل الوصول للكاميرا', 'error');
            return false;
        }
    }

    closeCamera() {
        // Stop stream
        if (window.currentStream) {
            window.currentStream.getTracks().forEach(track => track.stop());
            window.currentStream = null;
        }

        // Clear video
        const video = this.videoElement || document.getElementById('video');
        if (video) video.srcObject = null;

        // Hide overlay
        const overlay = document.getElementById('cameraOverlay');
        if (overlay) { overlay.classList.remove('active'); overlay.style.display = 'none'; }

        // Hide scan line
        const scanLine = document.getElementById('scanLine');
        if (scanLine) scanLine.classList.remove('active');

        // Reset match result
        const matchResult = document.getElementById('matchResult');
        if (matchResult) matchResult.className = 'match-result';

        // Hide stability ring
        const stabilityRing = document.getElementById('stabilityRing');
        if (stabilityRing) { stabilityRing.classList.remove('active'); stabilityRing.style.display = 'none'; }

        // Reset all modes
        window.regMode = false;
        window.attMode = false;
        window.updateFaceMode = false;
        window.adminVerifyMode = false;
        window.firstTimeSetupMode = false;
        window.adminResetFaceMode = false;
        window.attType = '';
        window.targetEmpForAdmin = null;
        window.isProcessingCapture = false;

        // Clear timeouts
        if (window.autoCaptureTimeout) {
            clearTimeout(window.autoCaptureTimeout);
            window.autoCaptureTimeout = null;
        }
        if (window.detectionLoopTimeout) {
            clearTimeout(window.detectionLoopTimeout);
            window.detectionLoopTimeout = null;
        }

        // Reset counters
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
    // 🔍 DETECTION LOOP (من الكود القديم)
    // ============================================

    startDetectionLoop() {
        if (window.detectionLoopTimeout) {
            clearTimeout(window.detectionLoopTimeout);
        }

        const detect = async () => {
            const video = this.videoElement || document.getElementById('video');
            const overlay = document.getElementById('cameraOverlay');
            
            if (!video?.srcObject || !overlay?.classList.contains('active') || window.isProcessingCapture) {
                return;
            }

            await this.drawFaceBox();
            
            window.detectionLoopTimeout = setTimeout(detect, 200);
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
            let detection = await faceapi.detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions({ 
                    inputSize: AppConfig?.faceRecognition?.detection?.inputSize || 256,
                    scoreThreshold: AppConfig?.faceRecognition?.detection?.scoreThreshold || 0.12
                })
            ).withFaceLandmarks(true);

            if (!detection) {
                detection = await faceapi.detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.08 })
                ).withFaceLandmarks(true);
            }

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection) {
                window.currentFaceDetected = true;
                const box = detection.detection.box;

                // Draw face rectangle (من الكود القديم)
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 3;
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                // Draw corner brackets (من الكود القديم)
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

                // Cache descriptor opportunistically for mobile devices
                const now = Date.now();
                if ((window.regMode || window.firstTimeSetupMode || window.updateFaceMode || window.adminResetFaceMode || window.attMode || window.adminVerifyMode) &&
                    (!this.cachedDescriptorAt || now - this.cachedDescriptorAt > 900) &&
                    window.heavyModels) {
                    try {
                        const detailed = await faceapi.detectSingleFace(
                            video,
                            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.08 })
                        ).withFaceLandmarks().withFaceDescriptor();
                        if (detailed?.descriptor) {
                            this.cachedDescriptor = Array.from(detailed.descriptor);
                            this.cachedDescriptorAt = now;
                        }
                    } catch (_e) {}
                }

                // Handle different modes
                this.handleDetectionModes(detection);

            } else {
                window.currentFaceDetected = false;
                // No face detected
                setCamStatus?.('<i class="fas fa-spinner fa-spin"></i> وجّه الكاميرا إلى وجهك الأمامي داخل الإطار...');
                
                if (window.autoCaptureTimeout) clearTimeout(window.autoCaptureTimeout);
                window.stabilityCounter = 0;
                updateStabilityRing?.(0, AppConfig?.liveness?.stableFramesRequired || 5);
                
                if (window.attMode || window.adminVerifyMode || window.adminResetFaceMode) {
                    resetLiveness?.();
                }
            }

        } catch(e) {
            console.error('Face detection error:', e);
        }
    }

    handleDetectionModes(detection) {
        const stableFramesRequired = (window.regMode || window.firstTimeSetupMode || window.updateFaceMode || window.adminResetFaceMode) ? 4 : (AppConfig?.liveness?.stableFramesRequired || 5);

        // Registration / Update Face / First Time / Admin Reset modes
        if (window.regMode || window.updateFaceMode || window.firstTimeSetupMode || window.adminResetFaceMode) {
            if (!window.heavyModels) {
                setCamStatus?.('<i class="fas fa-cog fa-spin"></i> تحميل نموذج التعرف...');
                return;
            }

            window.stabilityCounter++;
            updateStabilityRing?.(window.stabilityCounter, stableFramesRequired);

            if (window.stabilityCounter >= stableFramesRequired) {
                setCamStatus?.('<i class="fas fa-camera" style="color:#10b981;"></i> تم الالتقاط!');
                
                const stabilityRing = document.getElementById('stabilityRing');
                if (stabilityRing) { stabilityRing.classList.remove('active'); stabilityRing.style.display = 'none'; }

                if (!window.autoCaptureTimeout && !window.isProcessingCapture) {
                    window.autoCaptureTimeout = setTimeout(() => this.performCapture(), 200);
                }
            } else {
                setCamStatus?.('<i class="fas fa-spinner fa-pulse"></i> ثبت وجهك...');
            }
            return;
        }

        // Attendance / Admin Verification modes (مع Liveness Detection)
        if (window.attMode || window.adminVerifyMode) {
            if (!window.heavyModels) {
                setCamStatus?.('<i class="fas fa-cog fa-spin"></i> تحميل نموذج التعرف...');
                return;
            }

            // Check liveness (حركة الرأس) - من الكود القديم
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
                setCamStatus?.('<i class="fas fa-check-circle" style="color:#10b981;"></i> تم الالتقاط!');
                
                const stabilityRing = document.getElementById('stabilityRing');
                if (stabilityRing) { stabilityRing.classList.remove('active'); stabilityRing.style.display = 'none'; }

                if (!window.autoCaptureTimeout && !window.isProcessingCapture) {
                    window.autoCaptureTimeout = setTimeout(() => this.performCapture(), 200);
                }
            } else {
                setCamStatus?.('<i class="fas fa-spinner fa-pulse"></i> ثبت وجهك...');
            }
            return;
        }
    }

    // ============================================
    // 🎯 CAPTURE OPERATIONS (من الكود القديم)
    // ============================================

    async performCapture() {
        if (window.isProcessingCapture) return;
        
        window.isProcessingCapture = true;
        window.autoCaptureTimeout = null;
        
        if (window.detectionLoopTimeout) {
            clearTimeout(window.detectionLoopTimeout);
            window.detectionLoopTimeout = null;
        }

        // Hide scan line
        const scanLine = document.getElementById('scanLine');
        if (scanLine) scanLine.classList.remove('active');

        if (!window.currentFaceDetected) {
            setCamStatus?.('<i class="fas fa-camera"></i> محاولة التقاط مباشرة من الكاميرا...');
        }

        setCamStatus?.('<i class="fas fa-brain"></i> جاري استخراج بصمة الوجه...');

        let newDescriptor = null;
        try {
            newDescriptor = await Promise.race([
                this.extractStableDescriptor(),
                new Promise(resolve => setTimeout(() => resolve(null), 4200))
            ]);
        } catch (_e) {}
        if (!newDescriptor && this.cachedDescriptor && (Date.now() - this.cachedDescriptorAt < 5000)) {
            newDescriptor = this.cachedDescriptor;
        }
        if (!newDescriptor && !window.currentFaceDetected) {
            showToast?.('لم يتم اكتشاف وجه واضح. قرّب الوجه داخل الإطار، استخدم الكاميرا الأمامية، وجرّب مرة أخرى.', 'warning');
        }

        if (!newDescriptor) {
            playSound?.('faceid-error');
            setCamStatus?.('<i class="fas fa-times-circle" style="color:red;"></i> لحظة غير مناسبة...');
            
            window.isProcessingCapture = false;
            window.stabilityCounter = 0;
            updateStabilityRing?.(0, AppConfig?.liveness?.stableFramesRequired || 5);
            
            const scanLineEl = document.getElementById('scanLine');
            if (scanLineEl) scanLineEl.classList.add('active');
            
            this.startDetectionLoop();
            return;
        }

        // Handle based on current mode
        if (window.regMode) {
            await this.handleRegistration(newDescriptor);
        } else if (window.firstTimeSetupMode) {
            await this.handleFirstTimeSetup(newDescriptor);
        } else if (window.updateFaceMode || window.adminResetFaceMode) {
            await this.handleFaceUpdate(newDescriptor);
        } else if (window.adminVerifyMode) {
            await this.handleAdminVerification(newDescriptor);
        } else if (window.attMode) {
            await this.handleAttendanceCapture(newDescriptor);
        }

        window.isProcessingCapture = false;
    }

    // ============================================
    // 🧬 STABLE DESCRIPTOR EXTRACTION (من الكود القديم)
    // ============================================

    async extractStableDescriptor() {
        const video = this.videoElement || document.getElementById('video');
        if (!video) return null;

        if (this.cachedDescriptor && (Date.now() - this.cachedDescriptorAt < 5000)) {
            return this.cachedDescriptor;
        }

        const descriptors = [];
        const attempts = [
            { inputSize: 320, scoreThreshold: 0.08 },
            { inputSize: 416, scoreThreshold: 0.05 },
            { inputSize: 512, scoreThreshold: 0.05 }
        ];

        for (const opts of attempts) {
            try {
                const det = await Promise.race([
                    faceapi.detectSingleFace(
                        video,
                        new faceapi.TinyFaceDetectorOptions(opts)
                    ).withFaceLandmarks().withFaceDescriptor(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('descriptor-timeout')), 1500))
                ]);
                if (det?.descriptor) {
                    const arr = Array.from(det.descriptor);
                    descriptors.push(arr);
                    this.cachedDescriptor = arr;
                    this.cachedDescriptorAt = Date.now();
                    if (descriptors.length >= 2) break;
                }
            } catch (_e) {}
            await new Promise(resolve => setTimeout(resolve, 120));
        }

        if (!descriptors.length) return null;
        if (descriptors.length === 1) return descriptors[0];

        const avg = new Array(descriptors[0].length).fill(0);
        for (const s of descriptors) {
            for (let j = 0; j < s.length; j++) avg[j] += s[j] / descriptors.length;
        }
        this.cachedDescriptor = avg;
        this.cachedDescriptorAt = Date.now();
        return avg;
    }

    // ============================================
    // 🎭 LIVENESS DETECTION (من الكود القديم)
    // ============================================

    getHeadYaw(landmarks) {
        try {
            const nose = landmarks.getNose()[3];
            const leftEye = landmarks.getLeftEye()[0];
            const rightEye = landmarks.getRightEye()[3];
            
            return nose.x - ((leftEye.x + rightEye.x) / 2);
        } catch(e) {
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
    // 📊 STABILITY RING (من الكود القديم)
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
            ring.classList.add('active'); ring.style.display = 'flex';
        } else {
            ring.classList.remove('active'); ring.style.display = 'none';
        }
    }

    showMatchResult(success) {
        const el = document.getElementById('matchResult');
        if (!el) return;

        el.className = `match-result ${success ? 'success' : 'fail'}`;
        el.innerHTML = success ? 
            '<i class="fas fa-check" style="color:white;"></i>' : 
            '<i class="fas fa-times" style="color:white;"></i>';

        setTimeout(() => {
            el.className = 'match-result';
        }, 1500);
    }

    // ============================================
    // 🖼️ IMAGE PROCESSING (من الكود القديم)
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
        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    }

    // ============================================
    // 📏 DISTANCE CALCULATION (من الكود القديم)
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
    // 🎯 MODE HANDLERS (سوف تستدعي من ملفات أخرى)
    // ============================================

    async handleRegistration(descriptor) {
        // Will be implemented in attendance.js or called globally
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
        updateStabilityRing?.(0, AppConfig?.liveness?.stableFramesRequired || 5);
        
        const scanLine = document.getElementById('scanLine');
        if (scanLine) scanLine.classList.add('active');
        
        this.startDetectionLoop();
    }
}

// ============================================
// 🌍 GLOBAL FUNCTIONS (من الكود القديم - للتوافق)
// ============================================

// Camera controls (global scope)
window.manualFaceCapture = async function() {
    if (typeof faceRecognition !== 'undefined') {
        return await faceRecognition.performCapture();
    }
    return false;
};

window.openCamera = async function() {
    if (typeof faceRecognition !== 'undefined') {
        return await faceRecognition.openCamera();
    }
    return false;
};

window.closeCamera = function() {
    if (typeof faceRecognition !== 'undefined') {
        faceRecognition.closeCamera();
    }
};

// Status updates
window.setCamStatus = function(html) {
    if (html !== window.lastCamStatusText) {
        const el = document.getElementById('camStatus');
        if (el) el.innerHTML = html;
        window.lastCamStatusText = html;
    }
};

// Liveness functions
window.resetLiveness = function() {
    if (typeof faceRecognition !== 'undefined') {
        faceRecognition.resetLiveness();
    }
};

window.updateLiveness = function(yaw) {
    if (typeof faceRecognition !== 'undefined') {
        return faceRecognition.updateLiveness(yaw);
    }
    return true;
};

window.getHeadYaw = function(landmarks) {
    if (typeof faceRecognition !== 'undefined') {
        return faceRecognition.getHeadYaw(landmarks);
    }
    return 0;
};

// Stability ring
window.updateStabilityRing = function(current, max) {
    if (typeof faceRecognition !== 'undefined') {
        faceRecognition.updateStabilityRing(current, max);
    }
};

// Match result
window.showMatchResult = function(success) {
    if (typeof faceRecognition !== 'undefined') {
        faceRecognition.showMatchResult(success);
    }
};

// Utility functions
window.bufferToBase64 = function(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

window.base64ToBuffer = function(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

// Sound playback
window.playSound = function(id) {
    if (typeof app !== 'undefined' && app.playSound) {
        app.playSound(id);
    }
};

// Toast notification
window.showToast = function(msg, type) {
    if (typeof showToast === 'function') {
        showToast(msg, type);
    }
};

// Status update
window.setStatus = function(txt) {
    if (typeof setStatus === 'function') {
        setStatus(txt);
    }
};

// Splash progress
window.updateSplashProgress = function(percent) {
    const bar = document.getElementById('loadProgress');
    if (bar) bar.style.width = `${percent}%`;
};

// ============================================
// 🚀 INITIALIZE FACE RECOGNITION
// ============================================

let faceRecognition;

document.addEventListener('DOMContentLoaded', () => {
    faceRecognition = new FaceRecognitionManager();
    
    // Make globally available
    window.faceRecognition = faceRecognition;
    
    // Auto-init if config allows
    if (AppConfig?.features?.biometricAuth !== false) {
        faceRecognition.init();
    }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceRecognitionManager;
}


window.switchFaceCamera = async function() {
    try {
        AppConfig.faceRecognition.camera.facingMode = AppConfig.faceRecognition.camera.facingMode === 'user' ? 'environment' : 'user';
        if (typeof faceRecognition !== 'undefined') await faceRecognition.openCamera();
    } catch (e) { console.warn('switch camera failed', e); }
};
