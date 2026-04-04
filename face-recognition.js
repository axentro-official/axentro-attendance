<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Face Recognition JS File</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 20px;
            line-height: 1.6;
        }
        pre {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 20px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 80vh;
        }
        .file-header {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
            color: white;
            padding: 15px 20px;
            border-radius: 8px 8px 0 0;
            margin-bottom: 0;
            font-weight: bold;
            font-size: 18px;
        }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-right: 10px; }
        .modified { background: #10b981; }
        .info-box { background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>

<div class="file-header">
    📄 الملف 5/7: face-recognition.js 
    <span class="status modified">✅ تم التعديل والإضافة - التعرف على الوجوه</span>
</div>

<div class="info-box">
    <strong>📝 ملخص التعديلات:</strong><br>
    • Face Detection مع Corner Brackets<br>
    • Liveness Detection (حركة الرأس يمين/يسار)<br>
    • Stability Ring (5 إطارات ثابتة)<br>
    • Extract Stable Descriptor (عينة مزدوجة)<br>
    • Match Result Animation (✓/✗)<br>
    • Scan Line Effect<br>
    • Camera Management (فتح/إغلاق)
</div>

<pre><code>/**
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
        window.livenessMoved = false;
        window.stabilityCounter = 0;
        
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
        this.videoElement = document.getElementById('video');
        this.canvasElement = document.getElementById('canvas');
        
        console.log('📹 Camera elements set up');
    }

    // ============================================
    // 📚 MODEL LOADING (من الكود القديم)
    // ============================================

    async loadModels() {
        if (this.modelsLoaded) {
            console.log('✅ Models already loaded');
            return true;
        }

        const MODELS_URL = AppConfig?.faceRecognition?.models?.tinyFaceDetector || 
                          'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';

        try {
            setStatus('جاري تحميل الذكاء الاصطناعي (1/4)...');
            updateSplashProgress?.(25);
            
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
            window.lightModels = true;

            setStatus('جاري تحميل الذكاء الاصطناعي (2/4)...');
            updateSplashProgress?.(50);
            
            await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL);

            setStatus('جاري تحميل الذكاء الاصطناعي (3/4)...');
            updateSplashProgress?.(75);
            
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);

            setStatus('جاري تحميل الذكاء الاصطناعي (4/4)...');
            updateSplashProgress?.(100);
            
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
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
                    facingMode: AppConfig?.faceRecognition?.camera?.facingMode || 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };

            window.currentStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Setup video element
            const video = this.videoElement || document.getElementById('video');
            if (!video) throw new Error('Video element not found');

            video.srcObject = window.currentStream;
            await video.play();

            // Show camera overlay
            const overlay = document.getElementById('cameraOverlay');
            if (overlay) overlay.classList.add('active');

            // Reset status text
            window.lastCamStatusText = '';

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
        if (overlay) overlay.classList.remove('active');

        // Hide scan line
        const scanLine = document.getElementById('scanLine');
        if (scanLine) scanLine.classList.remove('active');

        // Reset match result
        const matchResult = document.getElementById('matchResult');
        if (matchResult) matchResult.className = 'match-result';

        // Hide stability ring
        const stabilityRing = document.getElementById('stabilityRing');
        if (stabilityRing) stabilityRing.classList.remove('active');

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
            const detection = await faceapi.detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions({ 
                    inputSize: AppConfig?.faceRecognition?.detection?.inputSize || 320,
                    scoreThreshold: AppConfig?.faceRecognition?.detection?.scoreThreshold || 0.2
                })
            ).withFaceLandmarks(true);

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection) {
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

                // Handle different modes
                this.handleDetectionModes(detection);

            } else {
                // No face detected
                setCamStatus?.('<i class="fas fa-spinner fa-spin"></i> جاري البحث عن الوجه...');
                
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
        const stableFramesRequired = AppConfig?.liveness?.stableFramesRequired || 5;

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
                if (stabilityRing) stabilityRing.classList.remove('active');

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
            const livenessOk = updateLiveness?.(getHeadYaw?.(detection.landmarks));

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
                if (stabilityRing) stabilityRing.classList.remove('active');

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

        setCamStatus?.('<i class="fas fa-brain"></i> جاري استخراج بصمة الوجه...');

        // Extract stable descriptor (من الكود القديم)
        const newDescriptor = await this.extractStableDescriptor();

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

        const samples = [];

        for (let i = 0; i < 2; i++) {
            try {
                const det = await faceapi.detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({ 
                        inputSize: 416, 
                        scoreThreshold: 0.2 
                    })
                ).withFaceLandmarks()
                .withFaceDescriptor();

                if (!det) return null;

                samples.push(Array.from(det.descriptor));

                if (i === 0) {
                    await new Promise(resolve => setTimeout(resolve, 120));
                }

            } catch(e) {
                console.error('Descriptor extraction error:', e);
                return null;
            }
        }

        // Calculate average descriptor
        const avg = new Array(samples[0].length).fill(0);
        for (const s of samples) {
            for (let j = 0; j < s.length; j++) {
                avg[j] += s[j] / 2;
            }
        }

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
        window.livenessMoved = false;
        window.stabilityCounter = 0;
    }

    updateLiveness(yaw) {
        if (!window.livenessActive) return true;

        const threshold = AppConfig?.liveness?.headMovementThreshold || 0.08;

        if (window.livenessStartYaw === null) {
            window.livenessStartYaw = yaw;
            setCamStatus?.('<i class="fas fa-arrow-left"></i> حرك رأسك قليلاً لليمين أو اليسار...');
            return false;
        }

        if (Math.abs(yaw - window.livenessStartYaw) > threshold) {
            window.livenessMoved = true;
            window.livenessActive = false;
            setCamStatus?.('<i class="fas fa-check-circle"></i> تم التحقق من الحركة، ثبت وجهك...');
            return true;
        }

        return false;
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
            ring.classList.add('active');
        } else {
            ring.classList.remove('active');
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
</code></pre>

<div style="margin-top: 20px; padding: 15px; background: rgba(6, 182, 212, 0.1); border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.3);">
    <strong>✅ حالة الملف:</strong> تم التعديل والإضافة بنجاح<br>
    <strong>📝 التعديلات الرئيسية:</strong><br>
    • دمج Face Detection بالكامل من الكود القديم<br>
    • إضافة Liveness Detection (حركة الرأس)<br>
    • إضافة Stability Ring (5 إطارات ثابتة)<br>
    • إضافة Extract Stable Descriptor (عينة مزدوجة لدقة أعلى)<br>
    • إضافة Match Result Animation<br>
    • إضافة Scan Line Effect<br>
    • تحسين Camera Management<br>
    • دعم كل أوضاع التشغيل (تسجيل، حضور، أدمن، إلخ)
</div>

</body>
</html>
