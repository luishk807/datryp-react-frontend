/**
 * Client-visible feature flags + the admin SMS kill-switch.
 *
 *   GET  /features              → public read (no auth). Polled by the app so it
 *                                 can hide whole features (today: SMS) without a
 *                                 redeploy. Mirrors `/maintenance`'s lightweight,
 *                                 anonymous-safe contract.
 *   GET  /admin/settings/sms    → admin-only read for the dashboard card.
 *   POST /admin/settings/sms    → admin-only write — flip SMS on/off.
 *
 * `sms_enabled` on `/features` is the EFFECTIVE state (admin switch ON *and*
 * Twilio configured), so the frontend can treat it as "show SMS options".
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface FeatureFlags {
    /** True only when SMS is live (admin switch on AND Twilio configured).
     *  When false, every SMS notification option is hidden. */
    smsEnabled: boolean;
}

/** Admin-facing SMS state — splits the effective flag into its two causes so
 *  the dashboard can explain WHY SMS is dark (switched off vs. creds missing). */
export interface SmsSetting {
    /** The admin kill-switch itself. */
    enabled: boolean;
    /** Whether Twilio creds are wired up on the server. */
    configured: boolean;
    /** `enabled && configured` — what `/features` reports and what gates sends. */
    effective: boolean;
}

interface FeatureFlagsRaw {
    sms_enabled: boolean;
}

interface SmsSettingRaw {
    enabled: boolean;
    configured: boolean;
    effective: boolean;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Public read. Throws on network failure so the caller's query can retry;
 *  callers should treat an error/loading as "SMS off" (hide the options). */
export const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
    const resp = await fetch(`${API_BASE}/features`);
    if (!resp.ok) {
        throw new Error(`/features ${resp.status} ${resp.statusText}`);
    }
    const raw = (await resp.json()) as FeatureFlagsRaw;
    return { smsEnabled: raw.sms_enabled };
};

const toSmsSetting = (r: SmsSettingRaw): SmsSetting => ({
    enabled: r.enabled,
    configured: r.configured,
    effective: r.effective,
});

export const fetchSmsSetting = async (): Promise<SmsSetting> => {
    const resp = await fetch(`${API_BASE}/admin/settings/sms`, {
        headers: authHeaders(),
    });
    if (!resp.ok) {
        throw new Error(`/admin/settings/sms ${resp.status} ${resp.statusText}`);
    }
    return toSmsSetting((await resp.json()) as SmsSettingRaw);
};

export const updateSmsSetting = async (
    enabled: boolean,
): Promise<SmsSetting> => {
    const resp = await fetch(`${API_BASE}/admin/settings/sms`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({ enabled }),
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
            `/admin/settings/sms ${resp.status}${detail ? ` — ${detail}` : ''}`,
        );
    }
    return toSmsSetting((await resp.json()) as SmsSettingRaw);
};
