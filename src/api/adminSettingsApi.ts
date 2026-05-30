/**
 * Admin-only wrappers for the global "free everything" toggle.
 *
 *   GET  /admin/settings/free-everything  → current state
 *   POST /admin/settings/free-everything  → flip on/off, set duration
 *
 * Both endpoints are gated to `user.is_admin` on the backend. The FE
 * surface is the toggle on the admin dashboard's Settings card.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface FreeEverythingStatus {
    /** True when the toggle is currently ON and `until` is in the
     *  future. When `until` is null or in the past, this is false. */
    active: boolean;
    /** ISO-8601 expiry timestamp. Null when never set or explicitly
     *  cleared. Non-null past timestamps stay readable as a "last set"
     *  marker even though `active` is false. */
    until: string | null;
}

export interface FreeEverythingUpdate {
    enabled: boolean;
    /** Pick ONE of the two when enabling: durationHours OR untilIso.
     *  durationHours wins if both are passed. When neither is provided
     *  and enabled=true, the server picks a 24h default. */
    durationHours?: number | null;
    untilIso?: string | null;
}

interface StatusRaw {
    active: boolean;
    until: string | null;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toStatus = (r: StatusRaw): FreeEverythingStatus => ({
    active: r.active,
    until: r.until,
});

export const fetchFreeEverything =
    async (): Promise<FreeEverythingStatus> => {
        const resp = await fetch(
            `${API_BASE}/admin/settings/free-everything`,
            { headers: authHeaders() },
        );
        if (!resp.ok) {
            throw new Error(
                `/admin/settings/free-everything ${resp.status} ${resp.statusText}`,
            );
        }
        return toStatus((await resp.json()) as StatusRaw);
    };

export const updateFreeEverything = async (
    payload: FreeEverythingUpdate,
): Promise<FreeEverythingStatus> => {
    const body: Record<string, unknown> = { enabled: payload.enabled };
    if (payload.durationHours !== undefined) {
        body.duration_hours = payload.durationHours;
    }
    if (payload.untilIso !== undefined) {
        body.until_iso = payload.untilIso;
    }
    const resp = await fetch(
        `${API_BASE}/admin/settings/free-everything`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
            },
            body: JSON.stringify(body),
        },
    );
    if (!resp.ok) {
        let detail: string | undefined;
        try {
            const j = await resp.json();
            if (typeof j?.detail === 'string') detail = j.detail;
        } catch {
            /* ignore */
        }
        throw new Error(
            `/admin/settings/free-everything ${resp.status}${
                detail ? ` — ${detail}` : ''
            }`,
        );
    }
    return toStatus((await resp.json()) as StatusRaw);
};
