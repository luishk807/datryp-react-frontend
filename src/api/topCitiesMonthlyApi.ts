/**
 * Fetch wrapper for `GET /top-cities-monthly` on the Python backend.
 * Public endpoint — no auth required (drives the Home page TopPlaces section).
 */
import type { MonthlyTopCitiesResult, MonthlyTopCity } from "types";

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? "http://localhost:8000";

interface MonthlyTopCityRaw {
    name: string;
    country: string;
    country_code: string;
    why: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface MonthlyTopCitiesResponseRaw {
    month: string;
    cached: boolean;
    cities: MonthlyTopCityRaw[];
}

const toCity = (raw: MonthlyTopCityRaw): MonthlyTopCity => ({
    name: raw.name,
    country: raw.country,
    countryCode: raw.country_code,
    why: raw.why,
    imageUrl: raw.image_url,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
});

export const fetchMonthlyTopCities =
    async (): Promise<MonthlyTopCitiesResult> => {
        const resp = await fetch(`${API_BASE}/top-cities-monthly`);
        if (!resp.ok) {
            throw new Error(
                `/top-cities-monthly failed: ${resp.status} ${resp.statusText}`
            );
        }
        const body = (await resp.json()) as MonthlyTopCitiesResponseRaw;
        return {
            month: body.month,
            cached: body.cached,
            cities: body.cities.map(toCity),
        };
    };
