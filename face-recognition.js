/**
 * ============================================
 * 📷 AXENTRO FACE RECOGNITION v4.1 - ROBUST EDITION
 * ✅ AI-Powered Face Detection & Recognition
 * 🔥 مع تحسينات كبيرة لمنع الفشل في التحميل
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
        this.recognizedFace = null;
        
        // Face descriptors storage (for matching)
        this.knownFaces = new Map();
        
        // Configuration
        this.config = AppConfig.faceRecognition;
        
        // Loading state tracking
        this.loadingAttempted = false;
        this.loadError = null;
        this.usedBackupCdn = false;

        console.log('🎭 Face Recognition Manager initialized');
    }

    // ============================================
    // 🚀 INITIALIZATION
    // ============================================

    /**
     * Initialize face recognition system
     */
    async init() {
        console.log('🎭 Initializing Face Recognition System...');
        
        try {
            // Setup camera elements first (doesn't require models)
            this.setupCameraElements();
            
            // Try to load models with timeout and fallback
            await this.loadModelsWithSafetyNet();
            
            console.log('✅ Face Recognition System Ready');
            
        } catch (error) {
            console.error('❌ Face Recognition Init Error:', error);
            this.loadError = error.message;
            
            // Don't throw - allow app to continue in basic mode
            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('التعرف على الوجه غير متوفر - يمكنك استخدام الكود وكلمة المرور');
            }
        }
    }

    /**
     * Load required neural network models with SAFETY NET
     * 🔥 THE CRITICAL FIX - Prevents app from crashing
     */
    async loadModels() {
        if (this.modelsLoaded) {
            console.log('✅ Models already loaded');
            return true;
        }

        const statusEl = document.getElementById('loadStatus');
        const progressEl = document.getElementById('loadProgress');

        try {
            // Update status
            if (statusEl) statusEl.textContent = 'جاري تحميل نماذج الذكاء الاصطناعي...';
            
            // Check if face-api library is available
            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js library not loaded. Please check your internet connection.');
            }

            // Models to load (in order of importance)
            const models = [
                { 
                    name: 'tinyFaceDetector', 
                    url: this.config.models.tinyFaceDetector, 
                    required: true,
                    progress: 20 
                },
                { 
                    name: 'faceLandmark68Tiny', 
                    url: this.config.models.faceLandmark68Tiny, 
                    required: true, 
                    progress: 40 
                },
                { 
                    name: 'faceRecognition', 
                    url: this.config.models.faceRecognition, 
                    required: true, 
                    progress: 70 
                },
                { 
                    name: 'faceExpression', 
                    url: this.config.models.faceExpression || null, 
                    required: false, // Optional model
                    progress: 85 
                }
            ];

            let loadedCount = 0;

            for (const model of models) {
                // Skip optional models if not available
                if (!model.url && !model.required) {
                    console.log(`⏭️ Skipping optional model: ${model.name}`);
                    continue;
                }

                // Check if model exists in face-api
                if (!faceapi.nets[model.name]) {
                    console.warn(`⚠️ Model ${model.name} not available in face-api`);
                    if (model.required) {
                        throw new Error(`Required model ${model.name} not available`);
                    }
                    continue;
                }

                console.log(`📥 Loading model: ${model.name}...`);
                
                try {
                    // Set timeout for each model load
                    const modelLoadPromise = faceapi.nets[model.name].loadFromUri(model.url);
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Timeout loading ${model.name}`)), 10000)
                    );

                    await Promise.race([modelLoadPromise, timeoutPromise]);
                    
                    loadedCount++;
                    
                    if (progressEl) progressEl.style.width = `${model.progress}%`;
                    console.log(`✅ Model loaded: ${model.name}`);
                    
                    // Small delay for UI update
                    await this.sleep(200);

                } catch (modelError) {
                    console.error(`❌ Failed to load model ${model.name}:`, modelError.message);
                    
                    if (model.required) {
                        // Try backup CDN before failing
                        if (!this.usedBackupCdn && this.config.backupModels?.[model.name]) {
                            console.log(`🔄 Trying backup CDN for ${model.name}...`);
                            this.usedBackupCdn = true;
                            
                            try {
                                await faceapi.nets[model.name].loadFromUri(this.config.backupModels[model.name]);
                                loadedCount++;
                                console.log(`✅ Model loaded from backup: ${model.name}`);
                                continue;
                            } catch (backupError) {
                                console.error(`❌ Backup CDN also failed for ${model.name}`);
                            }
                        }
                        
                        // If we can't load a required model, throw error
                        throw new Error(`Failed to load required model: ${model.name}`);
                    }
                    // If optional model fails, just continue
                }
            }

            this.modelsLoaded = loadedCount > 0; // At least some models loaded
            
            if (progressEl) progressEl.style.width = '100%';
            if (statusEl) statusEl.textContent = this.modelsLoaded ? 
                'تم تحميل النماذج بنجاح ✓' : 
                '⚠️ تم تحميل بعض النماذج فقط';

            return this.modelsLoaded;

        } catch (error) {
            console.error('❌ Model loading error:', error);
            this.loadError = error.message;
            throw error; // Re-throw to be caught by caller
        }
    }

    /**
     * Enhanced model loading with safety net
     * Prevents app crash on failure
     */
    async loadModelsWithSafetyNet() {
        this.loadingAttempted = true;
        
        try {
            // Set overall timeout
            const timeoutMs = this.config.timeout?.modelLoad || 15000;
            
            const loadPromise = this.loadModels();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('تجاوز وقت تحميل النماذج (15 ثانية)')), timeoutMs)
            );

            const result = await Promise.race([loadPromise, timeoutPromise]);
            return result;

        } catch (error) {
            console.error('❌ Face recognition models failed to load:', error.message);
            this.modelsLoaded = false;
            this.loadError = error.message;
            
            // Return false instead of throwing - allows app to continue
            return false;
        }
    }

    /**
     * Check if models are loaded
     */
    areModelsLoaded() {
        return this.modelsLoaded;
    }

    /**
     * Setup camera video and canvas elements
     */
    setupCameraElements() {
        // Dashboard camera
        this.videoElement = document.getElementById('dashboardVideo');
        this.canvasElement = document.getElementById('dashboardCanvas');
        
        // Register page cameras
        this.registerVideo = document.getElementById('registerVideo');
        this.registerCanvas = document.getElementById('registerCanvas');

        console.log('📹 Camera elements set up');
    }

    // ============================================
    // 📹 CAMERA OPERATIONS
    // ============================================

    /**
     * Start camera stream with ENHANCED error handling
     * @param {HTMLVideoElement} videoElement - Video element to use
     * @param {object} options - Camera options
     * @returns {Promise} Camera stream
     */
    async startCamera(videoElement, options = {}) {
        try {
            // Stop any existing stream
            this.stopCamera();

            // Check for camera support
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(ErrorCodes.FACE_NO_CAMERA.message);
            }

            // Default camera constraints
            const constraints = {
                video: {
                    facingMode: options.facingMode || this.config.camera.facingMode,
                    width: { ideal: this.config.camera.width },
                    height: { ideal: this.config.camera.height },
                    frameRate: { ideal: this.config.camera.frameRate }
                },
                audio: false
            };

            // Request permission with timeout
            const timeoutMs = this.config.timeout?.cameraStart || 10000;
            
            const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('تم رفض إذن الكاميرا أو تجاوز الوقت')), timeoutMs)
            );

            const stream = await Promise.race([streamPromise, timeoutPromise]);
            
            // Attach to video element
            if (videoElement) {
                videoElement.srcObject = stream;
                await videoElement.play().catch(e => console.warn('Video play warning:', e));
                
                // Store reference
                this.currentVideoElement = videoElement;
            }

            this.currentStream = stream;
            this.isCameraActive = true;
            
            console.log('📹 Camera started successfully');
            return stream;

        } catch (error) {
            console.error('Camera start error:', error);
            this.handleCameraError(error);
            throw error;
        }
    }

    /**
     * Stop camera stream
     */
    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        
        if (this.currentVideoElement) {
            this.currentVideoElement.srcObject = null;
        }
        
        this.stopDetection();
        this.isCameraActive = false;
        
        console.log('📹 Camera stopped');
    }

    /**
     * Check if camera is currently running
     */
    isCameraRunning() {
        return this.isCameraActive;
    }

    /**
     * Switch between front/back camera
     */
    async switchCamera() {
        if (!this.isCameraActive || !this.currentVideoElement) return;

        const currentFacingMode = this.lastFacingMode || 'user';
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        try {
            if (typeof ui !== 'undefined' && ui.showInfo) {
                ui.showInfo('جاري تبديل الكاميرا...');
            }
            
            await this.startCamera(this.currentVideoElement, { facingMode: newFacingMode });
            this.lastFacingMode = newFacingMode;
            
            if (typeof ui !== 'undefined' && ui.showSuccess) {
                ui.showSuccess('تم تبديل الكاميرا ✓');
            }
        } catch (error) {
            if (typeof ui !== 'undefined' && ui.showError) {
                ui.showError('فشل تبديل الكاميرا');
            }
        }
    }

    /**
     * Handle camera errors gracefully
     * @param {Error} error - Camera error
     */
    handleCameraError(error) {
        let userMessage = '';
        
        switch (error.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                userMessage = ErrorCodes.FACE_CAMERA_PERMISSION_DENIED.message;
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                userMessage = ErrorCodes.FACE_NO_CAMERA.message;
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                userMessage = 'الكاميرا مستخدمة من قبل تطبيق آخر';
                break;
            case 'OverconstrainedError':
                userMessage = 'الكاميرا لا تدعم الإعدادات المطلوبة';
                break;
            default:
                userMessage = error.message || ErrorCodes.FACE_NO_CAMERA.message;
        }

        if (typeof ui !== 'undefined' && ui.showError) {
            ui.showError(userMessage);
        }
        
        console.error('Camera error:', error.name, error.message);
    }

    // ============================================
    // 🔍 FACE DETECTION
    // ============================================

    /**
     * Start continuous face detection
     * @param {HTMLVideoElement} video - Video element
     * @param {HTMLCanvasElement} canvas - Canvas for drawing
     * @param {Function} onDetect - Callback when face detected
     */
    async startDetection(video, canvas, onDetect) {
        if (!this.modelsLoaded) {
            console.warn('⚠️ Cannot start detection - models not loaded');
            if (typeof ui !== 'undefined' && ui.showWarning) {
                ui.showWarning('نماذج التعرف غير محملة');
            }
            return;
        }

        // Stop existing detection
        this.stopDetection();

        // Setup canvas dimensions
        if (video && canvas) {
            canvas.width = video.videoWidth || this.config.camera.width;
            canvas.height = video.videoHeight || this.config.camera.height;
        }

        // Create display size for detection
        const displaySize = { 
            width: video?.videoWidth || this.config.camera.width, 
            height: video?.videoHeight || this.config.camera.height 
        };
        
        faceapi.matchDimensions(canvas, displaySize);

        // Start detection loop
        this.detectionInterval = setInterval(async () => {
            try {
                const detections = await this.detectFaces(video, displaySize);
                
                if (detections.length > 0 && onDetect) {
                    onDetect(detections[0], canvas);
                }
            } catch (error) {
                console.error('Detection loop error:', error);
                // Don't stop the loop on single error - continue trying
            }
        }, 200); // Detect every 200ms

        console.log('🔍 Face detection started');
    }

    /**
     * Stop face detection loop
     */
    stopDetection() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }

    /**
     * Detect faces in video frame
     * @param {HTMLVideoElement} video - Video element
     * @param {object} displaySize - Display dimensions
     * @returns {Promise} Array of detections
     */
    async detectFaces(video, displaySize) {
        if (!video || !this.modelsLoaded || typeof faceapi === 'undefined') {
            return [];
        }

        try {
            const options = new faceapi.TinyFaceDetectorOptions({
                inputSize: this.config.detection.inputSize,
                scoreThreshold: this.config.detection.scoreThreshold
            });

            const detections = await faceapi
                .detectAllFaces(video, options)
                .withFaceLandmarks(true);

            // Resize detections to match display
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            
            return resizedDetections;

        } catch (error) {
            console.error('Face detection error:', error);
            return [];
        }
    }

    /**
     * Draw detection box on canvas
     * @param {Array} detections - Face detections
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    drawDetections(detections, canvas) {
        if (!canvas || !detections.length || typeof faceapi === 'undefined') return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw detection boxes
        detections.forEach(detection => {
            const box = detection.detection.box;
            
            // Draw rectangle
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw corners
            const cornerLength = 20;
            ctx.lineWidth = 4;

            // Top-left corner
            ctx.beginPath();
            ctx.moveTo(box.x, box.y + cornerLength);
            ctx.lineTo(box.x, box.y);
            ctx.lineTo(box.x + cornerLength, box.y);
            ctx.stroke();

            // Top-right corner
            ctx.beginPath();
            ctx.moveTo(box.x + box.width - cornerLength, box.y);
            ctx.lineTo(box.x + box.width, box.y);
            ctx.lineTo(box.x + box.width, box.y + cornerLength);
            ctx.stroke();

            // Bottom-left corner
            ctx.beginPath();
            ctx.moveTo(box.x, box.y + box.height - cornerLength);
            ctx.lineTo(box.x, box.y + box.height);
            ctx.lineTo(box.x + cornerLength, box.y + box.height);
            ctx.stroke();

            // Bottom-right corner
            ctx.beginPath();
            ctx.moveTo(box.x + box.width - cornerLength, box.y + box.height);
            ctx.lineTo(box.x + box.width, box.y + box.height);
            ctx.lineTo(box.x + box.width, box.y + box.height - cornerLength);
            ctx.stroke();

            // Draw landmarks if available
            if (detection.landmarks) {
                const landmarks = detection.landmarks;
                const points = landmark.positions || [];
                
                ctx.fillStyle = '#10b981';
                points.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }
        });
    }

    // ============================================
    // 🎯 FACE RECOGNITION (Matching)
    // ============================================

    /**
     * Capture face descriptor from video/canvas
     * @returns {Promise<Float32Array|null>} Face descriptor
     */
    async captureFaceDescriptor() {
        if (!this.modelsLoaded || !this.currentVideoElement) {
            console.warn('Cannot capture descriptor - models or camera not ready');
            return null;
        }

        try {
            const detection = await faceapi
                .detectSingleFace(
                    this.currentVideoElement, 
                    new faceapi.TinyFaceDetectorOptions()
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                return detection.descriptor;
            }

            return null;

        } catch (error) {
            console.error('Face descriptor capture error:', error);
            return null;
        }
    }

    /**
     * Recognize face for attendance check-in/out
     * @returns {Promise<object|null>} Recognized employee data
     */
    async recognizeForAttendance() {
        if (!this.modelsLoaded || !this.isCameraActive) {
            console.warn('Face recognition not available');
            return null;
        }

        try {
            // Capture current face descriptor
            const descriptor = await this.captureFaceDescriptor();
            
            if (!descriptor) {
                throw new Error(ErrorCodes.FACE_NO_FACE_DETECTED.message);
            }

            // Find best match among known faces
            let bestMatch = null;
            let bestDistance = Infinity;

            this.knownFaces.forEach((employeeData, code) => {
                if (employeeData.descriptor) {
                    const distance = faceapi.euclideanDistance(descriptor, employeeData.descriptor);
                    
                    if (distance < bestDistance && distance < this.config.recognition.labelDistance) {
                        bestDistance = distance;
                        bestMatch = {
                            code: code,
                            name: employeeData.name,
                            confidence: 1 - distance,
                            distance: distance
                        };
                    }
                }
            });

            if (bestMatch) {
                console.log(`✅ Face recognized: ${bestMatch.name} (${(bestMatch.confidence * 100).toFixed(1)}%)`);
                this.recognizedFace = bestMatch;
                return bestMatch;
            } else {
                throw new Error(ErrorCodes.FACE_MATCH_FAILED.message);
            }

        } catch (error) {
            console.error('Recognition error:', error);
            this.recognizedFace = null;
            throw error;
        }
    }

    /**
     * Load known faces from database for matching
     */
    async loadKnownFaces() {
        if (!this.modelsLoaded || typeof db === 'undefined') {
            console.warn('Cannot load known faces - prerequisites not met');
            return;
        }

        try {
            console.log('📥 Loading known faces from database...');
            
            const employees = await db.getAllEmployees();
            
            if (employees && employees.length > 0) {
                employees.forEach(emp => {
                    if (emp.face_descriptor && emp.code) {
                        // Convert JSON descriptor back to Float32Array if needed
                        let descriptor = emp.face_descriptor;
                        if (typeof descriptor === 'object' && !(descriptor instanceof Float32Array)) {
                            descriptor = new Float32Array(Object.values(descriptor));
                        }
                        
                        this.knownFaces.set(emp.code, {
                            name: emp.name,
                            descriptor: descriptor
                        });
                    }
                });

                console.log(`✅ Loaded ${this.knownFaces.size} known faces`);
            }

        } catch (error) {
            console.error('Error loading known faces:', error);
        }
    }

    // ============================================
    // 📸 PHOTO CAPTURE
    // ============================================

    /**
     * Capture photo from current video stream
     * @param {HTMLVideoElement} video - Video element
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {object} Photo data with base64 and metadata
     */
    capturePhoto(video, canvas) {
        if (!video || !canvas) {
            throw new Error('Video or canvas element not provided');
        }

        // Set canvas size to match video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64
        const base64 = canvas.toDataURL('image/jpeg', 0.8);

        return {
            base64: base64,
            width: canvas.width,
            height: canvas.height,
            timestamp: new Date().toISOString(),
            format: 'jpeg'
        };
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================

    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current status/info about the recognition system
     * @returns {object} Status object
     */
    getStatus() {
        return {
            modelsLoaded: this.modelsLoaded,
            isCameraActive: this.isCameraActive,
            knownFacesCount: this.knownFaces.size,
            hasError: !!this.loadError,
            errorMessage: this.loadError,
            usedBackupCdn: this.usedBackupCdn
        };
    }

    /**
     * Reset recognition state
     */
    reset() {
        this.stopCamera();
        this.stopDetection();
        this.knownFaces.clear();
        this.recognizedFace = null;
        this.modelsLoaded = false;
        this.loadError = null;
        this.loadingAttempted = false;
        this.usedBackupCdn = false;
        
        console.log('🔄 Face recognition state reset');
    }
}

// ============================================
// 🌍 GLOBAL INSTANCE
// ============================================

/**
 * Global face recognition instance
 * Created when script loads
 */
let faceRecognition;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    faceRecognition = new FaceRecognitionManager();
    
    // Don't auto-init here - let app.init() control initialization order
    console.log('🎭 Face Recognition module loaded');
});

console.log('📷 face-recognition.js v4.1 loaded successfully');
