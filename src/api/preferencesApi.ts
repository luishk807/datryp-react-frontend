/**
 * REST wrappers for `/me/preferences` and `/me/interests-catalog`. The
 * preferences endpoints are auth-gated; the catalog is open (it's a static
 * chip list, no PII). Wire format is snake_case — these helpers reshape
 * into camelCase to match the rest of the frontend.
 */
import { getAuthToken } from './authStorage';
import type {
    CatalogOption,
    GenderOption,
    InterestOption,
    Preferences,
    PreferencesUpdate,
    TravelerStyleOption,
} from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface PreferencesRaw {
    country_of_birth_code: string | null;
    gender_id: string | null;
    interests: string[];
    traveler_styles: string[];
    dream_destinations: string[];
    onboarding_completed_at: string | null;
}

interface InterestsCatalogRaw {
    interests: InterestOption[];
}

interface TravelerStylesCatalogRaw {
    traveler_styles: TravelerStyleOption[];
}

interface GendersCatalogRaw {
    genders: GenderOption[];
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
    genderId: r.gender_id,
    interests: r.interests ?? [],
    travelerStyles: r.traveler_styles ?? [],
    dreamDestinations: r.dream_destinations ?? [],
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
    if (payload.genderId !== undefined) {
        body.gender_id = payload.genderId;
    }
    if (payload.interests !== undefined) {
        body.interests = payload.interests;
    }
    if (payload.travelerStyles !== undefined) {
        body.traveler_styles = payload.travelerStyles;
    }
    if (payload.dreamDestinations !== undefined) {
        body.dream_destinations = payload.dreamDestinations;
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

export const fetchTravelerStylesCatalog = async (): Promise<TravelerStyleOption[]> => {
    const resp = await fetch(`${API_BASE}/me/traveler-styles-catalog`);
    if (!resp.ok) await handleError(resp, '/me/traveler-styles-catalog');
    const body = (await resp.json()) as TravelerStylesCatalogRaw;
    return body.traveler_styles;
};

export const fetchGendersCatalog = async (): Promise<GenderOption[]> => {
    const resp = await fetch(`${API_BASE}/me/genders-catalog`, {
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, '/me/genders-catalog');
    const body = (await resp.json()) as GendersCatalogRaw;
    return body.genders;
};

// Type re-export keeps the import surface tidy for callers that only need
// the slug/label shape and don't care whether it's an interest or a style.
export type { CatalogOption };
