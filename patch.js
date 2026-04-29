(function(){
  'use strict';

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function toast(msg, type='info', duration){
    if (window.ui?.showToast) return window.ui.showToast(msg, type, duration);
    console.log(`[${type}] ${msg}`);
  }

  function scrollTopNow(){
    window.scrollTo({top:0, left:0, behavior:'instant' in window ? 'instant' : 'auto'});
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  async function waitForAppReady(timeoutMs = 12000){
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (window.app && window.auth && window.db) return true;
      await new Promise(r => setTimeout(r, 120));
    }
    return false;
  }

  async function getActiveWorksite(){
    try {
      if (!window.db?.from) return null;
      let query = window.db.from((window.AppConfig?.supabase?.tables?.worksites) || 'worksites').select('*').eq('is_active', true).limit(1);
      const { data, error } = await query;
      if (error) throw error;
      return Array.isArray(data) ? (data[0] || null) : data;
    } catch (e) {
      console.warn('Active worksite load failed:', e?.message || e);
      return null;
    }
  }

  async function applyActiveWorksiteToConfig(){
    const worksite = await getActiveWorksite();
    if (!worksite || !window.AppConfig) return null;
    AppConfig.location = AppConfig.location || {};
    AppConfig.location.office = AppConfig.location.office || {};
    AppConfig.location.office.latitude = Number(worksite.latitude);
    AppConfig.location.office.longitude = Number(worksite.longitude);
    AppConfig.location.office.name = worksite.name || 'المقر الرئيسي';
    AppConfig.location.maxDistanceMeters = Number(worksite.allowed_radius_meters || 500);
    AppConfig.location.maxAccuracyMeters = Number(worksite.max_accuracy_meters || 50);
    return worksite;
  }

  function ensureRefreshButtons(){
    const targets = [
      { header: '#dashboardPage .header-actions', id: 'refreshBtn' },
      { header: '#adminPage .header-actions', id: 'adminRefreshBtn' }
    ];
    for (const t of targets) {
      const header = qs(t.header);
      if (!header || qs(`#${t.id}`)) continue;
      const btn = document.createElement('button');
      btn.className = 'icon-btn';
      btn.id = t.id;
      btn.title = 'تحديث البيانات';
      btn.innerHTML = '<i class="fas fa-rotate-right"></i>';
      const logoutBtn = header.querySelector('[id$="LogoutBtn"], #logoutBtn');
      if (logoutBtn) header.insertBefore(btn, logoutBtn);
      else header.appendChild(btn);
      btn.addEventListener('click', async () => {
        try {
          if (window.user?.role === 'admin' || window.user?.isAdmin) {
            await window.loadEmployees?.();
          } else {
            await window.fetchUserDataInBackground?.();
          }
          toast('تم تحديث البيانات بنجاح', 'success');
        } catch (e) {
          console.error(e);
          toast('تعذر تحديث البيانات', 'error');
        }
      });
    }
  }

  function buildAvatarMarkup(src, fallbackText) {
    const safe = src ? String(src) : '';
    return `
      <div class="profile-avatar ${safe ? 'has-image' : ''}">
        ${safe ? `<img src="${safe}?t=${Date.now()}" alt="profile">` : `<span>${fallbackText || 'A'}</span>`}
      </div>`;
  }

  function updateProfileAvatars(){
    const user = window.user || {};
    const isAdmin = user.role === 'admin' || user.isAdmin;
    const fallback = ((user.name || user.display_name || user.username || user.code || 'U').trim()[0] || 'U').toUpperCase();
    const image = user.avatar_image_url || window.userAvatarImage || user.profile_image_url || window.userImage || '';

    const userInfoBlocks = [
      qs('#dashboardPage .dashboard-header .user-info'),
      qs('#adminPage .dashboard-header .user-info')
    ].filter(Boolean);

    userInfoBlocks.forEach(block => {
      if (!block.querySelector('.profile-avatar')) {
        block.insertAdjacentHTML('afterbegin', buildAvatarMarkup(image, fallback));
      } else {
        block.querySelector('.profile-avatar').outerHTML = buildAvatarMarkup(image, fallback);
      }
    });

    document.body.classList.toggle('is-admin-user', !!isAdmin);
  }

  function enhanceLoginLayout(){
    const loginPage = qs('#loginPage');
    const authContainer = qs('#loginPage .auth-container');
    if (!loginPage || !authContainer || loginPage.querySelector('.login-split-shell')) return;

    const authLinks = authContainer.querySelector('.auth-links');
    const legacyFooter = authContainer.querySelector('.legacy-footer');

    const shell = document.createElement('div');
    shell.className = 'login-split-shell';

    const left = document.createElement('aside');
    left.className = 'login-side-panel';
    left.innerHTML = `
      <div class="login-side-content">
        <div class="login-side-links">
          <button type="button" class="btn btn-outline btn-block" id="sideRegisterBtn">إنشاء حساب جديد</button>
          <button type="button" class="btn btn-outline btn-block" id="sideForgotBtn">نسيت كلمة المرور؟</button>
        </div>
        <div class="login-side-footer">
          <p class="footer-copy">© 2024 Axentro – All Rights Reserved</p>
          <p class="footer-copy">By Axentro Team</p>
          <a href="https://axentro-official.github.io/axentro-website/links.html" target="_blank" rel="noopener noreferrer" class="footer-qr-link">
            <img src="qr-links.png" alt="QR Code" class="footer-qr-img">
          </a>
          <p class="footer-copy">QR Code</p>
          <p class="footer-qr-text">Scan Me &gt; Click On Me</p>
        </div>
      </div>`;

    const right = document.createElement('div');
    right.className = 'login-form-panel';
    authContainer.parentNode.insertBefore(shell, authContainer);
    right.appendChild(authContainer);
    shell.append(left, right);

    if (authLinks) authLinks.style.display = 'none';
    if (legacyFooter) legacyFooter.style.display = 'none';

    qs('#sideRegisterBtn', left)?.addEventListener('click', () => window.auth?.showRegisterScreen?.());
    qs('#sideForgotBtn', left)?.addEventListener('click', () => window.showForgotPasswordScreen?.());
  }

  function openModal(modalId){
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function closeModal(modalId){
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  function rebuildSettingsModal(){
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    modal.innerHTML = `
      <div class="modal-content settings-modal-pro" style="max-width:760px;">
        <div class="modal-header">
          <h3><i class="fas fa-cog"></i> الإعدادات</h3>
          <button class="close-modal" type="button" data-close-settings>&times;</button>
        </div>
        <div class="modal-body settings-grid-pro">
          <section class="settings-card">
            <h4><i class="fas fa-user-circle"></i> الملف الشخصي</h4>
            <div id="settingsProfilePreview" class="settings-profile-preview"></div>
            <div class="settings-actions-stack">
              <button type="button" class="btn btn-outline" id="changeFaceBtn"><i class="fas fa-camera-retro"></i> تحديث بصمة الوجه</button>
            </div>
            <p class="settings-help">سيُطلب تأكيد كلمة المرور الحالية قبل تحديث بصمة الوجه أو صورة الملف.</p>
          </section>
          <section class="settings-card">
            <h4><i class="fas fa-sliders-h"></i> تفضيلات النظام</h4>
            <label class="setting-row"><span>الإشعارات الصوتية</span><input type="checkbox" id="soundEnabled"></label>
            <label class="setting-row"><span>الاهتزازات</span><input type="checkbox" id="vibrationEnabled"></label>
            <label class="setting-row"><span>وضع توفير البيانات</span><input type="checkbox" id="dataSaverMode"></label>
            <div class="settings-actions-stack">
              <button type="button" class="btn btn-primary" id="saveLocalPrefsBtn"><i class="fas fa-save"></i> حفظ التفضيلات</button>
            </div>
          </section>
          <section class="settings-card admin-only-settings" id="worksiteSettingsCard">
            <h4><i class="fas fa-location-dot"></i> إعدادات المقر</h4>
            <div class="settings-form-grid">
              <input type="hidden" id="worksiteId">
              <div class="input-group compact"><label>اسم المقر</label><input type="text" id="worksiteName"></div>
              <div class="input-group compact"><label>Latitude</label><input type="number" step="0.0000001" id="worksiteLat"></div>
              <div class="input-group compact"><label>Longitude</label><input type="number" step="0.0000001" id="worksiteLng"></div>
              <div class="input-group compact"><label>المسافة المسموحة (متر)</label><input type="number" min="1" id="worksiteRadius"></div>
              <div class="input-group compact"><label>أقصى دقة GPS (متر)</label><input type="number" min="1" id="worksiteAccuracy"></div>
            </div>
            <div class="settings-actions-stack">
              <button type="button" class="btn btn-primary" id="saveWorksiteBtn"><i class="fas fa-floppy-disk"></i> حفظ إعدادات المقر</button>
            </div>
            <p class="settings-help">لن يستطيع الموظف تسجيل الحضور أو الانصراف إلا إذا كان داخل المسافة المحددة من هذا الموقع.</p>
          </section>
          <section class="settings-card danger-zone">
            <h4><i class="fas fa-triangle-exclamation"></i> منطقة حساسة</h4>
            <button type="button" class="btn btn-danger" id="clearLocalDataBtn"><i class="fas fa-trash"></i> مسح بيانات الجلسة المحلية</button>
          </section>
        </div>
      </div>`;

    modal.querySelector('[data-close-settings]')?.addEventListener('click', () => closeModal('settingsModal'));
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal('settingsModal'); });
  }

  function syncSettingsProfile(){
    const holder = document.getElementById('settingsProfilePreview');
    if (!holder) return;
    const user = window.user || {};
    const name = user.name || user.display_name || user.username || user.code || 'مستخدم';
    const code = user.code || user.username || '';
    const image = user.avatar_image_url || window.userAvatarImage || user.profile_image_url || window.userImage || '';
    const fallback = (String(name).trim()[0] || 'U').toUpperCase();
    holder.innerHTML = `
      ${buildAvatarMarkup(image, fallback)}
      <div>
        <strong>${name}</strong>
        <p>${code}</p>
      </div>`;
  }

  function syncLocalPreferenceInputs(){
    const sound = document.getElementById('soundEnabled');
    const vibration = document.getElementById('vibrationEnabled');
    const saver = document.getElementById('dataSaverMode');
    if (sound) sound.checked = localStorage.getItem('axentro_sound_enabled') !== 'false';
    if (vibration) vibration.checked = localStorage.getItem('axentro_vibration_enabled') !== 'false';
    if (saver) saver.checked = localStorage.getItem('axentro_data_saver') === 'true';
  }

  async function populateWorksiteForm(){
    const card = document.getElementById('worksiteSettingsCard');
    const isAdmin = !!(window.user?.role === 'admin' || window.user?.isAdmin);
    if (card) card.style.display = isAdmin ? '' : 'none';
    if (!isAdmin) return;
    const worksite = await applyActiveWorksiteToConfig();
    if (!worksite) return;
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ''; };
    set('worksiteId', worksite.id);
    set('worksiteName', worksite.name);
    set('worksiteLat', worksite.latitude);
    set('worksiteLng', worksite.longitude);
    set('worksiteRadius', worksite.allowed_radius_meters);
    set('worksiteAccuracy', worksite.max_accuracy_meters);
  }

  async function saveWorksiteSettings(){
    try {
      const id = document.getElementById('worksiteId')?.value;
      if (!id) throw new Error('لم يتم العثور على المقر النشط');
      const payload = {
        name: document.getElementById('worksiteName')?.value?.trim(),
        latitude: Number(document.getElementById('worksiteLat')?.value),
        longitude: Number(document.getElementById('worksiteLng')?.value),
        allowed_radius_meters: Number(document.getElementById('worksiteRadius')?.value),
        max_accuracy_meters: Number(document.getElementById('worksiteAccuracy')?.value),
        updated_at: new Date().toISOString()
      };
      const { error } = await window.db.from((AppConfig?.supabase?.tables?.worksites) || 'worksites').update(payload).eq('id', id);
      if (error) throw error;
      await applyActiveWorksiteToConfig();
      toast('تم حفظ إعدادات المقر بنجاح', 'success');
      closeModal('settingsModal');
    } catch (e) {
      console.error(e);
      toast(e?.message || 'فشل حفظ إعدادات المقر', 'error');
    }
  }

  async function promptCurrentPasswordThenUpdateFace(){
    const user = window.user || {};
    const identifier = user.role === 'admin' || user.isAdmin ? (user.username || 'admin') : user.code;
    const password = window.prompt('أدخل كلمة المرور الحالية لتأكيد تحديث بصمة الوجه');
    if (!password) return;
    try {
      const authCheck = await window.db.signIn(identifier, password);
      if (!authCheck?.success) throw new Error(authCheck?.error || 'كلمة المرور الحالية غير صحيحة');
      window.updateFaceMode = true;
      window.firstTimeSetupMode = false;
      window.attMode = false;
      window.regMode = false;
      await window.openCamera?.();
      closeModal('settingsModal');
      toast('ثبّت وجهك داخل الإطار لتحديث البصمة والصورة الشخصية', 'info', 5000);
    } catch (e) {
      console.error(e);
      toast(e?.message || 'تعذر تأكيد كلمة المرور الحالية', 'error');
    }
  }

  async function saveLocalPreferences(){
    localStorage.setItem('axentro_sound_enabled', String(!!document.getElementById('soundEnabled')?.checked));
    localStorage.setItem('axentro_vibration_enabled', String(!!document.getElementById('vibrationEnabled')?.checked));
    localStorage.setItem('axentro_data_saver', String(!!document.getElementById('dataSaverMode')?.checked));
    window.soundEnabled = document.getElementById('soundEnabled')?.checked;
    window.vibrationEnabled = document.getElementById('vibrationEnabled')?.checked;
    toast('تم حفظ التفضيلات بنجاح', 'success');
  }

  function wireSettingsButtons(){
    const openSettings = async () => {
      rebuildSettingsModal();
      syncSettingsProfile();
      syncLocalPreferenceInputs();
      await populateWorksiteForm();
      openModal('settingsModal');
      document.getElementById('saveLocalPrefsBtn')?.addEventListener('click', saveLocalPreferences);
      document.getElementById('saveWorksiteBtn')?.addEventListener('click', saveWorksiteSettings);
      document.getElementById('changeFaceBtn')?.addEventListener('click', promptCurrentPasswordThenUpdateFace);
      document.getElementById('clearLocalDataBtn')?.addEventListener('click', async () => {
        const ok = await window.ui?.showConfirmation?.({
          title: 'مسح بيانات الجلسة',
          message: 'سيتم حذف بيانات الجلسة المحلية فقط من هذا الجهاز. هل تريد المتابعة؟',
          confirmText: 'نعم، امسح',
          cancelText: 'إلغاء',
          type: 'danger'
        });
        if (!ok) return;
        localStorage.clear();
        sessionStorage.clear();
        toast('تم مسح بيانات الجلسة المحلية', 'success');
        closeModal('settingsModal');
      });
    };

    ['settingsBtn','adminSettingsBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn && !btn.dataset.patchedSettings) {
        btn.dataset.patchedSettings = '1';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          openSettings();
        });
      }
    });
  }

  function installAdminHelpers(){
    window.admin = window.adminManager || window.admin;

    if (window.adminManager) {
      window.adminManager.refreshData = async function(){
        await window.loadEmployees?.();
        toast('تم تحديث بيانات الموظفين', 'success');
      };
      window.adminManager.exportEmployeesList = function(){
        const rows = Array.isArray(this.employeesList) ? this.employeesList : [];
        if (!rows.length) return toast('لا توجد بيانات لتصديرها', 'warning');
        const headers = ['الكود','الاسم','البريد','تم تسجيل الوجه','تاريخ الإنشاء'];
        const data = rows.map(r => [r.code, r.name, r.email || '', r.face_descriptor ? 'نعم' : 'لا', r.created_at || '']);
        const csv = [headers, ...data].map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employees-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast('تم تصدير القائمة بنجاح', 'success');
      };
    }

    window.openAddEmployeeModal = function(){ openModal('addEmployeeModal'); };
    const modal = document.getElementById('addEmployeeModal');
    if (modal) {
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal('addEmployeeModal'); });
      qsa('[onclick*="addEmployeeModal"]', modal).forEach(btn => {
        btn.onclick = () => closeModal('addEmployeeModal');
      });
    }

    const form = document.getElementById('addEmployeeModalForm');
    if (form && !form.dataset.patchedSubmit) {
      form.dataset.patchedSubmit = '1';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newEmpName')?.value?.trim();
        const email = document.getElementById('newEmpEmail')?.value?.trim();
        if (!name || !email) return toast('يرجى إدخال الاسم والبريد الإلكتروني', 'error');
        const submitBtn = form.querySelector('button[type="submit"]');
        const original = submitBtn?.innerHTML;
        try {
          if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...'; }
          const result = await window.db.createEmployee({ name, email });
          if (!result?.success) throw new Error(result?.error || 'فشل إنشاء الموظف');
          form.reset();
          closeModal('addEmployeeModal');
          await window.loadEmployees?.();
          toast('تم إنشاء الموظف وإرسال البريد بنجاح', 'success');
        } catch (err) {
          console.error(err);
          toast(err?.message || 'فشل إنشاء الموظف', 'error');
        } finally {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = original; }
        }
      });
    }

    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput && !searchInput.dataset.patchedSearch) {
      searchInput.dataset.patchedSearch = '1';
      searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim().toLowerCase();
        const rows = (window.adminManager?.employeesList || []).filter(emp => {
          const hay = `${emp.code || ''} ${emp.name || ''} ${emp.email || ''}`.toLowerCase();
          return !term || hay.includes(term);
        });
        window.adminManager?.populateEmployeesTable?.(rows);
      });
    }
  }

  async function loadEmployeesPatched(){
    try {
      const employees = await window.db.getAllEmployees();
      window.admin = window.adminManager || window.admin;
      if (window.adminManager) {
        window.adminManager.employeesList = employees;
        window.adminManager.populateEmployeesTable?.(employees);
      }
      const total = employees.length;
      const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
      setText('adminTotalEmp', total);
      setText('totalEmployeesStat', total);
      const month = new Date();
      const thisMonth = employees.filter(emp => {
        const d = emp.created_at ? new Date(emp.created_at) : null;
        return d && d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
      }).length;
      setText('adminNewThisMonth', thisMonth);

      try {
        const start = new Date(); start.setHours(0,0,0,0);
        const { data: today } = await window.db.from((AppConfig?.supabase?.tables?.attendance) || 'attendance')
          .select('type,created_at')
          .gte('created_at', start.toISOString());
        const checkIns = (today || []).filter(r => r.type === 'حضور').length;
        const checkOuts = (today || []).filter(r => r.type === 'انصراف').length;
        setText('adminTodayCheckIns', checkIns);
        setText('adminTodayCheckOuts', checkOuts);
      } catch (e) {
        console.warn('Attendance stats load warning:', e?.message || e);
      }
      return employees;
    } catch (e) {
      console.error('loadEmployees patched failed:', e);
      toast('تعذر تحميل قائمة الموظفين', 'error');
      return [];
    }
  }

  function patchGlobalLoaders(){
    window.loadEmployees = loadEmployeesPatched;
    if (window.attendance) window.attendance.loadEmployees = loadEmployeesPatched;
  }

  function patchLogout(){
    if (!window.auth || window.auth.__logoutPatched) return;
    const original = window.auth.logout.bind(window.auth);
    window.auth.__baseLogout = original;
    window.auth.logout = async function(force = false){
      if (force === true) {
        const result = original();
        setTimeout(scrollTopNow, 50);
        return result;
      }
      const confirmed = await window.ui?.showConfirmation?.({
        title: 'تسجيل الخروج',
        message: 'هل تريد تسجيل الخروج من النظام الآن؟',
        confirmText: 'تسجيل الخروج',
        cancelText: 'البقاء داخل النظام',
        type: 'warning'
      });
      if (!confirmed) return false;
      const result = original();
      setTimeout(() => {
        scrollTopNow();
        toast('تم تسجيل الخروج بنجاح', 'success');
      }, 80);
      return result;
    };
    window.auth.__logoutPatched = true;

    ['logoutBtn', 'adminLogoutBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn && !btn.dataset.logoutPatched) {
        btn.dataset.logoutPatched = '1';
        btn.onclick = (e) => { e.preventDefault(); window.auth.logout(); };
      }
    });
  }


  function patchFaceCaptureHandlers(){
    const wrap = (name) => {
      const original = window[name];
      if (typeof original !== 'function' || original.__patchedProfile) return;
      window[name] = async function(...args){
        const result = await original.apply(this, args);
        try {
          const ctx = await window.db?.getFaceContext?.(window.user);
          if (ctx && ctx.profile_image_url) {
            window.userImage = ctx.profile_image_url;
            if (window.user) window.user.profile_image_url = ctx.profile_image_url;
            if (window.auth?.updateStoredSession) window.auth.updateStoredSession(window.user);
            updateProfileAvatars();
          }
        } catch (e) { console.warn('Profile sync after face capture failed:', e?.message || e); }
        return result;
      };
      window[name].__patchedProfile = true;
    };
    ['handleFirstTimeSetupCapture','handleFaceUpdateCapture'].forEach(wrap);
  }

  function patchImageQuality(){
    if (!window.faceRecognition || window.faceRecognition.__qualityPatched) return;
    window.faceRecognition.createStorageImageBlob = function(){
      const video = this.videoElement || document.getElementById('video');
      if (!video || !video.videoWidth || !video.videoHeight) return Promise.resolve(null);
      const sourceBox = this.lastDetectionRaw?.detection?.box || this.lastDetectionRaw?.box || null;
      const canvas = document.createElement('canvas');
      const maxDim = 900;
      const quality = 0.97;
      let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
      if (sourceBox) {
        const padX = sourceBox.width * 0.42;
        const padY = sourceBox.height * 0.50;
        sx = Math.max(0, Math.floor(sourceBox.x - padX));
        sy = Math.max(0, Math.floor(sourceBox.y - padY));
        sw = Math.min(video.videoWidth - sx, Math.floor(sourceBox.width + padX * 2));
        sh = Math.min(video.videoHeight - sy, Math.floor(sourceBox.height + padY * 2));
      }
      const ratio = Math.min(maxDim / sw, maxDim / sh, 1);
      canvas.width = Math.max(1, Math.round(sw * ratio));
      canvas.height = Math.max(1, Math.round(sh * ratio));
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    };
    window.faceRecognition.__qualityPatched = true;
  }

  async function initPatch(){
    const ready = await waitForAppReady();
    if (!ready) return;
    enhanceLoginLayout();
    // Keep the original settings modal from index.html.
    // Rebuilding it here removed the worksite fields and caused an empty modal.
    ensureRefreshButtons();
    patchGlobalLoaders();
    installAdminHelpers();
    patchLogout();
    patchImageQuality();
    patchFaceCaptureHandlers();
    await applyActiveWorksiteToConfig();
    updateProfileAvatars();
    scrollTopNow();

    const originalShowMainApp = window.app?.showMainApp?.bind(window.app);
    if (originalShowMainApp && !window.app.__showMainPatched) {
      window.app.showMainApp = function(){
        const result = originalShowMainApp();
        setTimeout(async () => {
          patchGlobalLoaders();
          installAdminHelpers();
          ensureRefreshButtons();
          updateProfileAvatars();
          await applyActiveWorksiteToConfig();
          if (window.user?.role === 'admin' || window.user?.isAdmin) {
            await window.loadEmployees?.();
          }
          scrollTopNow();
        }, 50);
        return result;
      };
      window.app.__showMainPatched = true;
    }

    if (window.user?.role === 'admin' || window.user?.isAdmin) {
      await window.loadEmployees?.();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPatch);
  } else {
    initPatch();
  }

  window.addEventListener('load', () => setTimeout(initPatch, 250));
})();
