/**
 * ============================================
 * 🔧 AXENTRO CONFIGURATION v4.0
 * ✅ Centralized Configuration Management
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
    // ============================================
    faceRecognition: {
        // Model URLs from CDN
        models: {
            tinyFaceDetector: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
            faceLandmark68Tiny: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
            faceRecognition: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
            ssdMobilenetv1: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
            faceLandmark68: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'
        },
        
        // Detection Settings
        detection: {
            inputSize: 320,          // Size for processing
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
            minLength: 4,
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
        version: '4.0.0',
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
        cacheName: 'axentro-v4',
        cacheVersion: '4.0.0',
        offlinePages: ['./'],
        precacheAssets: []
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
    FACE_MULTIPLE_FACES: { code: 3004, message: 'تم اكتشاف أكثر من وجه' },
    FACE_RECOGNITION_FAILED: { code: 3005, message: 'فشل التعرف على الوجه' },
    FACE_LOW_CONFIDENCE: { code: 3006, message: 'مستوى الثقة منخفض جداً' },
    FACE_MODEL_LOAD_FAILED: { code: 3007, message: 'فشل تحميل نموذج التعرف' },
    
    // Attendance Errors (4000-4999)
    ATTENDANCE_ALREADY_CHECKED_IN: { code: 4001, message: 'تم تسجيل الحضور مسبقاً' },
    ATTENDANCE_ALREADY_CHECKED_OUT: { code: 4002, message: 'تم تسجيل الانصراف مسبقاً' },
    ATTENDANCE_COOLDOWN_ACTIVE: { code: 4003, message: 'يرجى الانتظار قبل المحاولة مجدداً' },
    ATTENDANCE_NO_SHIFT_SELECTED: { code: 4004, message: 'لم يتم اختيار وردية العمل' },
    ATTENDANCE_LOCATION_ERROR: { code: 4005, message: 'خطأ في تحديد الموقع' },
    
    // Network Errors (5000-5999)
    NETWORK_OFFLINE: { code: 5001, message: 'لا يوجد اتصال بالإنترنت' },
    NETWORK_TIMEOUT: { code: 5002, message: 'انتهت مهلة الاتصال' },
    NETWORK_SERVER_ERROR: { code: 5003, message: 'خطأ في الخادم' },
    NETWORK_RATE_LIMIT: { code: 5004, message: 'تجاوزت عدد المحاولات المسموحة' },
    
    // General Errors (9000-9999)
    UNKNOWN_ERROR: { code: 9001, message: 'حدث خطأ غير متوقع' },
    OPERATION_CANCELLED: { code: 9002, message: 'تم إلغاء العملية' },
    PERMISSION_DENIED: { code: 9003, message: 'ليس لديك الصلاحية' }
};

// ============================================
// 📝 SUCCESS MESSAGES
// ============================================
const SuccessMessages = {
    LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح ✅',
    LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح 👋',
    REGISTER_SUCCESS: 'تم إنشاء الحساب بنجاح 🎉',
    PASSWORD_CHANGED: 'تم تغيير كلمة المرور بنجاح 🔒',
    PASSWORD_RESET_SENT: 'تم إرسال كلمة المرور الجديدة 📧',
    
    CHECK_IN_SUCCESS: 'تم تسجيل الحضور بنجاح ✓',
    CHECK_OUT_SUCCESS: 'تم تسجيل الانصراف بنجاح ✓',
    FACE_CAPTURED: 'تم التقاط الوجه بنجاح 📷',
    FACE_RECOGNIZED: 'تم التعرف على الوجه بنجاح ✓',
    
    PROFILE_UPDATED: 'تم تحديث الملف الشخصي ✏️',
    SETTINGS_SAVED: 'تم حفظ الإعدادات ⚙️',
    DATA_EXPORTED: 'تم تصدير البيانات بنجاح 📊',
    
    EMAIL_SENT: 'تم إرسال الإيميل بنجاح 📧',
    NOTIFICATION_SENT: 'تم إرسال الإشعار 🔔'
};

// ============================================
// 🎯 UTILITY CONSTANTS
// ============================================
const Constants = {
    // Regular Expressions
    regex: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        employeeCode: /^[A-Z0-9]{4,10}$/,
        password: /^.{4,50}$/,
        name: /^[\u0600-\u06FFa-zA-Z\s]{3,100}$/,
        phone: /^01[0-9]{9}$/
    },
    
    // Time Constants
    time: {
        SECOND: 1000,
        MINUTE: 60 * 1000,
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000,
        WEEK: 7 * 24 * 60 * 60 * 1000
    },
    
    // Local Storage Keys
    storageKeys: {
        USER_SESSION: 'axentro_user_session',
        REMEMBER_ME: 'axentro_remember_me',
        SETTINGS: 'axentro_settings',
        OFFLINE_QUEUE: 'axentro_offline_queue',
        LAST_ACTIVITY: 'axentro_last_activity',
        CSRF_TOKEN: 'axentro_csrf_token'
    },
    
    // Session Storage Keys
    sessionKeys: {
        TEMP_FACE_DESCRIPTOR: 'temp_face_descriptor',
        LOGIN_ATTEMPTS: 'login_attempts',
        LOCKOUT_UNTIL: 'lockout_until'
    }
};

// Freeze objects to prevent modification
Object.freeze(AppConfig);
Object.freeze(ErrorCodes);
Object.freeze(SuccessMessages);
Object.freeze(Constants);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppConfig, ErrorCodes, SuccessMessages, Constants };
}
