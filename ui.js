// ui.js
import { CONFIG } from './config.js';
import { user, sessionDescriptor, showApp, fetchUserDataInBackground, logout, handleLogin } from './auth.js';
import { getEmployeesList, getEmployeeReport, changePassword, forgotPassword, recordAttendance } from './api.js';
import { openCamera, closeCamera, setAttMode, setAdminVerifyMode, setFirstTimeSetupMode, clearModes } from './face.js';

let employees = [];

export function playSound(id) {
    try { const audio = document.getElementById(id); if(audio) { audio.currentTime = 0; audio.play().catch(e=>{}); } } catch(e){}
}
export function showToast(msg, type='') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => t.classList.remove('show'), 4000);
}
export function setStatus(txt) { document.getElementById('connText').textContent = txt; }
export function setCamStatus(html) {
    const elem = document.getElementById('camStatus');
    if(elem.innerHTML !== html) elem.innerHTML = html;
}
export function togglePassword(id) {
    const i = document.getElementById(id);
    i.type = i.type === 'password' ? 'text' : 'password';
}
export function selectShift(element) {
    document.querySelectorAll('.shift-card').forEach(c=>c.classList.remove('selected'));
    element.classList.add('selected');
    element.querySelector('input').checked=true;
}

export async function refreshData() {
    const icon = document.getElementById('refreshBtn').querySelector('i');
    icon.style.animation='spin 0.5s linear';
    setTimeout(()=>icon.style.animation='',600);
    if(user?.isAdmin) await loadEmployees();
    else if(user) fetchUserDataInBackground();
    showToast('تم التحديث','success');
}

export async function loadEmployees() {
    try {
        const d = await getEmployeesList();
        if(d.success) {
            employees = d.employees;
            document.getElementById('empCount').textContent=employees.length;
            renderEmployeeList(employees);
            setStatus('متصل');
        }
    } catch(e) {
        setStatus('غير متصل');
        console.error(e);
    }
}

function renderEmployeeList(list) {
    const container = document.getElementById('searchResults');
    if(!list.length) {
        container.innerHTML='<p style="text-align:center; color:#64748b; padding:30px;">لا يوجد موظفين</p>';
        return;
    }
    container.innerHTML = list.map(e => `<div class="emp-item"><div class="emp-info"><h4>${e.name}</h4><p>${e.code}</p></div><div class="emp-actions"><button class="btn btn-sm btn-att" onclick="window.adminDirectAtt('حضور', '${e.code}', '${e.name}')"><i class="fas fa-check"></i></button><button class="btn btn-sm btn-leave" onclick="window.adminDirectAtt('انصراف', '${e.code}', '${e.name}')"><i class="fas fa-times"></i></button><button class="btn btn-sm btn-report" onclick="window.loadEmpReport('${e.code}', '${e.name}')"><i class="fas fa-chart-bar"></i></button></div></div>`).join('');
}

export function adminDirectAtt(type, code, name) {
    if(!sessionDescriptor) {
        showToast('لا يوجد بصمة أدمن، جاري التسجيل...','error');
        setFirstTimeSetupMode();
        openCamera().catch(()=>setFirstTimeSetupMode(false));
        return;
    }
    setAdminVerifyMode({ type, code, name });
    openCamera().catch(()=>{ setAdminVerifyMode(false); showToast('فشل فتح الكاميرا','error'); });
}

export async function handleAttendance(type) {
    if(!sessionDescriptor) return showToast('بيانات الوجه غير مسجلة، تواصل مع الأدمن.','error');
    setAttMode(type);
    const ok = await openCamera();
    if(!ok) { clearModes(); showToast('فشل فتح الكاميرا','error'); }
    else setStatus('جاري التحقق من الوجه...');
}

export async function submitChangePassword() {
    if(window.pwChangeMode === 'own') {
        const o = document.getElementById('oldPassword').value.trim();
        const n = document.getElementById('newPassword').value.trim();
        if(!o||!n) return showToast('يرجى ملء الحقول','error');
        if(!sessionDescriptor) return showToast('لا توجد بصمة مسجلة لك','error');
        window._pendingPwChange = { code: user.code, oldPassword: o, newPassword: n };
        closeChangePwModal();
        setAttMode('تغيير كلمة المرور');
        openCamera();
        return;
    } else {
        const c = document.getElementById('targetEmpCode').value.trim();
        const n = document.getElementById('newPassword').value.trim();
        if(!c||!n) return showToast('يرجى إدخال البيانات','error');
        try {
            const data = await changePassword(c, null, n, getAuthToken());
            if(data.success) {
                playSound('login-success'); showToast('تم التغيير بنجاح','success');
                closeChangePwModal();
            } else {
                playSound('login-error'); showToast(data.error,'error');
            }
        } catch(e) {
            playSound('login-error'); showToast('خطأ','error');
        }
    }
}

let pwChangeMode = '';
export function openChangePwModal(mode) {
    pwChangeMode = mode;
    const body = document.getElementById('changePwBody');
    const title = document.getElementById('changePwTitle');
    if(mode==='own') {
        title.textContent='تغيير كلمة السر الخاصة بي';
        body.innerHTML=`<div class="password-wrapper"><input type="password" id="oldPassword" placeholder="كلمة السر الحالية"><button class="toggle-password" onclick="togglePassword('oldPassword')"><i class="fas fa-eye"></i></button></div><div class="password-wrapper"><input type="password" id="newPassword" placeholder="كلمة السر الجديدة"><button class="toggle-password" onclick="togglePassword('newPassword')"><i class="fas fa-eye"></i></button></div><button class="btn btn-change-pw" onclick="submitChangePassword()">تحديث</button>`;
    } else {
        title.textContent='تغيير كلمة سر موظف';
        body.innerHTML=`<input type="text" id="targetEmpCode" placeholder="كود الموظف"><div class="password-wrapper"><input type="password" id="newPassword" placeholder="كلمة السر الجديدة"><button class="toggle-password" onclick="togglePassword('newPassword')"><i class="fas fa-eye"></i></button></div><button class="btn btn-change-pw" onclick="submitChangePassword()">تغيير</button>`;
    }
    document.getElementById('changePwModal').classList.add('active');
}
export function closeChangePwModal() { document.getElementById('changePwModal').classList.remove('active'); }

export async function loadMyReport() {
    document.getElementById('reportTitle').textContent=`تقرير ${user.name}`;
    document.getElementById('reportBody').innerHTML='<center style="padding:20px;"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</center>';
    document.getElementById('reportModal').classList.add('active');
    await fetchAndRenderReport(user.code);
}
export async function loadEmpReport(code, name) {
    document.getElementById('reportTitle').textContent=`تقرير ${name}`;
    document.getElementById('reportBody').innerHTML='<center style="padding:20px;"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</center>';
    document.getElementById('reportModal').classList.add('active');
    await fetchAndRenderReport(code);
}
async function fetchAndRenderReport(code) {
    try {
        const data = await getEmployeeReport(code);
        if(data.success && data.records.length>0) {
            document.getElementById('reportBody').innerHTML = `<table class="report-table"><thead><tr><th>التاريخ</th><th>الحالة</th><th>الشفت</th><th>الساعات</th></tr></thead><tbody>${data.records.map(r => `<tr><td style="font-size:12px;">${r.date}</td><td><span class="att-badge ${r.type==='حضور'?'att-in':'att-out'}">${r.type}</span></td><td style="font-size:11px;">${r.shift}</td><td style="font-weight:bold; color:${r.hours?'#38bdf8':'#64748b'}">${r.hours||'-'}</td></tr>`).join('')}</tbody></table>`;
        } else {
            document.getElementById('reportBody').innerHTML='<center style="color:#64748b; padding:30px;">لا توجد سجلات.</center>';
        }
    } catch(e) {
        document.getElementById('reportBody').innerHTML='<center style="color:#ef4444; padding:20px;">فشل التحميل</center>';
    }
}
export function closeReportModal() { document.getElementById('reportModal').classList.remove('active'); }

export async function calculateMonthlyHours() {
    try {
        const res = await getEmployeeReport(user.code);
        if(res.success && res.records.length>0) {
            const now = new Date();
            let totalHours=0;
            res.records.forEach(rec => {
                const recDate = new Date(rec.date);
                if(recDate.getMonth()===now.getMonth() && recDate.getFullYear()===now.getFullYear() && rec.type==='انصراف' && rec.hours) {
                    totalHours += parseFloat(rec.hours.split(' ')[0])||0;
                }
            });
            const elem = document.getElementById('monthHoursValue');
            if(elem) elem.textContent = totalHours>0 ? totalHours.toFixed(2)+' ساعة' : '0 ساعة';
        } else {
            const elem = document.getElementById('monthHoursValue');
            if(elem) elem.textContent='0 ساعة';
        }
    } catch(e) {
        const elem = document.getElementById('monthHoursValue');
        if(elem) elem.textContent='--';
    }
}

export function showForgotPw() {
    document.getElementById('forgotPwModal').classList.add('active');
    document.getElementById('forgotCode').value='';
}
export function closeForgotPw() { document.getElementById('forgotPwModal').classList.remove('active'); }
export async function submitForgotPw() {
    const code = document.getElementById('forgotCode').value.trim();
    if(!code) return showToast('يرجى إدخال الكود','error');
    try {
        const data = await forgotPassword(code);
        if(data.success) {
            playSound('login-success'); showToast(data.message,'success');
            closeForgotPw();
        } else {
            playSound('login-error'); showToast(data.error,'error');
        }
    } catch(e) {
        playSound('login-error'); showToast('خطأ في الاتصال','error');
    }
}

export function showRegisterScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.remove('hidden');
}
export function showLoginScreen() {
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}
export async function startRegistration() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    if(!name||!email) return showToast('يرجى إدخال الاسم والبريد','error');
    window.regData = { name, email };
    setRegMode(true);
    const ok = await openCamera();
    if(!ok) { clearModes(); showToast('فشل فتح الكاميرا','error'); }
}

export async function submitFirstPwChange() {
    const newPw = document.getElementById('firstNewPw').value.trim();
    if(!newPw || newPw.length<4) return showToast('كلمة السر ضعيفة','error');
    try {
        const data = await changePassword(user.code, null, newPw, getAuthToken());
        if(data.success) {
            document.getElementById('forcePwModal').classList.remove('active');
            playSound('login-success');
            showToast('تم تحديث كلمة السر، سجل بصمة وجهك الآن','success');
            setFirstTimeSetupMode();
            const opened = await openCamera();
            if(!opened) { setFirstTimeSetupMode(false); logout(); }
        } else {
            playSound('login-error'); showToast(data.error,'error');
        }
    } catch(e) {
        playSound('login-error'); showToast('خطأ في الاتصال','error');
    }
}

export function getLocation() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const locString = `https://maps.google.com/?q=${lat},${lon}`;
            setLocation(lat, lon, locString);
            const locBar = document.getElementById('locBar');
            locBar.innerHTML = `<i class="fas fa-map-marker-alt" style="color:var(--success);"></i> <a href="${locString}" target="_blank" style="color:#38bdf8; text-decoration:none;">الموقع محدد</a>`;
        }, () => {
            const locBar = document.getElementById('locBar');
            locBar.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i> <span style="color:#94a3b8;">تعذر تحديد الموقع</span>`;
            setLocation(null, null, 'غير متوفر');
        });
    }
}

// استيراد تابعي setRegMode و clearModes و setLocation من face.js
import { setRegMode, clearModes, setLocation } from './face.js';
import { getAuthToken } from './api.js';

// ربط الدوال العامة بالنافذة لتكون متاحة في الـ HTML
window.togglePassword = togglePassword;
window.selectShift = selectShift;
window.handleLogin = handleLogin;
window.handleAttendance = handleAttendance;
window.logout = logout;
window.refreshData = refreshData;
window.adminDirectAtt = adminDirectAtt;
window.loadEmpReport = loadEmpReport;
window.loadMyReport = loadMyReport;
window.openChangePwModal = openChangePwModal;
window.closeChangePwModal = closeChangePwModal;
window.submitChangePassword = submitChangePassword;
window.closeReportModal = closeReportModal;
window.showForgotPw = showForgotPw;
window.closeForgotPw = closeForgotPw;
window.submitForgotPw = submitForgotPw;
window.showRegisterScreen = showRegisterScreen;
window.showLoginScreen = showLoginScreen;
window.startRegistration = startRegistration;
window.submitFirstPwChange = submitFirstPwChange;
window.loginWithFingerprint = loginWithFingerprint;
