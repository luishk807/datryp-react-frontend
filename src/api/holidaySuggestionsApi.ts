/**
 * `/me/holiday-suggestions` — Pro-only upcoming-holiday picks (one
 * holiday + 6 places + 4 things-to-do). Backend caches per-user for 7
 * days; this client also caches via TanStack Query for repeated mounts.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface HolidayInfo {
    name: string;
    date: string;
    country: string;
    description: string;
    /** Hero photo for the section background. Null when Unsplash had
     *  no match — UI falls back to its built-in gradient. */
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface HolidayPlace {
    name: string;
    country: string;
    countryCode: string;
    why: string;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface HolidayActivity {
    title: string;
    description: string;
}

export interface HolidaySuggestionsResult {
    holiday: HolidayInfo;
    places: HolidayPlace[];
    activities: HolidayActivity[];
}

interface HolidayPlaceRaw {
    name: string;
    country: string;
    country_code: string;
    why: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface HolidayInfoRaw {
    name: string;
    date: string;
    country: string;
    description: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface HolidaySuggestionsRaw {
    holiday: HolidayInfoRaw;
    places: HolidayPlaceRaw[];
    activities: HolidayActivity[];
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toPlace = (r: HolidayPlaceRaw): HolidayPlace => ({
    name: r.name,
    country: r.country,
    countryCode: r.country_code,
    why: r.why,
    imageUrl: r.image_url,
    photographerName: r.photographer_name,
    photographerUrl: r.photographer_url,
});

const toHoliday = (r: HolidayInfoRaw): HolidayInfo => ({
    name: r.name,
    date: r.date,
    country: r.country,
    description: r.description,
    imageUrl: r.image_url,
    photographerName: r.photographer_name,
    photographerUrl: r.photographer_url,
});

export const fetchHolidaySuggestions = async (): Promise<HolidaySuggestionsResult> => {
    const resp = await fetch(`${API_BASE}/me/holiday-suggestions`, {
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
            `/me/holiday-suggestions ${resp.status}${
                detail ? ` — ${detail}` : ''
            }`
        );
    }
    const body = (await resp.json()) as HolidaySuggestionsRaw;
    return {
        holiday: toHoliday(body.holiday),
        places: body.places.map(toPlace),
        activities: body.activities,
    };
};
