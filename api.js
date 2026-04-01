// api.js
import { CONFIG } from './config.js';

let currentToken = null; // سيتم تعيينه بعد تسجيل الدخول

export function setAuthToken(token) {
    currentToken = token;
}

export function getAuthToken() {
    return currentToken;
}

export function clearAuthToken() {
    currentToken = null;
}

async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : CONFIG.URL + endpoint;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    const body = options.body ? JSON.stringify(options.body) : undefined;
    const response = await fetch(url, { ...options, headers, body });
    return response.json();
}

// دوال مخصصة
export async function verifyLogin(code, password) {
    const data = await request(`?action=verifyLogin&code=${encodeURIComponent(code)}&password=${encodeURIComponent(password)}`);
    return data;
}

export async function getEmployeeData(code) {
    const data = await request(`?action=getEmployeeData&code=${encodeURIComponent(code)}`);
    return data;
}

export async function getEmployeesList() {
    if (!currentToken) throw new Error('غير مصرح');
    const data = await request(`?action=getEmployees&token=${encodeURIComponent(currentToken)}`);
    return data;
}

export async function getEmployeeReport(code) {
    const data = await request(`?action=getEmployeeReport&code=${encodeURIComponent(code)}`);
    return data;
}

export async function registerEmployee(name, email, descriptor, imageData) {
    const body = { action: 'register', name, email, descriptor, imageData };
    const data = await request(CONFIG.URL, { method: 'POST', body });
    return data;
}

export async function recordAttendance(name, code, type, location, datetime, imageData, shift, token) {
    const body = { action: 'attendance', name, code, type, location, datetime, imageData, shift, token };
    const data = await request(CONFIG.URL, { method: 'POST', body });
    return data;
}

export async function changePassword(code, oldPassword, newPassword, token) {
    const body = { action: 'changePassword', code, oldPassword, newPassword, token };
    const data = await request(CONFIG.URL, { method: 'POST', body });
    return data;
}

export async function forgotPassword(code) {
    const body = { action: 'forgotPassword', code };
    const data = await request(CONFIG.URL, { method: 'POST', body });
    return data;
}

export async function updateFace(code, descriptor, imageData, token) {
    const body = { action: 'updateFace', code, descriptor, imageData, token };
    const data = await request(CONFIG.URL, { method: 'POST', body });
    return data;
}

export async function logoutApi(token) {
    const body = { action: 'logout', token };
    const data = await request(CONFIG.URL, { method: 'POST', body });
    return data;
}

export async function verifyToken(token) {
    const data = await request(`?action=verifyToken&token=${encodeURIComponent(token)}`);
    return data;
}
