/**
 * ============================================
 * 🔧 AXENTRO CONFIGURATION v4.1 - OPTIMIZED
 * ✅ Centralized Configuration Management
 * 🚀 مع تحسينات الأداء وإصلاح مشاكل التحميل
 * ============================================
 */

const AppConfig = {
    // ============================================
    // 📡 API & SUPABASE CONFIGURATION
    // ============================================
    supabase: {
        url: 'https://qgbokzzynieoedhloxqt.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYm9renp5bmllb2VkaGxveHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjc1NzUsImV4cCI6MjA5MDcwMzU3NX0.AE7w-36tFYHL8m7I6GkMM25PhhBTibKyVE4AZVpLCbc',
        
        // Tables
        tables: {
            employees: 'employees',
            attendance: 'attendance',
            passwordResets: 'password_resets',
            auditLog: 'audit_log',
            rateLimits: 'rate_limits'
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
    // ⚡ محسّن مع CDN Alternatives وFallbacks
    // ============================================
    faceRecognition: {
        // 🔥 PRIMARY CDN URLs (jsdelivr - Fast & Reliable)
        models: {
            tinyFaceDetector: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
            faceLandmark68Tiny: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
            faceRecognition: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
            ssdMobilenetv1: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
            faceLandmark68: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
            faceExpression: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights' // Optional
        },

        // 🔄 BACKUP CDN URLs (unpkg) - If primary fails
        backupModels: {
            tinyFaceDetector: 'https://unpkg.com/face-api.js@0.22.2/weights',
            faceLandmark68Tiny: 'https://unpkg.com/face-api.js@0.22.2/weights',
            faceRecognition: 'https://unpkg.com/face-api.js@0.22.2/weights',
            ssdMobilenetv1: 'https://unpkg.com/face-api.js@0.22.2/weights',
            faceLandmark68: 'https://unpkg.com/face-api.js@0.22.2/weights'
        },
        
        // Detection Settings
        detection: {
            inputSize: 320,          // Size for processing (reduced from 416 for speed)
            scoreThreshold: 0.5,     // Minimum confidence score
            minFaceSize: 100,        // Minimum face size in pixels
            maxFaces: 1              // Maximum faces to detect
        },
        
        // Recognition Settings
        recognition: {
            threshold: 0.6,          // Match threshold (0-1)
            labelDistance: 0.6       // Euclidean distance threshold
        },
        
        // Camera Settings
        camera: {
            width: 640,
            height: 480,
            facingMode: 'user',      // Front camera
            frameRate: 30
        },

        // ⏱️ Timeout settings
        timeout: {
            modelLoad: 15000,       // 15 seconds max for model loading
            cameraStart: 10000      // 10 seconds for camera permission
        }
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
        
        normalHours: 9,             // Normal working hours
        overtimeThreshold: 9,       // Hours before overtime kicks in
        
        // Cooldown between check-in/out (milliseconds)
        cooldownPeriod: 60000,      // 1 minute
        
        // Location settings
        location: {
            enableGeolocation: true,
            accuracyThreshold: 100   // meters
        }
    },

    // ============================================
    // 🔐 SECURITY CONFIGURATION
    // ============================================
    security: {
        // Password requirements
        password: {
            minLength: 4,           // ⚠️ Consider increasing to 8 in production!
            maxLength: 50,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: false,
            requireSpecialChars: false
        },
        
        // Session management
        session: {
            timeout: 24 * 60 * 60 * 1000,  // 24 hours in ms
            rememberMeDuration: 7 * 24 * 60 * 60 * 1000  // 7 days if "remember me"
        },
        
        // Rate limiting
        rateLimit: {
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000,  // 15 minutes
            maxRequestsPerMinute: 20
        },
        
        // Token configuration
        token: {
            resetExpiry: 24 * 60 * 60 * 1000  // 24 hours
        }
    },

    // ============================================
    // 🎨 UI/UX CONFIGURATION
    // ============================================
    ui: {
        // Animation durations (ms)
        animations: {
            fast: 150,
            normal: 250,
            slow: 350,
            pageTransition: 300
        },
        
        // Toast notifications
        toast: {
            defaultDuration: 4000,   // 4 seconds
            successDuration: 3000,
            errorDuration: 5000,
            warningDuration: 4000,
            maxVisible: 3
        },
        
        // Loading states
        loading: {
            minDisplayTime: 800,     // Min time to show loading
            maxRetries: 3,
            retryDelay: 1000
        },
        
        // Pagination
        pagination: {
            defaultPageSize: 20,
            maxPageSize: 100
        }
    },

    // ============================================
    // 🌐 APP METADATA
    // ============================================
    app: {
        name: 'Axentro System',
        version: '4.1.0',           // Updated version
        description: 'نظام إدارة الحضور والانصراف بالذكاء الاصطناعي',
        author: 'Axentro Team',
        
        // URLs
        urls: {
            login: 'https://axentro-official.github.io/axentro-attendance/',
            website: 'https://axentro-official.github.io/axentro-website/links.html',
            github: 'https://github.com/axentro-official/axentro-attendance'
        },
        
        // Features flags
        features: {
            biometricAuth: true,         // Fingerprint auth
            offlineSupport: true,        // PWA & offline queue
            pushNotifications: false,    // Future feature
            darkMode: true               // Default theme
        },

        // 🔥 NEW: Feature flags for graceful degradation
        fallbacks: {
            allowBasicMode: true,       // Allow app to work without face recognition
            showSkipOption: true,       // Show "skip" button if loading fails
            cacheModels: false          // Cache models in localStorage (future)
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
        
        exportFormats: ['pdf', 'excel', 'csv'],
        
        defaultDateRange: {
            start: () => {
                const today = new Date();
                return new Date(today.getFullYear(), today.getMonth(), 1); // First of month
            },
            end: () => new Date() // Today
        }
    },

    // ============================================
    // 🐛 DEBUGGING & LOGGING
    // ============================================
    debug: {
        enabled: true,                  // Enable console logs
        level: 'info',                 // trace, debug, info, warn, error
        remoteLogging: false,           // Send errors to server
        performanceTracking: true       // Track operation times
    },

    // ============================================
    // 🔄 RETRY CONFIGURATION
    // ============================================
    retry: {
        maxAttempts: 3,
        baseDelay: 1000,               // 1 second
        maxDelay: 10000,               // 10 seconds
        backoffMultiplier: 2           // Exponential backoff
    },

    // ============================================
    // 📱 PWA CONFIGURATION
    // ============================================
    pwa: {
        cacheName: 'axentro-v4-1',
        cacheVersion: '4.1.0',
        offlinePages: ['./'],
        precacheAssets: []
    },

    // ============================================
    // 🌍 INTERNATIONALization (i18n)
    // ============================================
    i18n: {
        defaultLocale: 'ar',
        supportedLocales: ['ar', 'en'],
        rtl: true                      // Right-to-left layout
    }
};

// ============================================
// 🛡️ ERROR CODES DICTIONARY
// ============================================
const ErrorCodes = {
    // Auth Errors (1000-1999)
    AUTH_INVALID_CREDENTIALS: { code: 1001, message: 'بيانات الدخول غير صحيحة' },
    AUTH_USER_NOT_FOUND: { code: 1002, message: 'المستخدم غير موجود' },
    AUTH_ACCOUNT_LOCKED: { code: 1003, message: 'الحساب مغلق مؤقتاً - حاول لاحقاً' },
    AUTH_SESSION_EXPIRED: { code: 1004, message: 'انتهت الجلسة - يرجى تسجيل الدخول مجدداً' },
    AUTH_PASSWORD_CHANGE_REQUIRED: { code: 1005, message: 'يجب تغيير كلمة المرور' },
    
    // Validation Errors (2000-2999)
    VALIDATION_REQUIRED_FIELD: { code: 2001, message: 'هذا الحقل مطلوب' },
    VALIDATION_INVALID_EMAIL: { code: 2002, message: 'بريد إلكتروني غير صالح' },
    VALIDATION_INVALID_CODE: { code: 2003, message: 'كود الموظف غير صالح' },
    VALIDATION_WEAK_PASSWORD: { code: 2004, message: 'كلمة مرور ضعيفة جداً' },
    VALIDATION_PASSWORD_MISMATCH: { code: 2005, message: 'كلمات المرور غير متطابقة' },
    
    // Face Recognition Errors (3000-3999)
    FACE_NO_CAMERA: { code: 3001, message: 'لم يتم العثور على كاميرا' },
    FACE_CAMERA_PERMISSION_DENIED: { code: 3002, message: 'تم رفض إذن الكاميرا' },
    FACE_NO_FACE_DETECTED: { code: 3003, message: 'لم يتم اكتشاف وجه' },
    FACE_MODEL_LOAD_FAILED: { code: 3004, message: 'فشل تحميل نماذج التعرف على الوجوه' },
    FACE_MATCH_FAILED: { code: 3005, message: 'لا يوجد تطابق للوجه' },
    
    // Attendance Errors (4000-4999)
    ATTENDANCE_COOLDOWN_ACTIVE: { code: 4001, message: 'يرجى الانتظار قبل تسجيل عملية جديدة' },
    ATTENDANCE_ALREADY_CHECKED_IN: { code: 4002, message: 'تم تسجيل الحضور مسبقاً' },
    ATTENDANCE_ALREADY_CHECKED_OUT: { code: 4003, message: 'تم تسجيل الانصراف مسبقاً' },
    ATTENDANCE_NO_SHIFT_SELECTED: { code: 4004, message: 'يرجى اختيار وردية العمل' },
    
    // Database Errors (5000-5999)
    DB_CONNECTION_ERROR: { code: 5001, message: 'فشل الاتصال بقاعدة البيانات' },
    DB_QUERY_ERROR: { code: 5002, message: 'حدث خطأ في استعلام البيانات' },
    DB_INSERT_ERROR: { code: 5003, message: 'فشل حفظ البيانات' },
    
    // Network Errors (6000-6999)
    NETWORK_OFFLINE: { code: 6001, message: 'لا يوجد اتصال بالإنترنت' },
    NETWORK_TIMEOUT: { code: 6002, message: 'تجاوز وقت الانتظار' },
    NETWORK_SERVER_ERROR: { code: 6003, message: 'خطأ في الخادم' },
    
    // System Errors (7000-7999)
    UNKNOWN_ERROR: { code: 7001, message: 'حدث خطأ غير متوقع' },
    INITIALIZATION_FAILED: { code: 7002, message: 'فشل تهيئة النظام' },
    FEATURE_NOT_AVAILABLE: { code: 7003, message: 'هذه الميزة غير متوفرة حالياً' }
};

// ============================================
// ✅ SUCCESS MESSAGES
// ============================================
const SuccessMessages = {
    LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح ✓',
    LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح',
    REGISTER_SUCCESS: 'تم إنشاء الحساب بنجاح ✓',
    CHECK_IN_SUCCESS: '✅ تم تسجيل الحضور بنجاح',
    CHECK_OUT_SUCCESS: '✅ تم تسجيل الانصراف بنجاح',
    PASSWORD_CHANGED: 'تم تغيير كلمة المرور بنجاح',
    PASSWORD_RESET_SENT: 'تم إرسال كلمة المرور الجديدة إلى بريدك',
    DATA_SAVED: 'تم حفظ البيانات بنجاح',
    FACE_CAPTURED: '✓ تم التقاط الوجه بنجاح'
};

// ============================================
// 🎨 CONSTANTS
// ============================================
const Constants = {
    storageKeys: {
        USER_SESSION: 'axentro_user_session',
        REMEMBER_ME: 'axentro_remember_me',
        USER_SETTINGS: 'axentro_user_settings',
        LAST_ACTIVITY: 'axentro_last_activity',
        TEMP_FACE_DESCRIPTOR: 'axentro_temp_face_descriptor',
        OFFLINE_QUEUE: 'axentro_offline_queue'
    },
    
    sessionKeys: {
        CURRENT_USER: 'current_user',
        CSRF_TOKEN: 'csrf_token'
    },
    
    events: {
        LOGIN_SUCCESS: 'login_success',
        LOGOUT: 'logout',
        SESSION_EXPIRED: 'session_expired',
        ATTENDANCE_RECORDED: 'attendance_recorded'
    }
};

console.log(`⚙️ Config v${AppConfig.app.version} loaded successfully`);
