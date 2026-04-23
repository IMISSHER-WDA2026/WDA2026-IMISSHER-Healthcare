import './styles.css';
import { createBystanderIncident, fetchPublicProfile, normalizeApiBaseUrl } from './lib/sos-api';
import type { EmergencyContact, PublicUserProfile } from './types';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

type Lang = 'vi' | 'en';

const strings: Record<Lang, Record<string, string>> = {
    vi: {
        eyebrow: 'Hỗ trợ khẩn cấp',
        heroTitle: 'Thông tin y tế khẩn cấp',
        heroDesc: 'Trang này cho phép người xung quanh xem hồ sơ y tế và gửi cảnh báo tới hệ thống.',
        loading: 'Đang tải thông tin...',
        errorLoad: 'Không thể tải thông tin. Vui lòng kiểm tra lại kết nối.',
        bloodType: 'Nhóm máu',
        allergies: 'Dị ứng',
        conditions: 'Bệnh nền',
        emergencyContacts: 'Liên hệ khẩn cấp',
        callBtn: 'Gọi ngay',
        actionTitle: 'Gửi cảnh báo',
        alertNoteLabel: 'Ghi chú tình huống (tuỳ chọn)',
        alertNotePlaceholder: 'Mô tả tình huống khẩn cấp...',
        sendAlertText: 'Gửi cảnh báo SOS',
        sending: 'Đang gửi...',
        alertSuccess: 'Đã gửi cảnh báo SOS thành công!',
        alertError: 'Không thể gửi cảnh báo.',
        errorTitle: 'Liên kết không hợp lệ',
        errorMissingUserId: 'Thiếu tham số userId trong URL. Vui lòng quét lại mã QR để tiếp tục.',
        notProvided: 'Chưa cập nhật',
    },
    en: {
        eyebrow: 'Emergency Support',
        heroTitle: 'Emergency Medical Profile',
        heroDesc: 'This page lets bystanders view the patient\'s medical profile and send an SOS alert.',
        loading: 'Loading information...',
        errorLoad: 'Could not load profile. Please check your connection.',
        bloodType: 'Blood type',
        allergies: 'Allergies',
        conditions: 'Conditions',
        emergencyContacts: 'Emergency contacts',
        callBtn: 'Call now',
        actionTitle: 'Send alert',
        alertNoteLabel: 'Situation note (optional)',
        alertNotePlaceholder: 'Describe the emergency...',
        sendAlertText: 'Send SOS alert',
        sending: 'Sending...',
        alertSuccess: 'SOS alert sent successfully!',
        alertError: 'Could not send alert.',
        errorTitle: 'Invalid link',
        errorMissingUserId: 'Missing userId parameter in the URL. Please scan the QR code again to continue.',
        notProvided: 'Not provided',
    },
};

let currentLang: Lang = 'vi';

function t(key: string): string {
    return strings[currentLang][key] ?? key;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentUserId = '';
let currentProfile: PublicUserProfile | null = null;
const apiBaseUrl = normalizeApiBaseUrl(
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
);

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function el<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing element #${id}`);
    return element as T;
}

function showEl(id: string) { el(id).style.display = ''; }
function hideEl(id: string) { el(id).style.display = 'none'; }

function setStatus(elId: string, message: string, isError = false) {
    const elem = el<HTMLParagraphElement>(elId);
    elem.textContent = message;
    elem.style.color = isError ? '#b42318' : '#4a6179';
}

// ---------------------------------------------------------------------------
// Render profile
// ---------------------------------------------------------------------------

function getEmergencyContacts(profile: PublicUserProfile): EmergencyContact[] {
    if (Array.isArray(profile.emergencyContacts) && profile.emergencyContacts.length > 0) {
        return profile.emergencyContacts;
    }
    if (profile.emergencyContactName && profile.emergencyContactPhone) {
        return [{ name: profile.emergencyContactName, phone: profile.emergencyContactPhone }];
    }
    return [];
}

function renderProfile(profile: PublicUserProfile) {
    const section = el<HTMLElement>('profileSection');
    const contacts = getEmergencyContacts(profile);

    const contactsHtml = contacts.length === 0
        ? `<p class="muted">${t('notProvided')}</p>`
        : contacts.map(c => `
            <div class="contact-row">
                <div>
                    <strong>${escapeHtml(c.name)}</strong>
                    <span class="muted">${escapeHtml(c.phone)}</span>
                </div>
                <a href="tel:${encodeURIComponent(c.phone)}" class="btn btn-success btn-sm">${t('callBtn')}</a>
            </div>
        `).join('');

    section.innerHTML = `
        <div class="profile-header card">
            <div class="avatar-circle">${profile.fullName.charAt(0).toUpperCase()}</div>
            <div>
                <h2 class="profile-name">${escapeHtml(profile.fullName)}</h2>
                ${profile.phone ? `<p class="muted">${escapeHtml(profile.phone)}</p>` : ''}
            </div>
        </div>
        <div class="profile-vitals card">
            <div class="vital-item">
                <span class="vital-label">${t('bloodType')}</span>
                <span class="vital-value blood-type">${escapeHtml(profile.bloodType ?? t('notProvided'))}</span>
            </div>
            <div class="vital-item">
                <span class="vital-label">${t('allergies')}</span>
                <span class="vital-value">${escapeHtml(profile.allergies ?? t('notProvided'))}</span>
            </div>
            <div class="vital-item">
                <span class="vital-label">${t('conditions')}</span>
                <span class="vital-value">${escapeHtml(profile.chronicConditions ?? t('notProvided'))}</span>
            </div>
        </div>
        <div class="contacts-card card">
            <h3>${t('emergencyContacts')}</h3>
            ${contactsHtml}
        </div>
    `;
    showEl('profileSection');
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Load profile
// ---------------------------------------------------------------------------

function showInvalidLinkError() {
    hideEl('profileSection');
    hideEl('actionSection');
    showEl('errorSection');
    setStatus('errorStatus', '');
}

async function loadProfile(userId: string) {
    try {
        const profile = await fetchPublicProfile(apiBaseUrl, userId);
        currentProfile = profile;
        currentUserId = userId;
        renderProfile(profile);
        showEl('actionSection');
        hideEl('errorSection');
    } catch (error) {
        const message = error instanceof Error ? error.message : t('errorLoad');
        showEl('errorSection');
        hideEl('profileSection');
        hideEl('actionSection');
        setStatus('errorStatus', message, true);
    }
}

// ---------------------------------------------------------------------------
// Send SOS alert
// ---------------------------------------------------------------------------

async function sendAlert() {
    if (!currentUserId) return;
    const note = el<HTMLTextAreaElement>('alertNote').value.trim();
    const btn = el<HTMLButtonElement>('sendAlertBtn');
    btn.disabled = true;
    el('sendAlertText').textContent = t('sending');
    setStatus('alertStatus', '');

    try {
        await createBystanderIncident(apiBaseUrl, currentUserId, note);
        setStatus('alertStatus', t('alertSuccess'));
    } catch (error) {
        const message = error instanceof Error ? error.message : t('alertError');
        setStatus('alertStatus', message, true);
    } finally {
        btn.disabled = false;
        el('sendAlertText').textContent = t('sendAlertText');
    }
}

// ---------------------------------------------------------------------------
// Language toggle
// ---------------------------------------------------------------------------

function applyLanguage() {
    el('eyebrowText').textContent = t('eyebrow');
    el('heroTitle').textContent = t('heroTitle');
    el('heroDesc').textContent = t('heroDesc');
    el('actionTitle').textContent = t('actionTitle');
    el('alertNoteLabel').textContent = t('alertNoteLabel');
    el<HTMLTextAreaElement>('alertNote').placeholder = t('alertNotePlaceholder');
    el('sendAlertText').textContent = t('sendAlertText');
    el('errorTitle').textContent = t('errorTitle');
    el('errorMessage').textContent = t('errorMissingUserId');
    el('langToggleBtn').textContent = currentLang === 'vi' ? 'EN' : 'VI';

    if (currentProfile) {
        renderProfile(currentProfile);
    }
}

el('langToggleBtn').addEventListener('click', () => {
    currentLang = currentLang === 'vi' ? 'en' : 'vi';
    applyLanguage();
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

el('sendAlertBtn').addEventListener('click', () => void sendAlert());

function init() {
    const params = new URLSearchParams(window.location.search);
    const userIdFromUrl = params.get('userId')?.trim();

    if (userIdFromUrl) {
        hideEl('errorSection');
        void loadProfile(userIdFromUrl);
    } else {
        showInvalidLinkError();
    }
}

applyLanguage();
init();
