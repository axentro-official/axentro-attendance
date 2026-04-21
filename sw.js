/**
 * ============================================
 * 🔄 AXENTRO SERVICE WORKER v4.0
 * ✅ Offline Support & Caching Strategy
 * ============================================
 */

const CACHE_NAME = 'axentro-v5-local-models-2';
const STATIC_CACHE = 'axentro-static-vfast-5-local-models-2';
const DYNAMIC_CACHE = 'axentro-dynamic-vfast-5-local-models-2';

// ============================================
// 📦 FILES TO PRECACHE (App Shell)
// ============================================
const APP_SHELL_FILES = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './qr-links.png',
    
    // CSS
    './styles.css',
    
    // JavaScript Modules (order matters!)
    './config.js',
    './utils.js',
    './validator.js',
    './ui-manager.js',
    './supabase-client.js',
    './auth.js',
    './face-recognition.js',
    './attendance.js',
    './admin.js',
    './reports.js',
    './app.js',
    
    // Audio files
    './login-success.mp3',
    './login-error.mp3',
    './faceid-success.mp3',
    './faceid-error.mp3',
    './logout-success.mp3'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
    {
        url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
        cacheName: 'fonts-css'
    },
    {
        url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
        cacheName: 'face-api-js'
    }
];

// Face recognition model files (heavy, cache separately)
const FACE_MODEL_URLS = [
];

// API endpoints that should NOT be cached
const NO_CACHE_URLS = [
    /script\.google\.com/,  // Google Apps Script
    /supabase\.co\/rest/,   // Supabase REST API
    /supabase\.co\/auth/,   // Supabase Auth
    /api\./                 // Generic APIs
];

// ============================================
// 🚀 INSTALL EVENT
// ============================================
self.addEventListener('install', event => {
    console.log('🔧 SW: Installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache app shell
            caches.open(STATIC_CACHE).then(cache => {
                console.log('📦 Caching app shell');
                return cache.addAll(APP_SHELL_FILES).catch(err => {
                    console.warn('⚠️ Some app shell files failed to cache:', err);
                });
            }),
            
            // Cache external resources
            ...EXTERNAL_RESOURCES.map(resource => 
                caches.open(STATIC_CACHE).then(cache => 
                    cache.add(resource.url).catch(err => {
                        console.warn(`⚠️ Failed to cache: ${resource.url}`, err);
                    })
                )
            ),
            
            // Pre-cache face models in background
            caches.open('face-models-v5-local-2').then(cache => {
                console.log('🤖 Caching face recognition models...');
                return Promise.allSettled(
                    FACE_MODEL_URLS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`⚠️ Failed to cache model: ${url}`, err);
                        })
                    )
                );
            })
        ]).then(() => {
            console.log('✅ SW: Installation complete');
            return self.skipWaiting(); // Activate immediately
        })
    );
});

// ============================================
// ✅ ACTIVATE EVENT
// ============================================
self.addEventListener('activate', event => {
    console.log('✅ SW: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== STATIC_CACHE && 
                                     name !== DYNAMIC_CACHE && 
                                     name !== 'face-models-v5-local-2')
                        .map(name => {
                            console.log('🗑️ Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            }),
            
            // Take control of all pages immediately
            self.clients.claim()
        ]).then(() => {
            console.log('✅ SW: Activation complete - Ready to serve!');
            
            // Notify clients about update
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        message: 'Service Worker updated!'
                    });
                });
            });
        })
    );
});

// ============================================
// 🌐 FETCH EVENT (Network Strategy)
// ============================================
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    // ============================================
    // 🚫 SKIP: Non-GET requests
    // ============================================
    if (event.request.method !== 'GET') {
        return;
    }
    
    // ============================================
    // 🚫 SKIP: Google Apps Script & API calls
    // ============================================
    const shouldNotCache = NO_CACHE_URLS.some(pattern => pattern.test(requestUrl.href));
    if (shouldNotCache) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Return offline response for API calls
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'أنت غير متصل بالإنترنت',
                        offline: true
                    }), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                })
        );
        return;
    }
    
    // ============================================
    // 🎯 STRATEGY: Cache First for Static Assets
    // ============================================
    if (isStaticAsset(requestUrl)) {
        event.respondWith(
            caches.open(STATIC_CACHE).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        // Return cached version and update in background
                        fetchAndUpdateCache(event.request, cache);
                        return cachedResponse;
                    }
                    
                    // Not in cache - fetch from network
                    return fetch(event.request).then(networkResponse => {
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        // Return fallback for specific assets
                        return getStaticFallback(requestUrl);
                    });
                });
            })
        );
        return;
    }
    
    // ============================================
    // 🎯 STRATEGY: Network First for HTML Pages
    // ============================================
    if (isHTMLPage(requestUrl)) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // Cache successful responses
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(DYNAMIC_CACHE).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Try cache as fallback
                    return caches.match(event.request).then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        return new Response('Offline', { status: 503 });
                    });
                })
        );
        return;
    }
    
    // ============================================
    // 🎯 DEFAULT: Stale While Revalidate
    // ============================================
    event.respondWith(
        caches.open(DYNAMIC_CACHE).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchedPromise = fetch(event.request)
                    .then(networkResponse => {
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => cachedResponse); // Fallback to cache
                
                return cachedResponse || fetchedPromise;
            });
        })
    );
});

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

/**
 * Check if request is for a static asset
 * @param {URL} url - Request URL
 * @returns {boolean} Is static asset
 */
function isStaticAsset(url) {
    const staticExtensions = [
        '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
        '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.wav', '.webp'
    ];
    
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Check if request is for an HTML page
 * @param {URL} url - Request URL
 * @returns {boolean} Is HTML page
 */
function isHTMLPage(url) {
    return url.pathname.endsWith('.html') || 
           url.pathname.endsWith('/') ||
           !url.pathname.includes('.');
}

/**
 * Fetch resource and update cache in background
 * @param {Request} request - Original request
 * @param {Cache} cache - Cache instance
 */
async function fetchAndUpdateCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            await cache.put(request, response);
        }
    } catch (error) {
        console.warn('Background update failed:', error.message);
    }
}

/**
 * Get fallback response for static assets
 * @param {URL} url - Request URL
 * @returns {Response} Fallback response
 */
function getStaticFallback(url) {
    // Return appropriate fallback based on asset type
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
        // Return placeholder image or transparent pixel
        return new Response('', {
            status: 200,
            headers: { 'Content-Type': 'image/svg+xml' }
        });
    }
    
    if (url.pathname.match(/\.css$/i)) {
        // Return empty CSS
        return new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'text/css' }
        });
    }
    
    if (url.pathname.match(/\.js$/i)) {
        // Return empty JS module
        return new Response('// Offline', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
    
    // Default fallback
    return new Response('Resource not available offline', { status: 503 });
}

// ============================================
// 📨 MESSAGE HANDLING
// ============================================
self.addEventListener('message', event => {
    if (!event.data) return;

    switch (event.data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.source.postMessage({ type: 'CACHE_CLEARED' });
            });
            break;
            
        case 'GET_VERSION':
            event.source.postMessage({
                type: 'VERSION',
                version: CACHE_NAME,
                timestamp: Date.now()
            });
            break;
            
        case 'PRECACHE_URLS':
            if (event.data.urls) {
                precacheUrls(event.data.urls);
            }
            break;
            
        default:
            console.log('Unknown message type:', event.data.type);
    }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('🗑️ All caches cleared');
}

/**
 * Precache specific URLs
 * @param {Array<string>} urls - URLs to cache
 */
async function precacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    await Promise.all(
        urls.map(url => 
            fetch(url)
                .then(response => {
                    if (response.ok) {
                        cache.put(url, response);
                    }
                })
                .catch(err => console.warn('Failed to precache:', url, err))
        )
    );
}

// ============================================
// 📊 BACKGROUND SYNC (for future use)
// ============================================
self.addEventListener('sync', event => {
    console.log('🔄 Background sync:', event.tag);
    
    if (event.tag === 'sync-attendance') {
        event.waitUntil(syncAttendanceData());
    }
});

/**
 * Sync attendance data when back online
 */
async function syncAttendanceData() {
    // This would sync queued offline operations
    console.log('Syncing attendance data...');
}

// ============================================
// 🔔 PUSH NOTIFICATIONS (for future use)
// ============================================
self.addEventListener('push', event => {
    console.log('📲 Push notification received');
    
    let data = {
        title: 'Axentro',
        body: 'إشعار جديد',
        icon: './icon-192.png',
        badge: './icon-192.png',
        dir: 'rtl',
        lang: 'ar'
    };
    
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, data)
    );
});

self.addEventListener('notificationclick', event => {
    console.log('🔔 Notification clicked');
    
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(AppConfig.app.urls.login)
    );
});

// ============================================
// 📈 PERFORMANCE MONITORING
// ============================================
// Log performance metrics (optional, can be removed in production)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    const startTime = Date.now();
    
    event.waitUntil(
        fetch(event.request.clone()).then(response => {
            const duration = Date.now() - startTime;
            
            // Only log slow requests (> 1 second)
            if (duration > 1000) {
                console.warn(`⏱️ Slow request (${duration}ms):`, event.request.url);
            }
            
            return response;
        }).catch(error => {
            const duration = Date.now() - startTime;
            console.error(`❌ Failed request (${duration}ms):`, event.request.url, error);
        })
    );
});

console.log('🔄 Service Worker v4 loaded');