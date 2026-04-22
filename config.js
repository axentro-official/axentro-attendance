/**
 * ============================================
 * 🔧 AXENTRO CONFIGURATION v5.0 - SECURE ADMIN/EMPLOYEE MODE
 * ============================================
 */

const AppConfig = {
    supabase: {
        url: 'https://qgbokzzynieoedhloxqt.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYm9renp5bmllb2VkaGxveHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjc1NzUsImV4cCI6MjA5MDcwMzU3NX0.AE7w-36tFYHL8m7I6GkMM25PhhBTibKyVE4AZVpLCbc',
        tables: {
            admins: 'admins',
            employees: 'employees',
            attendance: 'attendance',
            worksites: 'worksites',
            securityAuditLog: 'security_audit_log'
        },
        storage: {
            bucketName: 'faces',
            maxFileSize: 5 * 1024 * 1024,
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
        },
        rpc: {
            adminLogin: 'admin_login',
            employeeLogin: 'employee_login',
            createEmployee: 'create_employee_secure',
            changeOwnPassword: 'change_own_password_secure',
            adminChangeEmployeePassword: 'admin_change_employee_password_secure',
            recordAttendance: 'record_attendance_secure',
            enrollFace: 'save_face_enrollment_secure',
            getFaceContext: 'get_face_context_secure',
            logout: 'logout_secure',
            requestPasswordReset: 'request_password_reset',
            completePasswordReset: 'complete_password_reset',
            getWorksiteSettings: 'get_worksite_settings_secure',
            saveWorksiteSettings: 'save_worksite_settings_secure',
            listEmployees: 'list_employees_secure',
            getTodayAttendance: 'get_today_attendance_secure',
            getAttendanceByRange: 'get_attendance_by_range_secure',
            updateProfileImage: 'update_profile_image_secure',
            updateAvatarImage: 'update_avatar_image_secure',
            deleteEmployee: 'delete_employee_secure',
            updateEmployee: 'update_employee_secure',
            logSensitiveAction: 'log_sensitive_action'
        }
    },

    emailService: {
        url: 'https://script.google.com/macros/s/AKfycbxnJeFvBSZuH7E_NN3-8Mv5K694rCv_jrGTbT_sl5Tl0UnRmzuKZx8przHd1IuvgiQBMA/exec',
        adminEmail: 'axentroteam@gmail.com',
        upperMgmtEmail: 'axentroofficial@gmail.com'
    },

    faceRecognition: {
        models: {
            baseUrl: './models',
            fallbackUrl: './models'
        },
        detection: {
            inputSize: 416,
            scoreThreshold: 0.52,
            minFaceSize: 96,
            maxFaces: 1
        },
        recognition: {
            threshold: 0.48,
            adminThreshold: 0.45,
            labelDistance: 0.48,
            minSamples: 3
        },
        camera: {
            width: 1280,
            height: 720,
            facingMode: 'user',
            frameRate: 30
        },
        timeout: {
            modelLoad: 12000,
            cameraStart: 10000
        },
        imageStorage: {
            maxWidth: 900,
            quality: 0.96
        },
        antiSpoof: {
            enabled: false,
            requireBlink: true,
            requireTurnLeftRight: true,
            requireNod: true,
            minStableFrames: 4,
            earBlinkThreshold: 0.19,
            minBlinks: 1,
            yawMovementPx: 12,
            pitchMovementPx: 10,
            challengeTimeoutMs: 7000,
            consecutiveSingleFaceFrames: 6
        }
    },

    location: {
        office: {
            latitude: 30.1407941,
            longitude: 31.3800838,
            name: 'المقر الرئيسي'
        },
        maxDistanceMeters: 500,
        maxAccuracyMeters: 50,
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
    },

    attendance: {
        shifts: [
            { id: 'EARLY SHIFT', name: 'صباحي', start: '09:00', end: '17:00' },
            { id: 'BETWEEN SHIFT', name: 'بعد الظهر', start: '14:00', end: '22:00' },
            { id: 'NIGHT SHIFT', name: 'مسائي', start: '22:00', end: '06:00' }
        ],
        normalHours: 9,
        overtimeThreshold: 9,
        cooldownPeriod: 60000,
        autoRefreshInterval: 30000,
        requireFaceEveryAction: true,
        requireLocationForAttendance: true
    },

    liveness: {
        enabled: true,
        headMovementThreshold: 0.08,
        stableFramesRequired: 4,
        stabilityRing: {
            circumference: 126,
            radius: 20
        }
    },

    security: {
        password: {
            minLength: 8,
            maxLength: 64,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true
        },
        session: {
            timeout: 10 * 60 * 60 * 1000,
            rememberMeDuration: 7 * 24 * 60 * 60 * 1000
        },
        rateLimit: {
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000,
            maxRequestsPerMinute: 20
        },
        adminVerification: {
            requiredForDelete: true,
            requiredForManualAtt: true,
            requiredForPasswordReset: true,
            requiredForFaceReset: true,
            matchThreshold: 0.45,
            verificationWindowMs: 120000
        }
    },

    ui: {
        toast: {
            defaultDuration: 4500,
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
            showErrorActions: true
        }
    },

    app: {
        name: 'Axentro System',
        version: '5.0.1',
        description: 'نظام حضور وانصراف آمن مع تحقق الوجه والموقع',
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
            darkMode: true,
            livenessDetection: true,
            gpsVerification: true,
            adminFaceVerify: true
        },
        fallbacks: {
            allowBasicMode: false,
            showSkipOption: false
        }
    },

    reporting: {
        dateFormats: {
            display: 'DD/MM/YYYY',
            input: 'YYYY-MM-DD',
            api: 'YYYY-MM-DDTHH:mm:ssZ'
        },
        timeFormat: {
            locale: 'ar-EG',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        },
        exportFormats: ['pdf', 'excel', 'csv']
    },

    employeeCode: {
        prefix: 'EMP',
        padStart: 3
    },

    debug: {
        enabled: false,
        level: 'info'
    }
};

const ErrorCodes = {
    AUTH_INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', message: 'بيانات الدخول غير صحيحة' },
    AUTH_FACE_REQUIRED: { code: 'AUTH_FACE_REQUIRED', message: 'يجب تسجيل بصمة الوجه أولاً' },
    AUTH_USER_NOT_FOUND: { code: 'AUTH_USER_NOT_FOUND', message: 'المستخدم غير موجود' },
    GEO_OUTSIDE_ALLOWED_RADIUS: { code: 'GEO_OUTSIDE_ALLOWED_RADIUS', message: 'أنت خارج نطاق العمل المسموح' },
    GEO_ACCURACY_TOO_LOW: { code: 'GEO_ACCURACY_TOO_LOW', message: 'دقة الموقع غير كافية، حاول مرة أخرى في مكان مفتوح' }
};

const SuccessMessages = {
    LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
    FACE_ENROLLED: 'تم حفظ بصمة الوجه بنجاح',
    ATTENDANCE_RECORDED: 'تم تسجيل العملية بنجاح'
};


// Compatibility shim for legacy optional dependency checks
window.Constants = window.Constants || {};
const Constants = window.Constants;
