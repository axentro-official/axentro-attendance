/**
 * ============================================
 * 📷 AXENTRO FACE RECOGNITION v4.0
 * ✅ AI-Powered Face Detection & Recognition
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
        
        this.init();
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
            // Load face-api.js models
            await this.loadModels();
            
            // Setup camera elements
            this.setupCameraElements();
            
            console.log('✅ Face Recognition System Ready');
            
        } catch (error) {
            console.error('❌ Face Recognition Init Error:', error);
            ui.showError('فشل تحميل نظام التعرف على الوجوه');
        }
    }

    /**
     * Load required neural network models
     */
    async loadModels() {
        if (this.modelsLoaded) return;

        const statusEl = document.getElementById('loadStatus');
        const progressEl = document.getElementById('loadProgress');

        try {
            // Update status
            if (statusEl) statusEl.textContent = 'جاري تحميل نماذج الذكاء الاصطناعي...';
            
            // Load models sequentially with progress updates
            const models = [
                { name: 'tinyFaceDetector', url: this.config.models.tinyFaceDetector, progress: 20 },
                { name: 'faceLandmark68Tiny', url: this.config.models.faceLandmark68Tiny, progress: 40 },
                { name: 'faceRecognition', url: this.config.models.faceRecognition, progress: 70 },
                { name: 'faceExpression', url: null, progress: 85 } // Optional
            ];

            for (const model of models) {
                if (model.url && faceapi.nets[model.name]) {
                    console.log(`Loading model: ${model.name}`);
                    await faceapi.nets[model.name].loadFromUri(model.url);
                    
                    if (progressEl) progressEl.style.width = `${model.progress}%`;
                    await Utils.sleep(200); // Small delay for UI update
                }
            }

            this.modelsLoaded = true;
            
            if (progressEl) progressEl.style.width = '100%';
            if (statusEl) statusEl.textContent = 'تم تحميل النماذج بنجاح ✓';

        } catch (error) {
            console.error('Model loading error:', error);
            throw new Error(ErrorCodes.FACE_MODEL_LOAD_FAILED.message);
        }
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
    }

    // ============================================
    // 📹 CAMERA OPERATIONS
    // ============================================

    /**
     * Start camera stream
     * @param {HTMLVideoElement} videoElement - Video element to use
     * @param {object} options - Camera options
     * @returns {Promise<MediaStream>} Camera stream
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

            // Request permission and get stream
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Attach to video element
            if (videoElement) {
                videoElement.srcObject = stream;
                await videoElement.play();
                
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
     * Switch between front/back camera
     */
    async switchCamera() {
        if (!this.isCameraActive || !this.currentVideoElement) return;

        const currentFacingMode = this.lastFacingMode || 'user';
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        try {
            ui.showInfo('جاري تبديل الكاميرا...');
            
            await this.startCamera(this.currentVideoElement, { 
                facingMode: newFacingMode 
            });
            
            this.lastFacingMode = newFacingMode;
            
            ui.showSuccess('تم تبديل الكاميرا ✓');
            
        } catch (error) {
            ui.showError('فشل تبديل الكاميرا');
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
                userMessage = ErrorCodes.FACE_NO_CAMERA.message;
        }

        ui.showError(userMessage);
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
            ui.showError(ErrorCodes.FACE_MODEL_LOAD_FAILED.message);
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
                console.error('Detection error:', error);
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
     * @returns {Promise<Array>} Array of detections
     */
    async detectFaces(video, displaySize) {
        if (!video || !this.modelsLoaded) return [];

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
        if (!canvas || !detections.length) return;

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
        });
    }

    // ============================================
    // 🎯 FACE RECOGNITION
    // ============================================

    /**
     * Capture face descriptor from current video frame
     * @param {HTMLVideoElement} video - Video element
     * @returns {Promise<object|null>} Face descriptor or null
     */
    async captureFaceDescriptor(video) {
        if (!video || !this.modelsLoaded) {
            throw new Error(ErrorCodes.FACE_MODEL_LOAD_FAILED.message);
        }

        try {
            // Detect face with descriptor
            const detection = await faceapi
                .detectSingleFace(
                    video, 
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: this.config.detection.inputSize,
                        scoreThreshold: this.config.detection.scoreThreshold
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                throw new Error(ErrorCodes.FACE_NO_FACE_DETECTED.message);
            }

            // Extract descriptor as array
            const descriptor = Array.from(detection.descriptor);

            return {
                descriptor,
                detection: detection.detection,
                landmarks: detection.landmarks,
                confidence: detection.detection.score,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Capture descriptor error:', error);
            throw error;
        }
    }

    /**
     * Recognize face against known faces database
     * @param {Array} descriptor - Face descriptor array
     * @returns {Promise<object|null>} Recognition result or null
     */
    async recognizeFace(descriptor) {
        if (!descriptor || this.knownFaces.size === 0) {
            return null;
        }

        try {
            let bestMatch = null;
            let bestDistance = Infinity;

            // Compare against all known faces
            for (const [code, faceData] of this.knownFaces) {
                const distance = faceapi.euclideanDistance(
                    descriptor, 
                    faceData.descriptor
                );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = {
                        code: faceData.code,
                        name: faceData.name,
                        distance: distance,
                        confidence: 1 - distance, // Convert distance to confidence
                        imageData: faceData.imageData
                    };
                }
            }

            // Check if match is above threshold
            if (bestMatch && bestMatch.distance <= this.config.recognition.labelDistance) {
                const isHighConfidence = bestMatch.confidence >= this.config.recognition.threshold;
                
                return {
                    ...bestMatch,
                    recognized: isHighConfidence,
                    message: isHighConfidence 
                        ? `تم التعرف على: ${bestMatch.name}` 
                        : `قد يكون: ${bestMatch.name} (ثقة منخفضة)`
                };
            }

            return null;

        } catch (error) {
            console.error('Recognition error:', error);
            return null;
        }
    }

    /**
     * Load known faces from database
     */
    async loadKnownFaces() {
        try {
            const employees = await db.getAllEmployees();
            
            this.knownFaces.clear();
            
            employees.forEach(emp => {
                if (emp.face_descriptor && emp.code !== 'ADMIN') {
                    this.knownFaces.set(emp.code, {
                        code: emp.code,
                        name: emp.name,
                        descriptor: typeof emp.face_descriptor === 'string' 
                            ? JSON.parse(emp.face_descriptor)
                            : emp.face_descriptor,
                        imageData: emp.profile_image_url
                    });
                }
            });

            console.log(`✅ Loaded ${this.knownFaces.size} known faces`);

        } catch (error) {
            console.error('Load known faces error:', error);
        }
    }

    /**
     * Add face to known faces database
     * @param {string} code - Employee code
     * @param {string} name - Employee name
     * @param {Array} descriptor - Face descriptor
     * @param {string} [imageData] - Optional image data URL
     */
    addKnownFace(code, name, descriptor, imageData = null) {
        this.knownFaces.set(code, {
            code,
            name,
            descriptor,
            imageData
        });
        
        console.log(`➕ Added face: ${name} (${code})`);
    }

    /**
     * Remove face from known faces
     * @param {string} code - Employee code
     */
    removeKnownFace(code) {
        this.knownFaces.delete(code);
        console.log(`➖ Removed face: ${code}`);
    }

    // ============================================
    // 📸 CAPTURE OPERATIONS
    // ============================================

    /**
     * Capture photo from video
     * @param {HTMLVideoElement} video - Video element
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {object} Captured image data
     */
    capturePhoto(video, canvas) {
        if (!video || !canvas) {
            throw new Error('Video or canvas element not found');
        }

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        const ctx = canvas.getContext('2d');
        
        // Mirror the image (selfie mode)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Get base64 image
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);

        return {
            base64: base64Image,
            width: canvas.width,
            height: canvas.height,
            timestamp: Date.now()
        };
    }

    /**
     * Handle face capture for registration
     * @param {Event} e - Click event
     */
    async handleRegistrationCapture(e) {
        try {
            if (!this.isCameraActive) {
                ui.showWarning('يرجى تشغيل الكاميرا أولاً');
                return;
            }

            ui.showButtonLoading(e.target, 'جاري التقاط الوجه...');

            // Capture photo
            const photo = this.capturePhoto(this.registerVideo, this.registerCanvas);
            
            // Get face descriptor
            const faceData = await this.captureFaceDescriptor(this.registerVideo);

            // Save to session for registration form submission
            Utils.saveToSession(Constants.sessionKeys.TEMP_FACE_DESCRIPTOR, faceData.descriptor);

            // Show preview
            const previewImg = document.getElementById('capturedFacePreview');
            const previewContainer = document.getElementById('facePreviewContainer');
            const captureBtn = document.getElementById('captureFaceBtn');

            if (previewImg) {
                previewImg.src = photo.base64;
            }
            if (previewContainer) {
                previewContainer.classList.remove('hidden');
            }
            if (captureBtn) {
                captureBtn.classList.add('hidden');
            }

            // Update UI
            ui.showSuccess(SuccessMessages.FACE_CAPTURED);
            ui.playFaceSuccessFeedback();

            // Stop camera after successful capture
            setTimeout(() => {
                this.stopCamera();
                this.registerVideo.style.display = 'none';
            }, 1000);

        } catch (error) {
            console.error('Registration capture error:', error);
            ui.showError(error.message || ErrorCodes.FACE_NO_FACE_DETECTED.message);
            ui.playFaceErrorFeedback();
        } finally {
            ui.hideButtonLoading(e.target);
        }
    }

    /**
     * Handle face recognition for attendance
     * @returns {Promise<object>} Recognition result
     */
    async recognizeForAttendance() {
        try {
            if (!this.isCameraActive || !this.currentVideoElement) {
                throw new Error(ErrorCodes.FACE_NO_CAMERA.message);
            }

            // Show recognition state
            const overlay = document.getElementById('cameraOverlay');
            const statusText = document.getElementById('cameraStatusText');
            
            if (overlay) overlay.innerHTML = '<div class="face-frame"><i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #3b82f6;"></i><p>جاري التحليل...</p></div>';
            if (statusText) statusText.textContent = 'جاري التحليل...';

            // Capture descriptor
            const faceData = await this.captureFaceDescriptor(this.currentVideoElement);

            // Recognize face
            const result = await this.recognizeFace(faceData.descriptor);

            if (result && result.recognized) {
                // Success!
                this.recognizedFace = result;
                
                ui.playFaceSuccessFeedback();
                
                // Show recognition result
                this.showRecognitionResult(result);
                
                return result;

            } else if (result) {
                // Low confidence match
                ui.showWarning(result.message);
                ui.playFaceErrorFeedback();
                
                return { 
                    ...result, 
                    recognized: false 
                };

            } else {
                // No match found
                throw new Error(ErrorCodes.FACE_RECOGNITION_FAILED.message);
            }

        } catch (error) {
            console.error('Recognition error:', error);
            
            // Reset UI
            const overlay = document.getElementById('cameraOverlay');
            const statusText = document.getElementById('cameraStatusText');
            
            if (overlay) overlay.innerHTML = '<div class="face-frame"><i class="fas fa-user-circle"></i><p>ضع وجهك داخل الإطار</p></div>';
            if (statusText) statusText.textContent = 'لم يتم التعرف على الوجه';

            ui.showError(error.message || ErrorCodes.FACE_RECOGNITION_FAILED.message);
            ui.playFaceErrorFeedback();
            
            throw error;
        }
    }

    /**
     * Display recognition result on screen
     * @param {object} result - Recognition result
     */
    showRecognitionResult(result) {
        const resultContainer = document.getElementById('recognitionResult');
        const recognizedName = document.getElementById('recognizedName');
        const recognizedCode = document.getElementById('recognizedCode');
        const confidenceFill = document.getElementById('confidenceFill');
        const confidenceValue = document.getElementById('confidenceValue');
        const recognizedFaceImg = document.getElementById('recognizedFace');

        if (resultContainer) {
            resultContainer.classList.remove('hidden');
        }

        if (recognizedName) {
            recognizedName.textContent = result.name;
        }

        if (recognizedCode) {
            recognizedCode.textContent = `CODE: ${result.code}`;
        }

        if (confidenceFill) {
            confidenceFill.style.width = `${(result.confidence * 100)}%`;
        }

        if (confidenceValue) {
            confidenceValue.textContent = `${Math.round(result.confidence * 100)}%`;
        }

        if (recognizedFaceImg && result.imageData) {
            recognizedFaceImg.src = result.imageData;
        }

        // Hide camera overlay
        const overlay = document.getElementById('cameraOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Clear recognition result
     */
    clearRecognitionResult() {
        const resultContainer = document.getElementById('recognitionResult');
        const overlay = document.getElementById('cameraOverlay');
        
        if (resultContainer) {
            resultContainer.classList.add('hidden');
        }
        
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.innerHTML = '<div class="face-frame"><i class="fas fa-user-circle"></i><p>ضع وجهك داخل الإطار</p></div>';
        }

        this.recognizedFace = null;
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================

    /**
     * Check if models are loaded
     * @returns {boolean} Models loaded status
     */
    areModelsLoaded() {
        return this.modelsLoaded;
    }

    /**
     * Check if camera is active
     * @returns {boolean} Camera active status
     */
    isCameraRunning() {
        return this.isCameraActive;
    }

    /**
     * Get number of known faces
     * @returns {number} Known faces count
     */
    getKnownFacesCount() {
        return this.knownFaces.size;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopCamera();
        this.stopDetection();
        this.knownFaces.clear();
        this.modelsLoaded = false;
        console.log('🗑️ Face Recognition Manager destroyed');
    }
}

// Create global instance
const faceRecognition = new FaceRecognitionManager();

// Export for use in other modules
window.FaceRecognitionManager = FaceRecognitionManager;
window.faceRecognition = faceRecognition;
