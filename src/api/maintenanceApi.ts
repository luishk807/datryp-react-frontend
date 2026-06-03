/**
 * Maintenance-mode API.
 *
 *   GET  /maintenance                     → public read (no auth). Polled by
 *                                            every client so the app can show
 *                                            a banner / full-page block.
 *   POST /admin/settings/maintenance      → admin-only write, from the
 *                                            dashboard Settings card.
 *
 * The read mirrors `serverStatus`'s lightweight contract — it must succeed for
 * anonymous visitors, so it carries no Authorization header. The write reuses
 * the same auth-header + duration shape as `adminSettingsApi`'s free-everything
 * toggle.
 */
import type { MaintenanceMode } from 'types';
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface MaintenanceStatus {
    /** True only while the maintenance window is currently open. */
    active: boolean;
    /** How to notify users: banner (site usable) or full (block app). */
    mode: MaintenanceMode;
    /** Optional custom copy shown in the banner / full-page. */
    message: string | null;
    /** ISO-8601 expiry. Non-null past value reads as "last set" when off. */
    until: string | null;
}

export interface MaintenanceUpdate {
    enabled: boolean;
    mode?: MaintenanceMode;
    message?: string | null;
    /** Pick ONE when enabling: durationHours OR untilIso (durationHours
     *  wins). Neither + enabled=true → server defaults to 24h. */
    durationHours?: number | null;
    untilIso?: string | null;
}

interface StatusRaw {
    active: boolean;
    mode: MaintenanceMode;
    message: string | null;
    until: string | null;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toStatus = (r: StatusRaw): MaintenanceStatus => ({
    active: r.active,
    mode: r.mode,
    message: r.message,
    until: r.until,
});

/** Public read. Throws on network failure so the caller's query can retry;
 *  callers should treat an error as "no maintenance" rather than blocking. */
export const fetchMaintenanceStatus =
    async (): Promise<MaintenanceStatus> => {
        const resp = await fetch(`${API_BASE}/maintenance`);
        if (!resp.ok) {
            throw new Error(
                `/maintenance ${resp.status} ${resp.statusText}`,
            );
        }
        return toStatus((await resp.json()) as StatusRaw);
    };

export const updateMaintenance = async (
    payload: MaintenanceUpdate,
): Promise<MaintenanceStatus> => {
    const body: Record<string, unknown> = { enabled: payload.enabled };
    if (payload.mode !== undefined) body.mode = payload.mode;
    if (payload.message !== undefined) body.message = payload.message;
    if (payload.durationHours !== undefined) {
        body.duration_hours = payload.durationHours;
    }
    if (payload.untilIso !== undefined) body.until_iso = payload.untilIso;

    const resp = await fetch(`${API_BASE}/admin/settings/maintenance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        let detail: string | undefined;
        try {
            const j = await resp.json();
            if (typeof j?.detail === 'string') detail = j.detail;
        } catch {
            /* ignore */
        }
        throw new Error(
            `/admin/settings/maintenance ${resp.status}${
                detail ? ` — ${detail}` : ''
            }`,
        );
    }
    return toStatus((await resp.json()) as StatusRaw);
};
