/**
 * ============================================
 * 🔧 AXENTRO CONFIGURATION v4.1 - ENHANCED
 * ✅ Added office location, face recognition thresholds, QR settings
 * ============================================
 */

const AppConfig = {
    // ============================================
    // 📡 API & SUPABASE CONFIGURATION
    // ============================================
    supabase: {
        url: 'https://qgbokzzynieoedhloxqt.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYm9renp5bmllb2VkaGxveHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjc1NzUsImV4cCI6MjA5MDcwMzU3NX0.AE7w-36tFYHL8m7I6GkMM25PhhBTibKyVE4AZVpLCbc',
        tables: {
            employees: 'employees',
            attendance: 'attendance',
            passwordResets: 'password_resets',
            auditLog: 'audit_log'
        },
        storage: {
            bucketName: 'faces',
            maxFileSize: 5 * 1024 * 1024,
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
        models: {
            tinyFaceDetector: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
            faceLandmark68Tiny: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
            faceRecognition: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
            ssdMobilenetv1: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
            faceLandmark68: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights'
        },
        backupModels: {
            tinyFaceDetector: 'https://unpkg.com/face-api.js@0.22.2/weights',
            faceLandmark68Tiny: 'https://unpkg.com/face-api.js@0.22.2/weights',
            faceRecognition: 'https://unpkg.com/face-api.js@0.22.2/weights'
        },
        detection: {
            inputSize: 320,
            scoreThreshold: 0.5,
            minFaceSize: 100,
            maxFaces: 1
        },
        recognition: {
            threshold: 0.55,          // MATCH_THRESHOLD
            labelDistance: 0.6
        },
        camera: {
            width: 640,
            height: 480,
            facingMode: 'user',
            frameRate: 30
        },
        timeout: {
            modelLoad: 15000,
            cameraStart: 10000
        },
        // NEW: stability and liveness
        stableFramesRequired: 5,      // STABLE_FRAMES_REQUIRED
        livenessEnabled: true
    },

    // ============================================
    // 📍 OFFICE LOCATION (for geofencing)
    // ============================================
    office: {
        lat: 30.1407941,
        lng: 31.3800838,
        maxDistanceMeters: 500
    },

    // ============================================
    // ⏰ ATTENDANCE CONFIGURATION
    // ============================================
    attendance: {
        shifts: [
            { id: 'EARLY SHIFT', name: 'صباحي', start: '09:00', end: '17:00', ar: 'صباحي (9ص - 5م)' },
            { id: 'BETWEEN SHIFT', name: 'بعد الظهر', start: '14:00', end: '22:00', ar: 'بعد الظهر (2م - 10م)' },
            { id: 'NIGHT SHIFT', name: 'مسائي', start: '22:00', end: '06:00', ar: 'مسائي (10م - 6ص)' }
        ],
        normalHours: 9,
        overtimeThreshold: 9,
        cooldownPeriod: 60000,      // 1 minute
        location: {
            enableGeolocation: true,
            accuracyThreshold: 100
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
            requireNumbers: false,
            requireSpecialChars: false
        },
        session: {
            timeout: 24 * 60 * 60 * 1000,      // 24 hours
            rememberMeDuration: 7 * 24 * 60 * 60 * 1000   // 7 days
        },
        rateLimit: {
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000
        }
    },

    // ============================================
    // 🎨 UI/UX CONFIGURATION
    // ============================================
    ui: {
        animations: { fast: 150, normal: 250, slow: 350, pageTransition: 300 },
        toast: {
            defaultDuration: 4000,
            successDuration: 3000,
            errorDuration: 5000,
            warningDuration: 4000,
            maxVisible: 3
        },
        loading: { minDisplayTime: 800, maxRetries: 3, retryDelay: 1000 }
    },

    // ============================================
    // 🌐 APP METADATA
    // ============================================
    app: {
        name: 'Axentro System',
        version: '4.1.0',
        description: 'نظام إدارة الحضور والانصراف بالذكاء الاصطناعي',
        author: 'Axentro Team',
        urls: {
            login: 'https://axentro-official.github.io/axentro-attendance/',
            website: 'https://axentro-official.github.io/axentro-website/links.html',
            github: 'https://github.com/axentro-official/axentro-attendance'
        },
        features: {
            biometricAuth: true,
            offlineSupport: true,
            pushNotifications: false,
            darkMode: true
        },
        fallbacks: {
            allowBasicMode: true,
            showSkipOption: true
        }
    },

    // ============================================
    // 📊 QR CODE (dynamic)
    // ============================================
    qr: {
        apiUrl: 'https://api.qrserver.com/v1/create-qr-code/',
        size: 80,
        dataUrl: 'https://axentro-official.github.io/axentro-website/links.html'
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

    debug: {
        enabled: true,
        level: 'info',
        remoteLogging: false,
        performanceTracking: true
    }
};

// ============================================
// 🛡️ ERROR CODES DICTIONARY
// ============================================
const ErrorCodes = {
    AUTH_INVALID_CREDENTIALS: { code: 1001, message: 'بيانات الدخول غير صحيحة' },
    AUTH_USER_NOT_FOUND: { code: 1002, message: 'المستخدم غير موجود' },
    AUTH_ACCOUNT_LOCKED: { code: 1003, message: 'الحساب مغلق مؤقتاً' },
    AUTH_SESSION_EXPIRED: { code: 1004, message: 'انتهت الجلسة - يرجى تسجيل الدخول مجدداً' },
    VALIDATION_REQUIRED_FIELD: { code: 2001, message: 'هذا الحقل مطلوب' },
    VALIDATION_INVALID_EMAIL: { code: 2002, message: 'بريد إلكتروني غير صالح' },
    VALIDATION_INVALID_CODE: { code: 2003, message: 'كود الموظف غير صالح' },
    VALIDATION_WEAK_PASSWORD: { code: 2004, message: 'كلمة مرور ضعيفة' },
    FACE_NO_CAMERA: { code: 3001, message: 'لم يتم العثور على كاميرا' },
    FACE_CAMERA_PERMISSION_DENIED: { code: 3002, message: 'تم رفض إذن الكاميرا' },
    FACE_NO_FACE_DETECTED: { code: 3003, message: 'لم يتم اكتشاف وجه' },
    FACE_MODEL_LOAD_FAILED: { code: 3004, message: 'فشل تحميل نماذج التعرف' },
    FACE_MATCH_FAILED: { code: 3005, message: 'الوجه غير مطابق' },
    ATTENDANCE_COOLDOWN_ACTIVE: { code: 4001, message: 'يرجى الانتظار قليلاً قبل المحاولة مرة أخرى' },
    ATTENDANCE_ALREADY_CHECKED_IN: { code: 4002, message: 'تم تسجيل الحضور مسبقاً' },
    ATTENDANCE_ALREADY_CHECKED_OUT: { code: 4003, message: 'تم تسجيل الانصراف مسبقاً' },
    ATTENDANCE_NO_SHIFT_SELECTED: { code: 4004, message: 'يرجى اختيار الوردية' },
    ATTENDANCE_OUT_OF_RANGE: { code: 4005, message: 'أنت خارج نطاق المقر المسموح (500 متر)' },
    DB_CONNECTION_ERROR: { code: 5001, message: 'فشل الاتصال بقاعدة البيانات' },
    NETWORK_OFFLINE: { code: 6001, message: 'لا يوجد اتصال بالإنترنت' },
    UNKNOWN_ERROR: { code: 7001, message: 'حدث خطأ غير متوقع' }
};

const SuccessMessages = {
    LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح ✓',
    LOGOUT_SUCCESS: 'تم تسجيل الخروج',
    REGISTER_SUCCESS: 'تم إنشاء الحساب بنجاح ✓',
    CHECK_IN_SUCCESS: '✅ تم تسجيل الحضور بنجاح',
    CHECK_OUT_SUCCESS: '✅ تم تسجيل الانصراف بنجاح',
    PASSWORD_CHANGED: 'تم تغيير كلمة المرور بنجاح',
    PASSWORD_RESET_SENT: 'تم إرسال كلمة المرور الجديدة إلى بريدك',
    FACE_CAPTURED: '✓ تم التقاط الوجه بنجاح'
};

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
        CURRENT_USER: 'current_user'
    }
};

console.log(`⚙️ Config v${AppConfig.app.version} loaded`);
