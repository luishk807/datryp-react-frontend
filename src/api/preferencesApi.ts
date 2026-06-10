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
    phone: string | null;
    birth_year: number | null;
    country_of_birth_code: string | null;
    gender_id: string | null;
    interests: string[];
    traveler_styles: string[];
    dream_destinations: string[];
    onboarding_completed_at: string | null;
    home_city: string | null;
    home_country: string | null;
    home_country_code: string | null;
    home_latitude: number | null;
    home_longitude: number | null;
    travel_companions: string[];
    kids_age_buckets: string[];
    notify_email: boolean;
    notify_sms: boolean;
    share_visited_places: boolean;
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
    phone: r.phone,
    birthYear: r.birth_year,
    countryOfBirthCode: r.country_of_birth_code,
    genderId: r.gender_id,
    interests: r.interests ?? [],
    travelerStyles: r.traveler_styles ?? [],
    dreamDestinations: r.dream_destinations ?? [],
    onboardingCompletedAt: r.onboarding_completed_at,
    homeCity: r.home_city,
    homeCountry: r.home_country,
    homeCountryCode: r.home_country_code,
    homeLatitude: r.home_latitude,
    homeLongitude: r.home_longitude,
    travelCompanions: r.travel_companions ?? [],
    kidsAgeBuckets: r.kids_age_buckets ?? [],
    notifyEmail: r.notify_email ?? true,
    notifySms: r.notify_sms ?? false,
    shareVisitedPlaces: r.share_visited_places ?? false,
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
    if (payload.phone !== undefined) {
        body.phone = payload.phone;
    }
    if (payload.birthYear !== undefined) {
        body.birth_year = payload.birthYear;
    }
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
    // Home-base fields. The server treats explicit `null` as "clear
    // this field" — important so the Account page's "Clear home city"
    // button reaches the DB instead of being filtered out.
    if (payload.homeCity !== undefined) {
        body.home_city = payload.homeCity;
    }
    if (payload.homeCountry !== undefined) {
        body.home_country = payload.homeCountry;
    }
    if (payload.homeCountryCode !== undefined) {
        body.home_country_code = payload.homeCountryCode;
    }
    if (payload.homeLatitude !== undefined) {
        body.home_latitude = payload.homeLatitude;
    }
    if (payload.homeLongitude !== undefined) {
        body.home_longitude = payload.homeLongitude;
    }
    if (payload.travelCompanions !== undefined) {
        body.travel_companions = payload.travelCompanions;
    }
    if (payload.kidsAgeBuckets !== undefined) {
        body.kids_age_buckets = payload.kidsAgeBuckets;
    }
    if (payload.notifyEmail !== undefined) {
        body.notify_email = payload.notifyEmail;
    }
    if (payload.notifySms !== undefined) {
        body.notify_sms = payload.notifySms;
    }
    if (payload.shareVisitedPlaces !== undefined) {
        body.share_visited_places = payload.shareVisitedPlaces;
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
