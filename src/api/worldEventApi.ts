/**
 * `/me/world-event` — Pro-only "biggest upcoming world event" pick.
 * One event + 4 host cities + a persuasive hype line. Backend caches
 * the answer globally per ISO week, so this endpoint is ecological:
 * one OpenAI call per week serves every Pro user.
 *
 * The endpoint can return 204 No Content when the AI doesn't find a
 * major-enough event in the next ~120 days. We translate that to
 * `null` here so the section can render nothing.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface WorldEventInfo {
    name: string;
    startDate: string;
    endDate: string;
    hostCountry: string;
    description: string;
    hype: string;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface WorldEventPlace {
    name: string;
    country: string;
    countryCode: string;
    why: string;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface WorldEventResult {
    event: WorldEventInfo;
    places: WorldEventPlace[];
}

interface WorldEventInfoRaw {
    name: string;
    start_date: string;
    end_date: string;
    host_country: string;
    description: string;
    hype: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface WorldEventPlaceRaw {
    name: string;
    country: string;
    country_code: string;
    why: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface WorldEventResponseRaw {
    event: WorldEventInfoRaw;
    places: WorldEventPlaceRaw[];
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toEvent = (r: WorldEventInfoRaw): WorldEventInfo => ({
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    hostCountry: r.host_country,
    description: r.description,
    hype: r.hype,
    imageUrl: r.image_url,
    photographerName: r.photographer_name,
    photographerUrl: r.photographer_url,
});

const toPlace = (r: WorldEventPlaceRaw): WorldEventPlace => ({
    name: r.name,
    country: r.country,
    countryCode: r.country_code,
    why: r.why,
    imageUrl: r.image_url,
    photographerName: r.photographer_name,
    photographerUrl: r.photographer_url,
});

/** Returns null when the backend returns 204 (no major event). The event is
 *  generated + cached per language, so pass the active UI language. */
export const fetchWorldEvent = async (
    lang = 'en',
): Promise<WorldEventResult | null> => {
    const resp = await fetch(
        `${API_BASE}/me/world-event?lang=${encodeURIComponent(lang)}`,
        {
            headers: authHeaders(),
        },
    );
    if (resp.status === 204) return null;
    if (!resp.ok) {
        let detail: string | undefined;
        try {
            const body = await resp.json();
            if (typeof body?.detail === 'string') detail = body.detail;
        } catch {
            /* ignore */
        }
        throw new Error(
            `/me/world-event ${resp.status}${detail ? ` — ${detail}` : ''}`
        );
    }
    const body = (await resp.json()) as WorldEventResponseRaw;
    return {
        event: toEvent(body.event),
        places: body.places.map(toPlace),
    };
};
