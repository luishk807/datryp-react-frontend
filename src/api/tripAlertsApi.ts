/**
 * REST wrapper for the per-activity "notify participants" fan-out. The
 * backend resolves the trip's other participants, checks each one's
 * per-channel preferences, and delivers across in-app + email + SMS —
 * the client only kicks it off and renders the reach summary. Wire
 * format is snake_case; this helper reshapes the response to camelCase.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

/** Reach summary returned by the notify endpoint, camelCased. */
export interface NotifyActivityResult {
    recipients: number;
    inApp: number;
    emails: number;
    sms: number;
}

interface NotifyActivityResultRaw {
    recipients: number;
    in_app: number;
    emails: number;
    sms: number;
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

/**
 * Alert the trip's other participants about a single activity. Organizer-
 * only server-side (403 otherwise); 404 when the trip/activity can't be
 * found. `message` is an optional note (max 280 chars) shown alongside
 * the activity details.
 */
export const notifyActivityParticipants = async (
    tripId: string,
    activityId: string,
    message?: string,
    recipientIds?: string[]
): Promise<NotifyActivityResult> => {
    const body: { message?: string; recipient_ids?: string[] } = {};
    if (message) body.message = message;
    // Only send `recipient_ids` when the organizer narrowed the list — omit it
    // for the default "everyone" case so the server keeps its fan-out path.
    if (recipientIds) body.recipient_ids = recipientIds;
    const resp = await fetch(
        `${API_BASE}/trips/${tripId}/activities/${activityId}/notify`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
            },
            body: JSON.stringify(body),
        }
    );
    if (!resp.ok) await handleError(resp, 'notify activity participants');
    const raw = (await resp.json()) as NotifyActivityResultRaw;
    return {
        recipients: raw.recipients,
        inApp: raw.in_app,
        emails: raw.emails,
        sms: raw.sms,
    };
};
