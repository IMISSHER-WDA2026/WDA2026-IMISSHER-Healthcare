import './styles.css';
import { createIncident, listIncidents, normalizeApiBaseUrl } from './lib/sos-api';
import type { SosIncident } from './types';

type TriggerSource = 'button' | 'voice' | 'wearable';

interface AppState {
    apiBaseUrl: string;
    incidents: SosIncident[];
}

function getElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required DOM element: #${id}`);
    }

    return element as T;
}

const elements = {
    apiBaseUrl: getElement<HTMLInputElement>('apiBaseUrl'),
    userId: getElement<HTMLInputElement>('userId'),
    triggerSource: getElement<HTMLSelectElement>('triggerSource'),
    note: getElement<HTMLTextAreaElement>('note'),
    createForm: getElement<HTMLFormElement>('createForm'),
    status: getElement<HTMLParagraphElement>('status'),
    incidentList: getElement<HTMLUListElement>('incidentList'),
    refreshBtn: getElement<HTMLButtonElement>('refreshBtn'),
};

const state: AppState = {
    apiBaseUrl: normalizeApiBaseUrl(elements.apiBaseUrl.value),
    incidents: [],
};

const savedUserId = localStorage.getItem('healthcare.sos.userId');
if (savedUserId) {
    elements.userId.value = savedUserId;
}

function showStatus(message: string, isError = false): void {
    elements.status.textContent = message;
    elements.status.style.color = isError ? '#b42318' : '#4a6179';
}

function statusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'resolved') {
        return 'badge badge-resolved';
    }

    if (normalized === 'acknowledged') {
        return 'badge badge-acknowledged';
    }

    return 'badge badge-open';
}

function renderIncidents(): void {
    elements.incidentList.innerHTML = '';

    if (state.incidents.length === 0) {
        const li = document.createElement('li');
        li.className = 'incident-item';
        li.textContent = 'No incidents yet.';
        elements.incidentList.appendChild(li);
        return;
    }

    for (const incident of state.incidents) {
        const li = document.createElement('li');
        li.className = 'incident-item';
        li.innerHTML = `
      <div class="incident-head">
        <strong>#${incident.id} ${incident.userId}</strong>
        <span class="${statusClass(incident.status)}">${incident.status}</span>
      </div>
      <div>${incident.note || 'No note'}</div>
      <div class="small">Source: ${incident.triggerSource}</div>
      <div class="small">Updated: ${new Date(incident.updatedAt).toLocaleString()}</div>
    `;

        elements.incidentList.appendChild(li);
    }
}

async function refreshIncidents(): Promise<void> {
    const userId = elements.userId.value.trim();

    if (!userId) {
        state.incidents = [];
        renderIncidents();
        showStatus('Enter a user ID to load incidents.');
        return;
    }

    showStatus('Loading incidents...');

    try {
        state.incidents = await listIncidents(state.apiBaseUrl, userId);
        renderIncidents();
        showStatus(`Loaded ${state.incidents.length} incidents.`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Cannot load incidents.';
        showStatus(message, true);
    }
}

async function onCreateIncident(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const userId = elements.userId.value.trim();
    const triggerSource = elements.triggerSource.value as TriggerSource;
    const note = elements.note.value.trim();

    if (!userId) {
        showStatus('User ID is required.', true);
        return;
    }

    localStorage.setItem('healthcare.sos.userId', userId);
    showStatus('Sending SOS incident...');

    try {
        const created = await createIncident(state.apiBaseUrl, {
            userId,
            triggerSource,
            note: note || undefined,
        });

        elements.note.value = '';
        showStatus(`SOS incident #${created.id} created.`);
        await refreshIncidents();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Cannot create SOS incident.';
        showStatus(message, true);
    }
}

function onApiBaseUrlChange(): void {
    state.apiBaseUrl = normalizeApiBaseUrl(elements.apiBaseUrl.value);
}

elements.createForm.addEventListener('submit', (event) => {
    void onCreateIncident(event as SubmitEvent);
});
elements.refreshBtn.addEventListener('click', () => {
    void refreshIncidents();
});
elements.apiBaseUrl.addEventListener('change', onApiBaseUrlChange);
elements.userId.addEventListener('change', () => {
    void refreshIncidents();
});

renderIncidents();
if (elements.userId.value.trim()) {
    void refreshIncidents();
}
