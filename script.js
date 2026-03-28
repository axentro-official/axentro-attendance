// إعدادات DOM
const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const locationDiv = document.getElementById('location');
const empNameInput = document.getElementById('empName');
const registerBtn = document.getElementById('registerBtn');
const attendanceBtn = document.getElementById('attendanceBtn');
const leaveBtn = document.getElementById('leaveBtn');
const recognizedNameDiv = document.getElementById('recognizedName');
const recognizedUserSpan = document.getElementById('recognizedUserName');
const faceIndicator = document.getElementById('faceIndicator');

let modelsLoaded = false;
let currentStream = null;
let labeledDescriptors = [];
let currentLocation = null;
let currentRecognizedName = null;

// رابط Web App من Google Apps Script
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbxnJeFvBSZuH7E_NN3-8Mv5K694rCv_jrGTbT_sl5Tl0UnRmzuKZx8przHd1IuvgiQBMA/exec';

// تحميل النماذج
async function loadModels() {
    updateStatus('جاري تحميل نماذج التعرف...', true);
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        updateStatus('النماذج جاهزة. جاري تشغيل الكاميرا...', false);
        startVideo();
    } catch (err) {
        updateStatus('خطأ في تحميل النماذج: ' + err.message, false);
        console.error(err);
    }
}

function updateStatus(text, isLoading) {
    statusDiv.innerHTML = isLoading ? `<div class="spinner"></div><span>${text}</span>` : `<span>${text}</span>`;
}

// تشغيل الكاميرا
async function startVideo() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = currentStream;
        video.play();
        updateStatus('الكاميرا تعمل. انتظر التعرف...', false);
        video.onloadedmetadata = () => {
            recognizeFaceContinuously();
        };
    } catch (err) {
        updateStatus('خطأ في الكاميرا: يرجى السماح بالوصول إلى الكاميرا', false);
        console.error(err);
    }
}

// الحصول على الموقع
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                currentLocation = `https://maps.google.com/?q=${lat},${lng}`;
                locationDiv.innerHTML = `<span>📍 <a href="${currentLocation}" target="_blank" style="color:#60a5fa;">الموقع الحالي</a></span>`;
            },
            (error) => {
                locationDiv.innerHTML = `<span>⚠️ فشل الحصول على الموقع: ${error.message}</span>`;
                currentLocation = 'غير متوفر';
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        locationDiv.innerHTML = `<span>⚠️ المتصفح لا يدعم تحديد الموقع</span>`;
        currentLocation = 'غير مدعوم';
    }
}

// تحميل الموظفين من localStorage
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
        updateStatus(`تم تحميل ${labeledDescriptors.length} موظف`, false);
    } else {
        updateStatus('لا يوجد موظفون مسجلون. سجل موظفاً أولاً', false);
    }
}

// حفظ الموظفين
function saveEmployees() {
    const data = labeledDescriptors.map(ld => ({
        label: ld.label,
        descriptors: ld.descriptors.map(d => Array.from(d))
    }));
    localStorage.setItem('axentro_face_descriptors', JSON.stringify(data));
    updateStatus(`تم حفظ ${labeledDescriptors.length} موظف`, false);
}

// التعرف المستمر على الوجه
async function recognizeFaceContinuously() {
    if (!modelsLoaded) return;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(video, displaySize);
    
    setInterval(async () => {
        if (video.videoWidth === 0) return;
        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        if (resizedDetections.length > 0 && labeledDescriptors.length > 0) {
            faceIndicator.classList.add('active');
            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
            const bestMatch = faceMatcher.findBestMatch(resizedDetections[0].descriptor);
            if (bestMatch.label !== 'unknown') {
                currentRecognizedName = bestMatch.label;
                recognizedUserSpan.textContent = currentRecognizedName;
                recognizedNameDiv.style.display = 'block';
                updateStatus(`مرحباً ${currentRecognizedName}`, false);
            } else {
                currentRecognizedName = null;
                recognizedNameDiv.style.display = 'none';
                updateStatus('وجه غير مسجل. يرجى التسجيل أولاً', false);
            }
        } else if (resizedDetections.length === 0) {
            faceIndicator.classList.remove('active');
            currentRecognizedName = null;
            recognizedNameDiv.style.display = 'none';
            updateStatus('لم يتم اكتشاف وجه', false);
        }
    }, 1500);
}

// التقاط صورة
function captureImage() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
}

// إرسال البيانات إلى Google Apps Script
async function sendAttendance(name, type) {
    if (!name) {
        alert('لم يتم التعرف على الوجه. تأكد من وضوح وجهك أمام الكاميرا.');
        return;
    }
    if (!currentLocation) {
        alert('جاري الحصول على الموقع... حاول مرة أخرى بعد ثانية');
        getLocation();
        setTimeout(() => sendAttendance(name, type), 1000);
        return;
    }
    
    const imageData = captureImage();
    const now = new Date();
    const timeStr = now.toLocaleString('ar-EG');
    
    const payload = {
        name: name,
        type: type,
        location: currentLocation,
        time: timeStr,
        imageData: imageData
    };
    
    updateStatus('جاري الإرسال...', true);
    try {
        await fetch(googleScriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        updateStatus(`تم تسجيل ${type} بنجاح للموظف ${name}`, false);
        alert(`✅ تم تسجيل ${type}`);
    } catch (err) {
        updateStatus('خطأ في الإرسال', false);
        console.error(err);
        alert('حدث خطأ أثناء الإرسال، حاول مرة أخرى');
    }
}

// تسجيل موظف جديد
async function registerEmployee() {
    const name = empNameInput.value.trim();
    if (!name) {
        alert('يرجى إدخال اسم الموظف');
        return;
    }
    updateStatus('جاري التقاط الوجه...', true);
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
        updateStatus('لم يتم اكتشاف وجه. تأكد من وجود وجه أمام الكاميرا', false);
        alert('لم يتم اكتشاف وجه، حاول مرة أخرى');
        return;
    }
    const descriptor = detection.descriptor;
    const existing = labeledDescriptors.find(ld => ld.label === name);
    if (existing) {
        existing.descriptors.push(descriptor);
        updateStatus(`تمت إضافة واصف جديد للموظف ${name}`, false);
    } else {
        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(name, [descriptor]));
        updateStatus(`تم تسجيل الموظف ${name} بنجاح`, false);
    }
    saveEmployees();
    empNameInput.value = '';
    alert(`تم تسجيل ${name} بنجاح`);
}

// ربط الأزرار
attendanceBtn.onclick = () => sendAttendance(currentRecognizedName, 'حضور');
leaveBtn.onclick = () => sendAttendance(currentRecognizedName, 'انصراف');
registerBtn.onclick = registerEmployee;

// بدء التشغيل
(async () => {
    await loadModels();
    modelsLoaded = true;
    loadEmployees();
    getLocation();
    setInterval(getLocation, 30000);
})();
