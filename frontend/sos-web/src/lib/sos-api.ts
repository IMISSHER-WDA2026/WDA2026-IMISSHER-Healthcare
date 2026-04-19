import type { CreateSosIncidentPayload, SosIncident } from '../types';

export function normalizeApiBaseUrl(rawBaseUrl: string): string {
    const trimmed = rawBaseUrl.trim();
    if (!trimmed) {
        return 'http://localhost:3000';
    }

    return trimmed.replace(/\/$/, '');
}

async function readErrorMessage(response: Response): Promise<string> {
    const fallback = `Request failed with status ${response.status}`;

    try {
        const body = (await response.json()) as {
            message?: string | string[];
            error?: string;
        };

        if (Array.isArray(body.message) && body.message.length > 0) {
            return body.message.join(', ');
        }

        if (typeof body.message === 'string' && body.message.trim()) {
            return body.message;
        }

        if (typeof body.error === 'string' && body.error.trim()) {
            return body.error;
        }
    } catch {
        return fallback;
    }

    return fallback;
}

export async function listIncidents(
    apiBaseUrl: string,
    userId: string,
): Promise<SosIncident[]> {
    const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
        return [];
    }

    const response = await fetch(
        `${normalizedBaseUrl}/sos?userId=${encodeURIComponent(normalizedUserId)}`,
        {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        },
    );

    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload as SosIncident[];
}

export async function createIncident(
    apiBaseUrl: string,
    request: CreateSosIncidentPayload,
): Promise<SosIncident> {
    const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

    const response = await fetch(`${normalizedBaseUrl}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }

    return (await response.json()) as SosIncident;
}
