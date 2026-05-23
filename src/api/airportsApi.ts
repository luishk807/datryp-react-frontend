/**
 * `/airports/search` — IATA-code/airport-name/city autocomplete backed
 * by the static `airports` catalog on the backend (~200 entries today,
 * grows with seed updates). Results are stable across deploys so the
 * client can cache aggressively.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface AirportOption {
    iataCode: string;
    name: string;
    city: string;
    countryCode: string;
    country: string;
}

export interface AirportsSearchResult {
    items: AirportOption[];
}

interface AirportRaw {
    iata_code: string;
    name: string;
    city: string;
    country_code: string;
    country: string;
}

interface AirportsResponseRaw {
    items: AirportRaw[];
}

const toOption = (a: AirportRaw): AirportOption => ({
    iataCode: a.iata_code,
    name: a.name,
    city: a.city,
    countryCode: a.country_code,
    country: a.country,
});

export const searchAirports = async (
    q: string,
    limit = 20,
): Promise<AirportsSearchResult> => {
    const trimmed = q.trim();
    if (!trimmed) return { items: [] };
    const resp = await fetch(
        `${API_BASE}/airports/search` +
            `?q=${encodeURIComponent(trimmed)}` +
            `&limit=${limit}`,
    );
    if (!resp.ok) {
        throw new Error(`/airports/search ${resp.status}`);
    }
    const body = (await resp.json()) as AirportsResponseRaw;
    return { items: body.items.map(toOption) };
};
