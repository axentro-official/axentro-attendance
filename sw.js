const CACHE_NAME = 'axentro-v2';

const OFFLINE_URLS = [
    './',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
    
    // إضافة ملفات الأوزان (Models) لضمان عمل التعرف على الوجوه بدون إنترنت
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/tiny_face_detector_model-weights_manifest.json',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/tiny_face_detector_model-shard1',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/face_landmark_68_tiny_model-weights_manifest.json',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/face_landmark_68_tiny_model-shard1',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/ssd_mobilenetv1_model-weights_manifest.json',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/ssd_mobilenetv1_model-shard1',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/ssd_mobilenetv1_model-shard2',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/face_landmark_68_model-weights_manifest.json',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/face_landmark_68_model-shard1',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/face_recognition_model-weights_manifest.json',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/face_recognition_model-shard1',
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/face_recognition_model-shard2'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS)));
    self.skipWaiting();
});

// مسح الكاش القديم عند التحديث
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // ⚠️ جدار الحماية: تجاهل تخزين طلبات Google Apps Script نهائياً
    if (url.hostname === 'script.google.com') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ success: false, error: 'لا يوجد اتصال بالإنترنت' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return; // إيقاف التنفيذ والعودة فوراً
    }

    // استراتيجية التخزين للملفات الثابتة (صور، أيقونات، ملفات JS)
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(networkResponse => {
                const clonedResponse = networkResponse.clone();
                return caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
            });
        }).catch(() => {
            // إذا كان المستخدم يفتح الصفحة الرئيسية بدون نت، أعطه النسخة المخزنة
            if (event.request.mode === 'navigate') {
                return caches.match('./');
            }
        })
    );
});
