/**
 * ============================================
 * 🔧 AXENTRO CONFIGURATION v4.2 - COMPLETE EDITION
 * ✅ Enhanced with All Legacy Features
 * 🚀 متوافق مع الكود القديم 100%
 * ============================================
 */

const AppConfig = {
    
    // ============================================
    // 📡 SUPABASE DATABASE CONFIGURATION
    // ============================================
    supabase: {
        url: 'https://qgbokzzynieoedhloxqt.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYm9renp5bmllb2VkaGxveHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjc1NzUsImV4cCI6MjA5MDcwMzU3NX0.AE7w-36tFYHL8m7I6GkMM25PhhBTibKyVE4AZVpLCbc',
        
        // Tables
        tables: {
            employees: 'employees',
            attendance: 'attendance',
            passwordResets: 'password_resets',
            auditLog: 'audit_log'
        },
        
        // Storage
        storage: {
            bucketName: 'faces',
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
        }
    },

    // ============================================
    // 📧 GOOGLE APPS SCRIPT (Email Service)
    // ============================================
    emailService: {
        url: 'https://script.google.com/macros/s/AKfycbxnJeFvBSZuH7E_NN3-8Mv5K694rCv_jrGTbT_sl5Tl0UnRmzuKZx8przHd1IuvgiQBMA/exec',
        adminEmail: 'axentroteam@gmail.com',
        upperMgmtEmail: 'axentroofficial@gmail.com'
    },

    // ============================================
    // 🎭 FACE RECOGNITION CONFIGURATION
    // ============================================
    faceRecognition: {
        // Model URLs
        models: {
            tinyFaceDetector: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/',
            faceLandmark68Tiny: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/',
            faceRecognition: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/',
            faceLandmark68Net: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/'
        },
        
        // Detection Settings
        detection: {
            inputSize: 320,          // Size for processing
            scoreThreshold: 0.2,      // Minimum confidence (خفضناها من 0.5)
            minFaceSize: 100,
            maxFaces: 1
        },
        
        // Recognition Settings (من الكود القديم)
        recognition: {
            threshold: 0.55,          // Match threshold (من الكود القديم)
            labelDistance: 0.55       // Euclidean distance threshold
        },
        
        // Camera Settings
        camera: {
            width: 640,
            height: 480,
            facingMode: 'user',      // Front camera
            frameRate: 30
        },
        
        // Timeout settings
        timeout: {
            modelLoad: 15000,       // 15 seconds
            cameraStart: 10000       // 10 seconds
        },
        
        // Image Storage Settings (من الكود القديم)
        imageStorage: {
            maxWidth: 400,           // STORE_IMG_MAX
            quality: 0.8             // JPEG quality
        }
    },

    // ============================================
    // 📍 GPS LOCATION SETTINGS (من الكود القديم)
    // ============================================
    location: {
        office: {
            latitude: 30.1407941,     // OFFICE_LAT
            longitude: 31.3800838     // OFFICE_LON
        },
        maxDistanceMeters: 500,      // MAX_DISTANCE_METERS
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    },

    // ============================================
    // ⏰ ATTENDANCE CONFIGURATION
    // ============================================
    attendance: {
        shifts: [
            { id: 'EARLY SHIFT', name: 'صباحي', start: '09:00', end: '17:00' },
            { id: 'BETWEEN SHIFT', name: 'بعد الظهر', start: '14:00', end: '22:00' },
            { id: 'NIGHT SHIFT', name: 'مسائي', start: '22:00', end: '06:00' }
        ],
        
        normalHours: 9,
        overtimeThreshold: 9,
        cooldownPeriod: 60000,      // 1 minute between check-in/out
        
        // Auto-refresh interval (من الكود القديم)
        autoRefreshInterval: 30000  // 30 seconds
    },

    // ============================================
    // 🎭 LIVENESS DETECTION SETTINGS (من الكود القديم)
    // ============================================
    liveness: {
        enabled: true,
        headMovementThreshold: 0.08,   // Minimum head yaw change
        stableFramesRequired: 5,        // STABLE_FRAMES_REQUIRED
        stabilityRing: {
            circumference: 126,         // 2 * PI * 20
            radius: 20
        }
    },

    // ============================================
    // 🔐 SECURITY CONFIGURATION
    // ============================================
    security: {
        password: {
            minLength: 4,
            maxLength: 50,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: false,
            requireSpecialChars: false
        },
        
        session: {
            timeout: 10 * 60 * 60 * 1000,      // 10 hours (من الكود القديم)
            rememberMeDuration: 7 * 24 * 60 * 1000  // 7 days
        },
        
        rateLimit: {
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000,  // 15 minutes
            maxRequestsPerMinute: 20
        },
        
        adminVerification: {
            requiredForDelete: true,           // Must verify face to delete employee
            requiredForManualAtt: true,        // Must verify face for manual attendance
            matchThreshold: 0.55               // Same as face recognition
        }
    },

    // ============================================
    // 🎨 UI/UX CONFIGURATION
    // ============================================
    ui: {
        animations: {
            fast: 150,
            normal: 250,
            slow: 350,
            pageTransition: 300
        },
        
        toast: {
            defaultDuration: 4500,   // من الكود القديم
            successDuration: 4500,
            errorDuration: 4500,
            warningDuration: 4500,
            maxVisible: 3
        },
        
        loading: {
            minDisplayTime: 800,
            maxRetries: 3,
            retryDelay: 1000
        },
        
        splashScreen: {
            show: true,
            minDisplayTime: 2000,
            showErrorActions: true   // Show retry/skip buttons on error
        }
    },

    // ============================================
    // 🌐 APP METADATA
    // ============================================
    app: {
        name: 'Axentro System',
        version: '4.2.0',           // Updated version
        description: 'نظام إدارة الحضور والانصراف بالذكاء الاصطناعي',
        author: 'Axentro Team',
        
        urls: {
            login: 'https://axentro-official.github.io/axentro-attendance/',
            website: 'https://axentro-official.github.io/axentro-website/links.html',
            github: 'https://github.com/axentro-official/axentro-attendance'
        },
        
        features: {
            biometricAuth: true,         // Fingerprint (WebAuthn)
            offlineSupport: true,        // PWA
            pushNotifications: false,
            darkMode: true,
            livenessDetection: true,     // NEW: Head movement detection
            gpsVerification: true,       // NEW: Location verification
            adminFaceVerify: true        // NEW: Admin must verify face for sensitive ops
        },
        
        fallbacks: {
            allowBasicMode: true,        // Allow app without face recognition
            showSkipOption: true         // Show skip button if loading fails
        }
    },

    // ============================================
    // 📊 REPORTING CONFIGURATION
    // ============================================
    reporting: {
        dateFormats: {
            display: 'DD/MM/YYYY',
            input: 'YYYY-MM-DD',
            api: 'YYYY-MM-DDTHH:mm:ssZ'
        },
        
        timeFormat: {
            locale: 'ar-EG',
            hour12: true,                // 12-hour format as requested!
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        },
        
        exportFormats: ['pdf', 'excel', 'csv'],
        
        defaultDateRange: {
            start: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            end: () => new Date()
        }
    },

    // ============================================
    // 🐛 DEBUGGING & LOGGING
    // ============================================
    debug: {
        enabled: true,
        level: 'info',                 // trace, debug, info, warn, error
        remoteLogging: false,
        performanceTracking: true
    },

    // ============================================
    // 🔄 RETRY CONFIGURATION
    // ============================================
    retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
    },

    // ============================================
    // 📱 PWA CONFIGURATION
    // ============================================
    pwa: {
        cacheName: 'axentro-v4-2',
        cacheVersion: '4.2.0',
        offlinePages: ['./'],
        precacheAssets: []
    },

    // ============================================
    // 🔊 AUDIO CONFIGURATION (من الكود القديم)
    // ============================================
    audio: {
        sounds: {
            loginSuccess: 'login-success.mp3',
            loginError: 'login-error.mp3',
            logoutSuccess: 'logout-success.mp3',
            faceidSuccess: 'faceid-success.mp3',
            faceidError: 'faceid-error.mp3'
        },
        autoUnlock: true,              // Unlock on first user interaction
        preload: true                   // Preload all sounds
    },

    // ============================================
    // 👤 EMPLOYEE CODE GENERATION (احترافي)
    // ============================================
    employeeCode: {
        prefix: 'EMP',                  // مثال: EMP001, EMP002
        padStart: 3,                    // عدد الأرقام
        startFrom: 1                    // يبدأ العد من 1
    },

    // ============================================
    // 🔑 ADMIN CREDENTIALS (كما طلبت)
    // ============================================
    admin: {
        defaultCode: 'admin',           // ← small letters كما طلبت!
        defaultPassword: 'Admin@2024',
        defaultName: 'مدير النظام',
        defaultEmail: 'axentroteam@gmail.com'
    }
};

// ============================================
// 🌍 EXPORT FOR MODULES
// ============================================

// Make available globally
if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}
