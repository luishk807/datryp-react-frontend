/**
 * REST wrappers for `/me/preferences` and `/me/interests-catalog`. The
 * preferences endpoints are auth-gated; the catalog is open (it's a static
 * chip list, no PII). Wire format is snake_case — these helpers reshape
 * into camelCase to match the rest of the frontend.
 */
import { getAuthToken } from './authStorage';
import type { InterestOption, Preferences, PreferencesUpdate } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface PreferencesRaw {
    country_of_birth_code: string | null;
    interests: string[];
    onboarding_completed_at: string | null;
}

interface InterestsCatalogRaw {
    interests: InterestOption[];
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

const toPreferences = (r: PreferencesRaw): Preferences => ({
    countryOfBirthCode: r.country_of_birth_code,
    interests: r.interests ?? [],
    onboardingCompletedAt: r.onboarding_completed_at,
});

export const fetchMyPreferences = async (): Promise<Preferences> => {
    const resp = await fetch(`${API_BASE}/me/preferences`, {
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, '/me/preferences');
    return toPreferences((await resp.json()) as PreferencesRaw);
};

export const updateMyPreferences = async (
    payload: PreferencesUpdate
): Promise<Preferences> => {
    // Drop undefined fields so we only PATCH what the caller intends to
    // change. Explicit `null` is preserved (clears the field server-side).
    const body: Record<string, unknown> = {};
    if (payload.countryOfBirthCode !== undefined) {
        body.country_of_birth_code = payload.countryOfBirthCode;
    }
    if (payload.interests !== undefined) {
        body.interests = payload.interests;
    }
    if (payload.markComplete !== undefined) {
        body.mark_complete = payload.markComplete;
    }

    const resp = await fetch(`${API_BASE}/me/preferences`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify(body),
    });
    if (!resp.ok) await handleError(resp, 'patch preferences');
    return toPreferences((await resp.json()) as PreferencesRaw);
};

export const fetchInterestsCatalog = async (): Promise<InterestOption[]> => {
    const resp = await fetch(`${API_BASE}/me/interests-catalog`);
    if (!resp.ok) await handleError(resp, '/me/interests-catalog');
    const body = (await resp.json()) as InterestsCatalogRaw;
    return body.interests;
};
