/**
 * REST wrapper for the per-trip notification channel override. Each member
 * picks how THEY are notified about a trip (email / sms / both / none),
 * overriding their account-level preference; `null` clears it (account
 * default). Backend gates SMS behind Pro and verifies trip membership.
 */
import { getAuthToken } from './authStorage';
import type { NotifyChannel } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface TripNotificationPref {
    /** null = no override (use the account default). */
    channel: NotifyChannel | null;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleError = async (resp: Response, label: string): Promise<never> => {
    let detail: string | undefined;
    try {
        const body = await resp.json();
        if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
        /* ignore */
    }
    throw new Error(
        `${label} ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`
    );
};

export const getTripNotificationPref = async (
    tripId: string
): Promise<TripNotificationPref> => {
    const resp = await fetch(
        `${API_BASE}/trips/${tripId}/notification-pref`,
        { headers: { ...authHeaders() } }
    );
    if (!resp.ok) await handleError(resp, 'get trip notification pref');
    return (await resp.json()) as TripNotificationPref;
};

export const setTripNotificationPref = async (
    tripId: string,
    channel: NotifyChannel | null
): Promise<TripNotificationPref> => {
    const resp = await fetch(
        `${API_BASE}/trips/${tripId}/notification-pref`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ channel }),
        }
    );
    if (!resp.ok) await handleError(resp, 'set trip notification pref');
    return (await resp.json()) as TripNotificationPref;
};
