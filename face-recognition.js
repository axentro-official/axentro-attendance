/**
 * ============================================
 * 📷 AXENTRO FACE RECOGNITION v4.1 - FULL FEATURE
 * ✅ Includes stability counter, liveness detection, descriptor extraction
 * 🔥 Merged from original single-file code
 * ============================================
 */

class FaceRecognitionManager {
    constructor() {
        this.modelsLoaded = false;
        this.isCameraActive = false;
        this.currentStream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.detectionLoopTimeout = null;
        this.recognizedFace = null;
        
        // Stability & liveness
        this.stabilityCounter = 0;
        this.livenessActive = false;
        this.livenessStartYaw = null;
        this.livenessMoved = false;
        this.stableFramesRequired = AppConfig.faceRecognition.stableFramesRequired || 5;
        
        // Face descriptors
        this.knownFaces = new Map();   // code -> { name, descriptor }
        this.sessionDescriptor = null; // for current logged-in user
        
        // Modes
        this.attMode = false;
        this.adminVerifyMode = false;
        this.regMode = false;
        this.updateFaceMode = false;
        this.firstTimeSetupMode = false;
        this.adminResetFaceMode = false;
        this.attType = '';
        this.targetEmpForAdmin = null;
        this.regData = {};
        this.isProcessingCapture = false;
        this.autoCaptureTimeout = null;
        
        // Config
        this.config = AppConfig.faceRecognition;
        
        this.loadingAttempted = false;
        this.loadError = null;
        this.usedBackupCdn = false;
        
        // Elements (will be set later)
        this.cameraOverlay = null;
        this.camVideo = null;
        this.camCanvas = null;
        this.scanLine = null;
        this.matchResultDiv = null;
        this.stabilityRing = null;
        this.stabilityCircle = null;
        this.stabilityText = null;
        this.camStatus = null;
        this.modelProgressBar = null;
        
        console.log('🎭 Face Recognition Manager initialized (full feature)');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================
    
    async init() {
        try {
            this.setupElements();
            await this.loadModelsWithSafetyNet();
            console.log('✅ Face Recognition System Ready');
        } catch (error) {
            console.error('Face init error:', error);
            this.loadError = error.message;
        }
    }
    
    setupElements() {
        this.cameraOverlay = document.getElementById('cameraOverlay');
        this.camVideo = document.getElementById('cameraVideo');
        this.camCanvas = document.getElementById('cameraCanvas');
        this.scanLine = document.getElementById('scanLine');
        this.matchResultDiv = document.getElementById('matchResult');
        this.stabilityRing = document.getElementById('stabilityRing');
        this.stabilityCircle = document.getElementById('stabilityCircle');
        this.stabilityText = document.getElementById('stabilityText');
        this.camStatus = document.getElementById('camStatus');
        this.modelProgressBar = document.getElementById('modelProgressBar');
        
        // Also set dashboard elements if needed
        this.dashboardVideo = document.getElementById('dashboardVideo');
        this.dashboardCanvas = document.getElementById('dashboardCanvas');
    }
    
    async loadModelsWithSafetyNet() {
        this.loadingAttempted = true;
        try {
            const timeout = this.config.timeout.modelLoad;
            const loadPromise = this.loadModels();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Model load timeout')), timeout)
            );
            await Promise.race([loadPromise, timeoutPromise]);
            return true;
        } catch (error) {
            console.error('Model load failed:', error);
            this.modelsLoaded = false;
            this.loadError = error.message;
            return false;
        }
    }
    
    async loadModels() {
        if (this.modelsLoaded) return true;
        if (typeof faceapi === 'undefined') throw new Error('face-api.js not loaded');
        
        const models = [
            { name: 'tinyFaceDetector', url: this.config.models.tinyFaceDetector, required: true, progress: 20 },
            { name: 'faceLandmark68Tiny', url: this.config.models.faceLandmark68Tiny, required: true, progress: 40 },
            { name: 'faceRecognition', url: this.config.models.faceRecognition, required: true, progress: 70 },
            { name: 'faceLandmark68', url: this.config.models.faceLandmark68, required: false, progress: 85 }
        ];
        
        for (const model of models) {
            if (!model.url && !model.required) continue;
            if (!faceapi.nets[model.name]) continue;
            
            try {
                await faceapi.nets[model.name].loadFromUri(model.url);
                if (this.modelProgressBar) this.modelProgressBar.style.width = `${model.progress}%`;
                await this.sleep(200);
            } catch (err) {
                if (model.required) {
                    if (!this.usedBackupCdn && this.config.backupModels[model.name]) {
                        await faceapi.nets[model.name].loadFromUri(this.config.backupModels[model.name]);
                        this.usedBackupCdn = true;
                        continue;
                    }
                    throw err;
                }
            }
        }
        this.modelsLoaded = true;
        if (this.modelProgressBar) this.modelProgressBar.style.width = '100%';
        return true;
    }
    
    areModelsLoaded() { return this.modelsLoaded; }
    
    // ============================================
    // 📹 CAMERA OVERLAY CONTROL
    // ============================================
    
    async openCamera(mode = 'attendance', extraData = null) {
        try {
            if (!this.modelsLoaded) {
                if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> جاري تحميل النماذج...';
                await this.loadModelsWithSafetyNet();
                if (!this.modelsLoaded) throw new Error('Models not loaded');
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (this.camVideo) {
                this.camVideo.srcObject = stream;
                await this.camVideo.play();
                this.currentStream = stream;
                this.isCameraActive = true;
            }
            if (this.cameraOverlay) this.cameraOverlay.classList.add('active');
            if (this.scanLine) this.scanLine.classList.add('active');
            
            // Set mode
            this.attMode = (mode === 'attendance');
            this.adminVerifyMode = (mode === 'adminVerify');
            this.regMode = (mode === 'register');
            this.updateFaceMode = (mode === 'updateFace');
            this.firstTimeSetupMode = (mode === 'firstTime');
            this.adminResetFaceMode = (mode === 'adminReset');
            if (extraData) {
                if (extraData.type) this.attType = extraData.type;
                if (extraData.targetEmp) this.targetEmpForAdmin = extraData.targetEmp;
                if (extraData.regData) this.regData = extraData.regData;
            }
            
            this.resetLiveness();
            this.stabilityCounter = 0;
            this.updateStabilityRing(0);
            this.isProcessingCapture = false;
            this.startDetectionLoop();
            return true;
        } catch (error) {
            console.error('Camera open error:', error);
            if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> فشل فتح الكاميرا';
            return false;
        }
    }
    
    closeCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(t => t.stop());
            this.currentStream = null;
        }
        if (this.camVideo) this.camVideo.srcObject = null;
        if (this.cameraOverlay) this.cameraOverlay.classList.remove('active');
        if (this.scanLine) this.scanLine.classList.remove('active');
        if (this.matchResultDiv) this.matchResultDiv.className = 'match-result';
        if (this.stabilityRing) this.stabilityRing.classList.remove('active');
        
        this.attMode = false;
        this.adminVerifyMode = false;
        this.regMode = false;
        this.updateFaceMode = false;
        this.firstTimeSetupMode = false;
        this.adminResetFaceMode = false;
        this.attType = '';
        this.targetEmpForAdmin = null;
        this.isProcessingCapture = false;
        if (this.autoCaptureTimeout) clearTimeout(this.autoCaptureTimeout);
        if (this.detectionLoopTimeout) clearTimeout(this.detectionLoopTimeout);
        this.stabilityCounter = 0;
        this.livenessActive = false;
        this.isCameraActive = false;
    }
    
    startDetectionLoop() {
        if (this.detectionLoopTimeout) clearTimeout(this.detectionLoopTimeout);
        const detect = async () => {
            if (!this.isCameraActive || !this.cameraOverlay || !this.cameraOverlay.classList.contains('active')) return;
            await this.drawFaceBox();
            this.detectionLoopTimeout = setTimeout(detect, 200);
        };
        detect();
    }
    
    async drawFaceBox() {
        if (!this.camVideo || this.camVideo.videoWidth === 0) return;
        if (!this.modelsLoaded) {
            if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-cog fa-spin"></i> تحميل النماذج...';
            return;
        }
        try {
            const detection = await faceapi.detectSingleFace(this.camVideo, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 })).withFaceLandmarks(true);
            const ctx = this.camCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.camCanvas.width, this.camCanvas.height);
            if (detection) {
                const box = detection.detection.box;
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 3;
                ctx.strokeRect(box.x, box.y, box.width, box.height);
                // Draw corners
                const cl = 25;
                ctx.beginPath(); ctx.moveTo(box.x, box.y+cl); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x+cl, box.y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(box.x+box.width-cl, box.y); ctx.lineTo(box.x+box.width, box.y); ctx.lineTo(box.x+box.width, box.y+cl); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(box.x, box.y+box.height-cl); ctx.lineTo(box.x, box.y+box.height); ctx.lineTo(box.x+cl, box.y+box.height); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(box.x+box.width-cl, box.y+box.height); ctx.lineTo(box.x+box.width, box.y+box.height); ctx.lineTo(box.x+box.width, box.y+box.height-cl); ctx.stroke();
                
                // Liveness and stability
                if (this.attMode || this.adminVerifyMode || this.adminResetFaceMode) {
                    const yaw = this.getHeadYaw(detection.landmarks);
                    if (!this.updateLiveness(yaw)) {
                        this.stabilityCounter = 0;
                        this.updateStabilityRing(0);
                        if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-arrow-left"></i> حرك رأسك قليلاً...';
                        return;
                    }
                }
                
                if (this.regMode || this.updateFaceMode || this.firstTimeSetupMode || this.adminResetFaceMode || this.attMode || this.adminVerifyMode) {
                    this.stabilityCounter++;
                    this.updateStabilityRing(this.stabilityCounter);
                    if (this.stabilityCounter >= this.stableFramesRequired) {
                        if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-check-circle" style="color:var(--success);"></i> تم الالتقاط!';
                        if (this.stabilityRing) this.stabilityRing.classList.remove('active');
                        if (!this.autoCaptureTimeout && !this.isProcessingCapture) {
                            this.autoCaptureTimeout = setTimeout(() => this.performCapture(), 200);
                        }
                    } else {
                        if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> ثبت وجهك...';
                    }
                    return;
                }
            } else {
                if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري البحث عن الوجه...';
                if (this.autoCaptureTimeout) clearTimeout(this.autoCaptureTimeout);
                this.stabilityCounter = 0;
                this.updateStabilityRing(0);
                if (this.attMode || this.adminVerifyMode || this.adminResetFaceMode) this.resetLiveness();
            }
        } catch (err) {}
    }
    
    getHeadYaw(landmarks) {
        const nose = landmarks.getNose()[3];
        const leftEye = landmarks.getLeftEye()[0];
        const rightEye = landmarks.getRightEye()[3];
        return nose.x - ((leftEye.x + rightEye.x)/2);
    }
    
    resetLiveness() {
        this.livenessActive = true;
        this.livenessStartYaw = null;
        this.livenessMoved = false;
        this.stabilityCounter = 0;
    }
    
    updateLiveness(yaw) {
        if (!this.livenessActive) return true;
        if (this.livenessStartYaw === null) {
            this.livenessStartYaw = yaw;
            return false;
        }
        if (Math.abs(yaw - this.livenessStartYaw) > 0.08) {
            this.livenessMoved = true;
            this.livenessActive = false;
            if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-check-circle"></i> تم التحقق من الحركة، ثبت وجهك...';
            return true;
        }
        return false;
    }
    
    updateStabilityRing(current) {
        if (!this.stabilityRing || !this.stabilityCircle || !this.stabilityText) return;
        const max = this.stableFramesRequired;
        const circumference = 2 * Math.PI * 20;
        const offset = circumference - (current / max) * circumference;
        this.stabilityCircle.style.strokeDashoffset = offset;
        this.stabilityText.textContent = current;
        if (current > 0) this.stabilityRing.classList.add('active');
        else this.stabilityRing.classList.remove('active');
    }
    
    async extractStableDescriptor() {
        const samples = [];
        for (let i = 0; i < 2; i++) {
            const det = await faceapi.detectSingleFace(this.camVideo, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 })).withFaceLandmarks().withFaceDescriptor();
            if (!det) return null;
            samples.push(Array.from(det.descriptor));
            if (i === 0) await this.sleep(120);
        }
        const avg = new Array(samples[0].length).fill(0);
        for (const s of samples) for (let j = 0; j < s.length; j++) avg[j] += s[j] / 2;
        return avg;
    }
    
    async capturePhotoForStorage() {
        const c = document.createElement('canvas');
        let w = this.camVideo.videoWidth, h = this.camVideo.videoHeight;
        const maxSize = 400;
        const ratio = Math.min(maxSize / w, maxSize / h);
        if (ratio < 1) { w = Math.round(w * ratio); h = Math.round(h * ratio); }
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(this.camVideo, 0, 0, w, h);
        return new Promise(resolve => c.toBlob(resolve, 'image/jpeg', 0.8));
    }
    
    async performCapture() {
        if (this.isProcessingCapture) return;
        this.isProcessingCapture = true;
        if (this.autoCaptureTimeout) clearTimeout(this.autoCaptureTimeout);
        if (this.scanLine) this.scanLine.classList.remove('active');
        if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-brain"></i> جاري استخراج بصمة الوجه...';
        
        const descriptor = await this.extractStableDescriptor();
        if (!descriptor) {
            this.playSound('faceid-error');
            if (this.camStatus) this.camStatus.innerHTML = '<i class="fas fa-times-circle" style="color:red;"></i> لحظة غير مناسبة...';
            this.isProcessingCapture = false;
            this.stabilityCounter = 0;
            this.updateStabilityRing(0);
            if (this.scanLine) this.scanLine.classList.add('active');
            this.startDetectionLoop();
            return;
        }
        
        // Handle different modes (to be implemented by caller callbacks)
        // We'll dispatch events so that main app can handle
        const event = new CustomEvent('faceCaptured', { detail: { descriptor, mode: this.getCurrentMode(), extra: this.getModeExtra() } });
        window.dispatchEvent(event);
        
        this.isProcessingCapture = false;
    }
    
    getCurrentMode() {
        if (this.regMode) return 'register';
        if (this.firstTimeSetupMode) return 'firstTime';
        if (this.updateFaceMode) return 'updateFace';
        if (this.adminResetFaceMode) return 'adminReset';
        if (this.adminVerifyMode) return 'adminVerify';
        if (this.attMode) return 'attendance';
        return null;
    }
    
    getModeExtra() {
        if (this.regMode) return this.regData;
        if (this.adminVerifyMode) return this.targetEmpForAdmin;
        if (this.attMode) return { type: this.attType };
        if (this.updateFaceMode) return { code: this.sessionDescriptor?.code };
        if (this.adminResetFaceMode) return this.targetEmpForAdmin;
        return null;
    }
    
    showMatchResult(success) {
        if (!this.matchResultDiv) return;
        this.matchResultDiv.className = `match-result ${success ? 'success' : 'fail'}`;
        this.matchResultDiv.innerHTML = success ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>';
        setTimeout(() => { this.matchResultDiv.className = 'match-result'; }, 1500);
        this.playSound(success ? 'faceid-success' : 'faceid-error');
    }
    
    playSound(id) {
        const audio = document.getElementById(id);
        if (audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }
    }
    
    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    
    // ============================================
    // 🎯 RECOGNITION FOR ATTENDANCE (compare with sessionDescriptor)
    // ============================================
    async verifyFaceAgainstSession(descriptor) {
        if (!this.sessionDescriptor) return false;
        const distance = Utils.euclideanDistance(descriptor, this.sessionDescriptor);
        return distance < AppConfig.faceRecognition.recognition.threshold;
    }
    
    setSessionDescriptor(descriptor) { this.sessionDescriptor = descriptor; }
}

// Global instance
let faceRecognition;
document.addEventListener('DOMContentLoaded', () => {
    faceRecognition = new FaceRecognitionManager();
    faceRecognition.init();
});
console.log('📷 face-recognition.js v4.1 full loaded');
