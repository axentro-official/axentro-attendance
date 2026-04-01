// face.js
import { CONFIG } from './config.js';
import { showToast, playSound, setCamStatus } from './ui.js';
import { getAuthToken } from './api.js';
import { user, sessionDescriptor, setSessionDescriptor, setUserImage, showApp, logout, loadEmployees, calculateMonthlyHours, fetchUserDataInBackground, registerFingerprint } from './auth.js'; // سيتم تصديرها

let video, canvas, ctx;
let stream = null;
let lightModels = false, heavyModels = false;
let regMode = false, attMode = false, updateFaceMode = false, adminVerifyMode = false, firstTimeSetupMode = false, attType = '', regData = {};
let targetEmpForAdmin = null;
let autoCaptureTimeout = null;
let isProcessingCapture = false;
let detectionLoopTimeout = null;
let livenessActive = false, livenessStartYaw = null, stabilityCounter = 0;
let lastCamStatusText = '';

export function initFace() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
}

export function setRegMode(data) { regMode = true; regData = data; }
export function setAttMode(type) { attMode = true; attType = type; }
export function setUpdateFaceMode() { updateFaceMode = true; }
export function setAdminVerifyMode(emp) { adminVerifyMode = true; targetEmpForAdmin = emp; }
export function setFirstTimeSetupMode() { firstTimeSetupMode = true; }
export function clearModes() { regMode = false; attMode = false; updateFaceMode = false; adminVerifyMode = false; firstTimeSetupMode = false; attType = ''; targetEmpForAdmin = null; }

export async function openCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
        video.srcObject = stream; await video.play();
        document.getElementById('cameraOverlay').classList.add('active');
        lastCamStatusText = '';
        setCamStatus(!lightModels || !heavyModels ? '<i class="fas fa-cog fa-spin"></i> جاري تحميل الذكاء الاصطناعي...' : '<i class="fas fa-spinner fa-spin"></i> جاري البحث عن الوجه...');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        stabilityCounter = 0; if (attMode || adminVerifyMode) resetLiveness(); isProcessingCapture = false;
        startDetectionLoop(); return true;
    } catch(e) { console.error(e); return false; }
}

export function closeCamera() {
    if(stream) { stream.getTracks().forEach(t=>t.stop()); stream=null; }
    video.srcObject = null; document.getElementById('cameraOverlay').classList.remove('active');
    clearModes();
    if(autoCaptureTimeout) { clearTimeout(autoCaptureTimeout); autoCaptureTimeout=null; }
    if(detectionLoopTimeout) { clearTimeout(detectionLoopTimeout); detectionLoopTimeout=null; }
    stabilityCounter = 0; livenessActive = false;
}

function startDetectionLoop() {
    if(detectionLoopTimeout) clearTimeout(detectionLoopTimeout);
    async function detect() {
        if(!video.srcObject || !document.getElementById('cameraOverlay').classList.contains('active') || isProcessingCapture) return;
        await drawFaceBox();
        detectionLoopTimeout = setTimeout(detect, 250);
    }
    detect();
}

function getHeadYaw(landmarks) {
    const nose = landmarks.getNose()[3];
    const leftEye = landmarks.getLeftEye()[0];
    const rightEye = landmarks.getRightEye()[3];
    return nose.x - ((leftEye.x + rightEye.x)/2);
}

function resetLiveness() { livenessActive = true; livenessStartYaw = null; stabilityCounter = 0; }

function updateLiveness(yaw) {
    if (!livenessActive) return true;
    if (livenessStartYaw === null) { livenessStartYaw = yaw; setCamStatus('<i class="fas fa-arrow-left"></i> حرك رأسك قليلاً لليمين أو اليسار...'); return false; }
    if (Math.abs(yaw - livenessStartYaw) > 0.08) { livenessActive = false; setCamStatus('<i class="fas fa-check-circle"></i> تم التحقق من الحركة، يرجى الثبات...'); return true; }
    return false;
}

async function drawFaceBox() {
    if(!video.srcObject || video.videoWidth===0) return;
    if(!lightModels || !heavyModels) { setCamStatus('<i class="fas fa-cog fa-spin"></i> جاري تحميل النماذج، انتظر...'); return; }
    try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })).withFaceLandmarks(true);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        if(detection) {
            const box = detection.detection.box;
            ctx.strokeStyle = '#38bdf8'; ctx.lineWidth=3; ctx.strokeRect(box.x,box.y,box.width,box.height);
            const cLen=25; ctx.strokeStyle='#10b981'; ctx.lineWidth=4;
            ctx.beginPath(); ctx.moveTo(box.x,box.y+cLen); ctx.lineTo(box.x,box.y); ctx.lineTo(box.x+cLen,box.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(box.x+box.width-cLen,box.y); ctx.lineTo(box.x+box.width,box.y); ctx.lineTo(box.x+box.width,box.y+cLen); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(box.x,box.y+box.height-cLen); ctx.lineTo(box.x,box.y+box.height); ctx.lineTo(box.x+cLen,box.y+box.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(box.x+box.width-cLen,box.y+box.height); ctx.lineTo(box.x+box.width,box.y+box.height); ctx.lineTo(box.x+box.width,box.y+box.height-cLen); ctx.stroke();
            
            if (regMode || updateFaceMode || firstTimeSetupMode) {
                stabilityCounter++;
                if (stabilityCounter >= CONFIG.STABLE_FRAMES_REQUIRED) {
                    setCamStatus('<i class="fas fa-camera" style="color:var(--success);"></i> ثبت وجهك، جاري الالتقاط...');
                    if(!autoCaptureTimeout && !isProcessingCapture) autoCaptureTimeout = setTimeout(()=>performCapture(), 300);
                } else { setCamStatus(`<i class="fas fa-spinner fa-pulse"></i> ثبت وجهك (${stabilityCounter}/${CONFIG.STABLE_FRAMES_REQUIRED})...`); }
                return;
            }
            if (attMode || adminVerifyMode) {
                const livenessOk = updateLiveness(getHeadYaw(detection.landmarks));
                if (!livenessOk) { if(autoCaptureTimeout) clearTimeout(autoCaptureTimeout); stabilityCounter = 0; return; }
                stabilityCounter++;
                if (stabilityCounter >= CONFIG.STABLE_FRAMES_REQUIRED) {
                    setCamStatus('<i class="fas fa-check-circle" style="color:var(--success);"></i> تم اكتشاف الوجه، جاري الالتقاط...');
                    if(!autoCaptureTimeout && !isProcessingCapture) autoCaptureTimeout = setTimeout(()=>performCapture(), 300);
                } else { setCamStatus(`<i class="fas fa-spinner fa-pulse"></i> ثبت وجهك (${stabilityCounter}/${CONFIG.STABLE_FRAMES_REQUIRED})...`); }
                return;
            }
        } else {
            setCamStatus('<i class="fas fa-spinner fa-spin"></i> جاري البحث عن الوجه...');
            if(autoCaptureTimeout) clearTimeout(autoCaptureTimeout); stabilityCounter = 0;
            if (attMode || adminVerifyMode) resetLiveness();
        }
    } catch(e) {}
}

async function performCapture() {
    if(isProcessingCapture) return;
    isProcessingCapture = true; autoCaptureTimeout = null;
    if(detectionLoopTimeout) { clearTimeout(detectionLoopTimeout); detectionLoopTimeout = null; }

    const c = document.createElement('canvas'); c.width=video.videoWidth; c.height=video.videoHeight; c.getContext('2d').drawImage(video,0,0);
    const imgData = c.toDataURL('jpeg',0.7);
    let newDescriptor = null;

    setCamStatus('<i class="fas fa-brain"></i> جاري المعالجة النهائية الآنية...');
    try {
        const det = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 })).withFaceLandmarks().withFaceDescriptor();
        if(!det) { playSound('faceid-error'); if(navigator.vibrate) navigator.vibrate([100,50,100]); setCamStatus('<i class="fas fa-times-circle" style="color:red;"></i> لحظة غير مناسبة، جاري إعادة المحاولة...'); isProcessingCapture = false; stabilityCounter = 0; startDetectionLoop(); return; }
        newDescriptor = Array.from(det.descriptor);
    } catch(err) { playSound('faceid-error'); showToast('خطأ في التحليل', 'error'); isProcessingCapture = false; stabilityCounter = 0; startDetectionLoop(); return; }

    if(regMode) {
        setCamStatus('<i class="fas fa-upload"></i> جاري حفظ بيانات الموظف الجديد...');
        try {
            const res = await registerEmployee(regData.name, regData.email, newDescriptor, imgData);
            if(res.success) { playSound('faceid-success'); if(navigator.vibrate) navigator.vibrate(50); showToast('تم إنشاء الحساب بنجاح! سجل دخولك الآن.', 'success'); closeCamera(); showLoginScreen(); }
            else { playSound('faceid-error'); showToast(res.error || 'حدث خطأ', 'error'); closeCamera(); }
        } catch(e) { playSound('faceid-error'); showToast('خطأ في الاتصال', 'error'); closeCamera(); }
    }
    else if(firstTimeSetupMode) {
        setCamStatus('<i class="fas fa-upload"></i> جاري حفظ بصمة الوجه...');
        try {
            const token = getAuthToken();
            const res = await updateFace(user.code, newDescriptor, imgData, token);
            if(res.success) {
                playSound('faceid-success'); setSessionDescriptor(newDescriptor); setUserImage(imgData);
                showToast('تم تسجيل البصمة بنجاح! جاري الدخول...', 'success');
                closeCamera(); showApp();
                const rememberMe = localStorage.getItem('rememberMe') === 'true';
                if(rememberMe && window.PublicKeyCredential) setTimeout(()=>registerFingerprint(),1000);
            } else { playSound('faceid-error'); showToast('فشل الحفظ', 'error'); stabilityCounter = 0; startDetectionLoop(); }
        } catch(e) { playSound('faceid-error'); showToast('خطأ في الاتصال', 'error'); stabilityCounter = 0; startDetectionLoop(); }
    }
    else if(updateFaceMode) {
        setCamStatus('<i class="fas fa-upload"></i> جاري حفظ بصمة الوجه...');
        try {
            const token = getAuthToken();
            const res = await updateFace(user.code, newDescriptor, imgData, token);
            if(res.success) { playSound('faceid-success'); setSessionDescriptor(newDescriptor); setUserImage(imgData); showToast('تم تحديث البصمة بنجاح!', 'success'); closeCamera(); showApp(); }
            else { playSound('faceid-error'); showToast('فشل التحديث', 'error'); closeCamera(); }
        } catch(e) { playSound('faceid-error'); showToast('خطأ في الاتصال', 'error'); closeCamera(); }
    }
    else if(adminVerifyMode) {
        if(!sessionDescriptor) { playSound('faceid-error'); showToast('بيانات وجهك كأدمن غير متوفرة!', 'error'); closeCamera(); return; }
        if(euclideanDistance(newDescriptor, sessionDescriptor) < CONFIG.MATCH_THRESHOLD) {
            setCamStatus('<i class="fas fa-check-circle" style="color:var(--success);"></i> تم التحقق، جاري التسجيل...');
            const now = new Date();
            const datetimeEn = now.toISOString().replace('T', ' ').substring(0,19);
            const payload = { action:'attendance', name:targetEmpForAdmin.name, code:targetEmpForAdmin.code, type:targetEmpForAdmin.type, location:currentLoc||'غير متوفر', datetime:datetimeEn, imageData:imgData, shift:'تسجيل يدوي بواسطة الأدمن (تم التحقق بالوجه)', token: getAuthToken() };
            try {
                const data = await recordAttendance(payload.name, payload.code, payload.type, payload.location, payload.datetime, payload.imageData, payload.shift, payload.token);
                if(data.success) { playSound('faceid-success'); showToast(`تم تسجيل ${targetEmpForAdmin.type} لـ ${targetEmpForAdmin.name}`, 'success'); closeCamera(); loadEmployees(); }
                else { playSound('faceid-error'); showToast('فشل التسجيل: '+ (data.error||''), 'error'); stabilityCounter = 0; startDetectionLoop(); }
            } catch(e) { playSound('faceid-error'); showToast('خطأ في الاتصال', 'error'); stabilityCounter = 0; startDetectionLoop(); }
        } else { playSound('faceid-error'); showToast('وجه الأدمن غير مطابق!', 'error'); setCamStatus('<i class="fas fa-ban" style="color:var(--danger);"></i> انتحال هوية مرفوض!'); stabilityCounter = 0; startDetectionLoop(); }
    }
    else if(attMode) {
        if(currentLat && currentLon) { const dist = getDistanceFromLatLonInKm(currentLat, currentLon, CONFIG.OFFICE_LAT, CONFIG.OFFICE_LON); if(dist > CONFIG.MAX_DISTANCE_METERS) { playSound('faceid-error'); showToast(`أنت بعيد عن المقر (${Math.round(dist)} متر)`, 'error'); setCamStatus('<i class="fas fa-map-marker-alt" style="color:var(--danger);"></i> مرفوض: خارج نطاق المقر'); isProcessingCapture = false; stabilityCounter = 0; return; } }
        if(!sessionDescriptor) { playSound('faceid-error'); showToast('بيانات الوجه غير متوفرة', 'error'); closeCamera(); return; }
        
        const distance = euclideanDistance(newDescriptor, sessionDescriptor);
        
        if(attType === 'تغيير كلمة المرور') {
            if(distance < CONFIG.MATCH_THRESHOLD) {
                try {
                    const token = getAuthToken();
                    const data = await changePassword(user.code, window._pendingPwChange.oldPassword, window._pendingPwChange.newPassword, token);
                    if(data.success) { playSound('login-success'); showToast('تم تغيير كلمة المرور بنجاح','success'); closeCamera(); }
                    else { playSound('login-error'); showToast('فشل تغيير كلمة السر', 'error'); stabilityCounter = 0; startDetectionLoop(); }
                } catch(e) { playSound('login-error'); showToast('خطأ في الاتصال','error'); stabilityCounter = 0; startDetectionLoop(); }
            } else { playSound('faceid-error'); showToast('الوجه غير مطابق! تم إلغاء العملية.', 'error'); setCamStatus('<i class="fas fa-ban" style="color:var(--danger);"></i> الوجه غير مطابق!'); stabilityCounter = 0; startDetectionLoop(); }
            isProcessingCapture = false; return;
        }

        if(distance < CONFIG.MATCH_THRESHOLD) {
            setCamStatus('<i class="fas fa-check-circle" style="color:var(--success);"></i> تم التحقق بنجاح! جاري التسجيل...');
            const now = new Date();
            const datetimeEn = now.toISOString().replace('T', ' ').substring(0,19);
            const selShift = document.querySelector('input[name="shift"]:checked');
            const token = getAuthToken();
            const data = await recordAttendance(user.name, user.code, attType, currentLoc||'غير متوفر', datetimeEn, imgData, selShift ? selShift.value : 'لم يتم التحديد', token);
            if(data.success) { playSound('faceid-success'); showToast(`تم تسجيل ${attType} بنجاح ${data.hoursWorked ? '('+data.hoursWorked+')' : ''}`, 'success'); closeCamera(); calculateMonthlyHours(); }
            else { playSound('faceid-error'); showToast('فشل التسجيل: '+ (data.error||''), 'error'); stabilityCounter = 0; startDetectionLoop(); }
        } else { playSound('faceid-error'); showToast('الوجه غير مطابق! تم رفض التسجيل.', 'error'); setCamStatus('<i class="fas fa-ban" style="color:var(--danger);"></i> الوجه غير مطابق!'); stabilityCounter = 0; startDetectionLoop(); }
    }
    isProcessingCapture = false;
}

export async function loadModelsAsync() {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/');
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/');
        lightModels = true;
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/');
        heavyModels = true; setStatus('النظام جاهز');
    } catch(e) { console.error(e); }
}

function euclideanDistance(desc1, desc2) { let sum=0; for(let i=0;i<desc1.length;i++) sum+=(desc1[i]-desc2[i])**2; return Math.sqrt(sum); }

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2-lat1);
    const dLon = deg2rad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(deg2rad(lat1))*Math.cos(deg2rad(lat2))*Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000;
}
function deg2rad(deg) { return deg * (Math.PI/180); }

let currentLoc = 'غير متوفر';
let currentLat = null, currentLon = null;
export function setLocation(lat, lon, locString) { currentLat = lat; currentLon = lon; currentLoc = locString; }
