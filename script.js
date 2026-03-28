// script.js مبسط للاختبار
const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const registerBtn = document.getElementById('registerBtn');
const attendanceBtn = document.getElementById('attendanceBtn');
const leaveBtn = document.getElementById('leaveBtn');

let modelsLoaded = false;
let currentStream = null;
let labeledDescriptors = [];
let currentRecognizedName = null;

// رابط Web App
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbxnJeFvBSZuH7E_NN3-8Mv5K694rCv_jrGTbT_sl5Tl0UnRmzuKZx8przHd1IuvgiQBMA/exec';

// دالة Toast مبسطة
function showToast(message, type = 'info') {
    let toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show', type);
    setTimeout(() => {
        toast.classList.remove('show', type);
    }, 3000);
}

async function loadModels() {
    statusDiv.innerHTML = `<div class="spinner"></div><span>جاري تحميل النماذج...</span>`;
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        modelsLoaded = true;
        statusDiv.innerHTML = `<span>النماذج جاهزة. جاري تشغيل الكاميرا...</span>`;
        startVideo();
    } catch (err) {
        statusDiv.innerHTML = `<span>خطأ في تحميل النماذج: ${err.message}</span>`;
        showToast('فشل تحميل النماذج', 'error');
    }
}

async function startVideo() {
    try {
        // طلب الكاميرا بدون تحديد دقيق للواجهة (سيعطي الكاميرا الافتراضية)
        currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = currentStream;
        await video.play();
        statusDiv.innerHTML = `<span>الكاميرا تعمل. انتظر التعرف...</span>`;
        video.onloadedmetadata = () => {
            recognizeFaceContinuously();
        };
    } catch (err) {
        statusDiv.innerHTML = `<span>خطأ في الكاميرا: ${err.message}</span>`;
        showToast('تعذر الوصول إلى الكاميرا', 'error');
    }
}

function loadEmployees() {
    const stored = localStorage.getItem('axentro_face_descriptors');
    if (stored) {
        const data = JSON.parse(stored);
        labeledDescriptors = data.map(item => {
            return new faceapi.LabeledFaceDescriptors(
                item.label,
                item.descriptors.map(d => new Float32Array(d))
            );
        });
        statusDiv.innerHTML = `<span>تم تحميل ${labeledDescriptors.length} موظف</span>`;
    } else {
        statusDiv.innerHTML = `<span>لا يوجد موظفون مسجلون</span>`;
    }
}

function saveEmployees() {
    const data = labeledDescriptors.map(ld => ({
        label: ld.label,
        descriptors: ld.descriptors.map(d => Array.from(d))
    }));
    localStorage.setItem('axentro_face_descriptors', JSON.stringify(data));
    statusDiv.innerHTML = `<span>تم حفظ ${labeledDescriptors.length} موظف</span>`;
}

async function recognizeFaceContinuously() {
    if (!modelsLoaded) return;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(video, displaySize);
    
    setInterval(async () => {
        if (video.videoWidth === 0) return;
        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        if (resizedDetections.length > 0 && labeledDescriptors.length > 0) {
            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
            const bestMatch = faceMatcher.findBestMatch(resizedDetections[0].descriptor);
            if (bestMatch.label !== 'unknown') {
                currentRecognizedName = bestMatch.label;
                statusDiv.innerHTML = `<span>مرحباً ${currentRecognizedName}</span>`;
            } else {
                currentRecognizedName = null;
                statusDiv.innerHTML = `<span>وجه غير مسجل</span>`;
            }
        } else if (resizedDetections.length === 0) {
            currentRecognizedName = null;
            statusDiv.innerHTML = `<span>لم يتم اكتشاف وجه</span>`;
        }
    }, 1500);
}

function captureImage() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
}

async function sendAttendance(name, type) {
    if (!name) {
        showToast('لم يتم التعرف على الوجه', 'warning');
        return;
    }
    // هنا يمكن إضافة الموقع لاحقاً
    const imageData = captureImage();
    const now = new Date();
    const timeStr = now.toLocaleString('ar-EG');
    
    const payload = {
        name: name,
        type: type,
        location: 'تم الحصول عليه لاحقاً',
        time: timeStr,
        imageData: imageData
    };
    
    statusDiv.innerHTML = `<div class="spinner"></div><span>جاري الإرسال...</span>`;
    try {
        await fetch(googleScriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        statusDiv.innerHTML = `<span>تم تسجيل ${type} بنجاح</span>`;
        showToast(`✅ تم تسجيل ${type}`, 'success');
    } catch (err) {
        statusDiv.innerHTML = `<span>خطأ في الإرسال</span>`;
        showToast('حدث خطأ أثناء الإرسال', 'error');
    }
}

async function registerEmployee() {
    const name = document.getElementById('empName').value.trim();
    if (!name) {
        showToast('يرجى إدخال اسم الموظف', 'warning');
        return;
    }
    if (!video.srcObject) {
        showToast('الكاميرا غير جاهزة', 'warning');
        return;
    }
    statusDiv.innerHTML = `<div class="spinner"></div><span>جاري التقاط الوجه...</span>`;
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
        statusDiv.innerHTML = `<span>لم يتم اكتشاف وجه</span>`;
        showToast('لم يتم اكتشاف وجه', 'error');
        return;
    }
    const descriptor = detection.descriptor;
    const existing = labeledDescriptors.find(ld => ld.label === name);
    if (existing) {
        existing.descriptors.push(descriptor);
        statusDiv.innerHTML = `<span>تم تحديث ${name}</span>`;
        showToast(`تم تحديث بيانات ${name}`, 'success');
    } else {
        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(name, [descriptor]));
        statusDiv.innerHTML = `<span>تم تسجيل ${name}</span>`;
        showToast(`تم تسجيل ${name}`, 'success');
    }
    saveEmployees();
    document.getElementById('empName').value = '';
}

// ربط الأزرار
registerBtn.onclick = registerEmployee;
attendanceBtn.onclick = () => sendAttendance(currentRecognizedName, 'حضور');
leaveBtn.onclick = () => sendAttendance(currentRecognizedName, 'انصراف');

// بدء التشغيل
loadModels();
loadEmployees();
