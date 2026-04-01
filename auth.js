// auth.js
import { CONFIG } from './config.js';
import { verifyLogin, getEmployeeData, setAuthToken, getAuthToken, clearAuthToken, logoutApi, verifyToken } from './api.js';
import { showToast, playSound, setStatus } from './ui.js';
import { openCamera, closeCamera, setFirstTimeSetupMode, setUpdateFaceMode, setRegMode, clearModes } from './face.js';

export let user = null;
export let sessionDescriptor = null;
export let userImage = '';
let autoRefreshTimer = null;

export function setSessionDescriptor(desc) { sessionDescriptor = desc; }
export function setUserImage(img) { userImage = img; }

export async function handleLogin() {
    const code = document.getElementById('loginCode').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    if(!code || !pass) return showToast('يرجى إدخال الكود وكلمة السر', 'error');
    setStatus('جاري التحقق من بيانات الدخول...');
    try {
        const data = await verifyLogin(code, pass);
        if(data.success) {
            user = { name: data.name, code: data.code, isAdmin: data.isAdmin, isFirstLogin: data.isFirstLogin };
            setAuthToken(data.token);
            const rememberMe = document.getElementById('rememberMe').checked;
            if(rememberMe) {
                localStorage.setItem('rememberedUser', JSON.stringify({ data:user, timestamp:Date.now() }));
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('rememberMe', 'true');
            } else {
                sessionStorage.setItem('user', JSON.stringify(user));
                sessionStorage.setItem('authToken', data.token);
                localStorage.removeItem('rememberedUser');
                localStorage.removeItem('authToken');
                localStorage.removeItem('rememberMe');
            }
            
            if(!data.isAdmin && data.isFirstLogin) {
                document.getElementById('forcePwModal').classList.add('active');
                setStatus('النظام جاهز');
            } else {
                setStatus('جاري التحقق من وجود بصمة الوجه...');
                try {
                    const empData = await getEmployeeData(user.code);
                    sessionDescriptor = (empData.success && empData.descriptor && Array.isArray(empData.descriptor) && empData.descriptor.length > 0) ? empData.descriptor.map(Number) : null;
                    userImage = (empData.success && empData.userImage) ? empData.userImage : '';
                    
                    if(!sessionDescriptor) {
                        playSound('faceid-error'); showToast('يرجى تسجيل بصمة وجهك أولاً للدخول', 'error');
                        setFirstTimeSetupMode();
                        const opened = await openCamera();
                        if(!opened) { setFirstTimeSetupMode(false); logout(); }
                    } else {
                        showApp();
                        if(rememberMe && window.PublicKeyCredential) setTimeout(()=>registerFingerprint(),1000);
                    }
                } catch(e) { showToast('خطأ في جلب البيانات', 'error'); logout(); }
            }
        } else {
            playSound('login-error'); showToast(data.error||'بيانات خاطئة','error');
            setStatus('النظام جاهز');
        }
    } catch(e) {
        playSound('login-error'); showToast('خطأ في الاتصال بالخادم','error');
        setStatus('غير متصل');
    }
}

export async function logout() {
    playSound('logout-success');
    if(autoRefreshTimer) clearInterval(autoRefreshTimer);
    const token = getAuthToken();
    if(token) await logoutApi(token);
    localStorage.removeItem('rememberedUser');
    sessionStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    clearAuthToken();
    user = null;
    sessionDescriptor = null;
    userImage = '';
    document.getElementById('mainApp').style.display='none';
    document.getElementById('loginScreen').classList.remove('hidden');
    setStatus('النظام جاهز');
}

export async function restoreSession() {
    let savedToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if(savedToken) {
        const data = await verifyToken(savedToken);
        if(data.success && data.user) {
            user = data.user;
            setAuthToken(savedToken);
            // جلب بيانات الوجه من الخادم
            const empData = await getEmployeeData(user.code);
            sessionDescriptor = (empData.success && empData.descriptor && Array.isArray(empData.descriptor) && empData.descriptor.length > 0) ? empData.descriptor.map(Number) : null;
            userImage = (empData.success && empData.userImage) ? empData.userImage : '';
            showApp();
            return;
        }
    }
    // محاولة استعادة من localStorage القديم (للتوافق مع النسخ السابقة)
    const savedSessionStr = localStorage.getItem('rememberedUser');
    if(savedSessionStr) {
        try {
            const s = JSON.parse(savedSessionStr);
            if(Date.now()-s.timestamp < 10*60*60*1000) {
                user = s.data;
                // لا يوجد توكن هنا، لكن يمكننا محاولة تسجيل دخول جديد
                // أو طلب من المستخدم تسجيل الدخول مرة أخرى
                showToast('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى', 'error');
                localStorage.removeItem('rememberedUser');
            } else {
                localStorage.removeItem('rememberedUser');
            }
        } catch(e) { localStorage.removeItem('rememberedUser'); }
    }
    setStatus('النظام جاهز');
}

export function showApp() {
    if(autoRefreshTimer) clearInterval(autoRefreshTimer);
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('mainApp').style.display='block';
    if(user.isAdmin) {
        document.getElementById('mainAppTitle').textContent='لوحة تحكم المدير';
        document.getElementById('adminPanel').style.display='block';
        document.getElementById('employeePanel').style.display='none';
        playSound('login-success');
        showToast(`مرحباً بك في لوحة التحكم`,'success');
        const existing = document.getElementById('adminMicroInteractions');
        if(existing) existing.remove();
        document.getElementById('adminPanel').insertAdjacentHTML('afterbegin', `<div id="adminMicroInteractions"><div class="emp-profile-card"><img src="${userImage || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMjF2LTJhNCA0IDAgMCAwLTQtNEg4YTQgNCAwIDAgMC00IDR2MiI+PC9wYXRoPjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCI+PC9jaXJjbGU+PC9zdmc+'}" class="emp-profile-img" alt="Admin"><div><h3 style="margin:0; color:white; font-size:18px;">مرحباً بك يا ${user.name}</h3><p style="margin:0; color:#64748b; font-size:12px;">مدير النظام</p></div></div></div>`);
        loadEmployees();
    } else {
        document.getElementById('mainAppTitle').textContent='لوحة الموظف';
        document.getElementById('adminPanel').style.display='none';
        document.getElementById('employeePanel').style.display='block';
        playSound('login-success');
        const existing = document.getElementById('empMicroInteractions');
        if(existing) existing.remove();
        document.getElementById('employeePanel').insertAdjacentHTML('afterbegin', `<div id="empMicroInteractions"><div class="emp-profile-card"><img src="${userImage || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMjF2LTJhNCA0IDAgMCAwLTQtNEg4YTQgNCAwIDAgMC00IDR2MiI+PC9wYXRoPjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCI+PC9jaXJjbGU+PC9zdmc+'}" class="emp-profile-img" alt="Profile"><div><h3 style="margin:0; color:white; font-size:18px;">مرحباً يا ${user.name}</h3><p style="margin:0; color:#64748b; font-size:12px;">${user.code}</p></div></div><div id="monthlyHoursCard" class="emp-month-hours"><p style="color:#c4b5fd; font-size:13px; margin-bottom:5px;"><i class="fas fa-hourglass-half"></i> إجمالي ساعات العمل هذا الشهر</p><h2 id="monthHoursValue" style="color:white; font-size:28px; margin:0;">...</h2></div></div>`);
        calculateMonthlyHours();
    }
    autoRefreshTimer = setInterval(() => { if(user) refreshData(); }, CONFIG.AUTO_REFRESH_INTERVAL);
}

export async function fetchUserDataInBackground() {
    if(!user) return;
    try {
        const empData = await getEmployeeData(user.code);
        sessionDescriptor = (empData.success && empData.descriptor && Array.isArray(empData.descriptor) && empData.descriptor.length > 0) ? empData.descriptor.map(Number) : null;
        if(empData.success && empData.userImage) {
            userImage = empData.userImage;
            const img = document.querySelector('.emp-profile-img');
            if(img) img.src = userImage;
        }
        if(!sessionDescriptor && !document.getElementById('cameraOverlay').classList.contains('active')) {
            playSound('faceid-error'); showToast('يرجى تسجيل بصمة وجهك أولاً', 'error');
            setFirstTimeSetupMode();
            const opened = await openCamera();
            if(!opened) { setFirstTimeSetupMode(false); showToast('فشل فتح الكاميرا','error'); }
        }
    } catch(e) {} finally { setStatus('النظام جاهز'); }
}

// دوال البصمة (WebAuthn)
export async function registerFingerprint() {
    try {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge,
                rp:{ name:"Axentro Attendance System" },
                user:{ id:new Uint8Array(16), name:user.code, displayName:user.name },
                pubKeyCredParams:[{alg:-7,type:"public-key"},{alg:-257,type:"public-key"}],
                authenticatorSelection:{ authenticatorAttachment:"platform", userVerification:"required" },
                timeout:60000
            }
        });
        if(credential) {
            localStorage.setItem('axentro_fp_id', bufferToBase64(credential.rawId));
            showToast('تم تسجيل بصمة الإصبع بنجاح!','success');
        }
    } catch(e) {}
}

export async function loginWithFingerprint() {
    const savedFpId = localStorage.getItem('axentro_fp_id');
    const savedToken = localStorage.getItem('authToken');
    if(!savedFpId || !savedToken) {
        showToast('سجل دخولك عادياً أولاً وفعّل تذكرني','error');
        return;
    }
    try {
        setStatus('جاري التحقق من البصمة...');
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge,
                allowCredentials:[{ id:base64ToBuffer(savedFpId), type:'public-key' }],
                userVerification:"required"
            }
        });
        if(assertion) {
            setStatus('جاري التحقق مع السيرفر...');
            const data = await verifyToken(savedToken);
            if(data.success && data.user) {
                user = data.user;
                setAuthToken(savedToken);
                // جلب بيانات الوجه
                const empData = await getEmployeeData(user.code);
                sessionDescriptor = (empData.success && empData.descriptor && Array.isArray(empData.descriptor) && empData.descriptor.length > 0) ? empData.descriptor.map(Number) : null;
                userImage = (empData.success && empData.userImage) ? empData.userImage : '';
                showApp();
                fetchUserDataInBackground();
            } else {
                playSound('login-error'); showToast('فشل التحقق','error');
                setStatus('النظام جاهز');
            }
        }
    } catch(e) {
        if(e.name==='NotAllowedError') showToast('تم إلغاء البصمة','error');
        else showToast('فشل التحقق','error');
        setStatus('النظام جاهز');
    }
}

function bufferToBase64(buffer) {
    let binary='';
    const bytes=new Uint8Array(buffer);
    for(let i=0;i<bytes.byteLength;i++) binary+=String.fromCharCode(bytes[i]);
    return btoa(binary);
}
function base64ToBuffer(base64) {
    const binary=atob(base64);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return bytes.buffer;
}

// دوال مساعدة سيتم تعريفها لاحقًا في ui.js
import { loadEmployees, refreshData, calculateMonthlyHours, showRegisterScreen, showLoginScreen } from './ui.js';
