/**
 * REST wrapper for a trip's free-text recap note. Owner/organizer only;
 * editable in ANY trip status (the full GraphQL save is locked once a trip
 * leaves Planning). `null` / empty clears the note. Mirrors the
 * tripNotificationPref wrapper's fetch + bearer-token shape.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface TripNote {
    note: string | null;
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

export const setTripNote = async (
    tripId: string,
    note: string | null
): Promise<TripNote> => {
    const resp = await fetch(`${API_BASE}/me/trip-note/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ note }),
    });
    if (!resp.ok) await handleError(resp, 'set trip note');
    return (await resp.json()) as TripNote;
};
