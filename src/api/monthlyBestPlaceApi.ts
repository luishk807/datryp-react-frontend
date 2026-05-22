/**
 * `/me/monthly-best-place` — Pro-only personalized "best place to
 * visit this month" pick. Uses age + country + gender + interests +
 * traveler styles to choose ONE city. Backend caches per-user
 * per-month; this client also caches via TanStack Query.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface MonthlyBestPlaceInfo {
    name: string;
    country: string;
    countryCode: string;
    tagline: string;
    whyForYou: string;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface MonthlyBestPlaceHighlight {
    title: string;
    description: string;
}

export interface MonthlyBestPlaceResult {
    monthKey: string;
    place: MonthlyBestPlaceInfo;
    highlights: MonthlyBestPlaceHighlight[];
}

interface MonthlyBestPlaceInfoRaw {
    name: string;
    country: string;
    country_code: string;
    tagline: string;
    why_for_you: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface MonthlyBestPlaceResponseRaw {
    month_key: string;
    place: MonthlyBestPlaceInfoRaw;
    highlights: MonthlyBestPlaceHighlight[];
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toPlace = (r: MonthlyBestPlaceInfoRaw): MonthlyBestPlaceInfo => ({
    name: r.name,
    country: r.country,
    countryCode: r.country_code,
    tagline: r.tagline,
    whyForYou: r.why_for_you,
    imageUrl: r.image_url,
    photographerName: r.photographer_name,
    photographerUrl: r.photographer_url,
});

export const fetchMonthlyBestPlace = async (): Promise<MonthlyBestPlaceResult> => {
    const resp = await fetch(`${API_BASE}/me/monthly-best-place`, {
        headers: authHeaders(),
    });
    if (!resp.ok) {
        let detail: string | undefined;
        try {
            const body = await resp.json();
            if (typeof body?.detail === 'string') detail = body.detail;
        } catch {
            /* ignore */
        }
        throw new Error(
            `/me/monthly-best-place ${resp.status}${
                detail ? ` — ${detail}` : ''
            }`
        );
    }
    const body = (await resp.json()) as MonthlyBestPlaceResponseRaw;
    return {
        monthKey: body.month_key,
        place: toPlace(body.place),
        highlights: body.highlights,
    };
};
