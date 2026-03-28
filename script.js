// إعدادات
const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const locationDiv = document.getElementById('location');
const empNameInput = document.getElementById('empName');
const registerBtn = document.getElementById('registerBtn');
const attendanceBtn = document.getElementById('attendanceBtn');
const leaveBtn = document.getElementById('leaveBtn');

let modelsLoaded = false;
let currentStream = null;
let labeledDescriptors = [];
let currentLocation = null;
let currentRecognizedName = null;

// الرابط الجديد من Google Apps Script
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbxnJeFvBSZuH7E_NN3-8Mv5K694rCv_jrGTbT_sl5Tl0UnRmzuKZx8przHd1IuvgiQBMA/exec';

// تحميل النماذج
async function loadModels() {
    statusDiv.innerText = 'جاري تحميل نماذج التعرف...';
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    statusDiv.innerText = 'النماذج جاهزة. جاري تشغيل الكاميرا...';
    startVideo();
}

// تشغيل الكاميرا
async function startVideo() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = currentStream;
        video.play();
        statusDiv.innerText = 'الكاميرا تعمل. انتظر التعرف...';
        video.onloadedmetadata = () => {
            recognizeFaceContinuously();
        };
    } catch (err) {
        statusDiv.innerText = 'خطأ في الكاميرا: ' + err.message;
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
                locationDiv.innerText = `الموقع: ${currentLocation}`;
            },
            (error) => {
                locationDiv.innerText = 'فشل الحصول على الموقع';
                currentLocation = 'غير متوفر';
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        locationDiv.innerText = 'المتصفح لا يدعم تحديد الموقع';
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
        statusDiv.innerText = `تم تحميل ${labeledDescriptors.length} موظف`;
    } else {
        statusDiv.innerText = 'لا يوجد موظفون مسجلون';
    }
}

// حفظ الموظفين
function saveEmployees() {
    const data = labeledDescriptors.map(ld => ({
        label: ld.label,
        descriptors: ld.descriptors.map(d => Array.from(d))
    }));
    localStorage.setItem('axentro_face_descriptors', JSON.stringify(data));
    statusDiv.innerText = `تم حفظ ${labeledDescriptors.length} موظف`;
}

// التعرف المستمر
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
                statusDiv.innerText = `مرحباً ${bestMatch.label}`;
                currentRecognizedName = bestMatch.label;
            } else {
                statusDiv.innerText = 'وجه غير مسجل';
                currentRecognizedName = null;
            }
        } else if (resizedDetections.length === 0) {
            statusDiv.innerText = 'لم يتم اكتشاف وجه';
            currentRecognizedName = null;
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

// إرسال البيانات
async function sendAttendance(name, type) {
    if (!name) {
        alert('لم يتم التعرف على الوجه');
        return;
    }
    if (!currentLocation) {
        alert('جاري الحصول على الموقع... حاول مرة أخرى');
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
    
    statusDiv.innerText = 'جاري الإرسال...';
    try {
        await fetch(googleScriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        statusDiv.innerText = `تم تسجيل ${type} بنجاح للموظف ${name}`;
        alert(`تم تسجيل ${type}`);
    } catch (err) {
        statusDiv.innerText = 'خطأ في الإرسال';
        console.error(err);
    }
}

// تسجيل موظف جديد
async function registerEmployee() {
    const name = empNameInput.value.trim();
    if (!name) {
        alert('يرجى إدخال اسم الموظف');
        return;
    }
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
        alert('لم يتم اكتشاف وجه');
        return;
    }
    const descriptor = detection.descriptor;
    const existing = labeledDescriptors.find(ld => ld.label === name);
    if (existing) {
        existing.descriptors.push(descriptor);
        statusDiv.innerText = `تمت إضافة واصف جديد للموظف ${name}`;
    } else {
        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(name, [descriptor]));
        statusDiv.innerText = `تم تسجيل الموظف ${name}`;
    }
    saveEmployees();
    empNameInput.value = '';
}

// الأحداث
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
