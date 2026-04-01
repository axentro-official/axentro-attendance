// app.js
import { initFace, loadModelsAsync } from './face.js';
import { restoreSession } from './auth.js';
import { getLocation } from './ui.js';
import { CONFIG } from './config.js';

async function init() {
    initFace();
    await restoreSession();
    loadModelsAsync();
    getLocation();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(err=>console.log('SW Error:',err));
    document.addEventListener('DOMContentLoaded',()=>{
        document.getElementById('loginCode')?.addEventListener('keypress',e=>{ if(e.key==='Enter') window.handleLogin(); });
        document.getElementById('loginPass')?.addEventListener('keypress',e=>{ if(e.key==='Enter') window.handleLogin(); });
        document.getElementById('forgotCode')?.addEventListener('keypress',e=>{ if(e.key==='Enter') window.submitForgotPw(); });
        if(window.PublicKeyCredential) document.getElementById('fingerprintLoginBtn').style.display='flex';
    });
}

init();
