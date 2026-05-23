/**
 * Fetch wrapper for `GET /seasonal-best-places`.
 *
 * Pro-only homepage endpoint — returns 6 destinations whose CURRENT-month
 * season makes them stand out (Kyoto in May for azaleas, Iceland in
 * June for midnight sun, etc.). The backend caches one OpenAI call
 * per ISO month globally, so this is cheap to call repeatedly.
 */
import { getAuthToken } from 'api/authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface SeasonalPlaceRaw {
    name: string;
    country: string;
    country_code: string;
    why: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface SeasonalBestPlacesResponseRaw {
    month_key: string;
    places: SeasonalPlaceRaw[];
    cached: boolean;
}

export interface SeasonalPlace {
    name: string;
    country: string;
    countryCode: string;
    why: string;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface SeasonalBestPlaces {
    monthKey: string;
    places: SeasonalPlace[];
    cached: boolean;
}

const toPlace = (raw: SeasonalPlaceRaw): SeasonalPlace => ({
    name: raw.name,
    country: raw.country,
    countryCode: raw.country_code,
    why: raw.why,
    imageUrl: raw.image_url,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
});

export const fetchSeasonalBestPlaces =
    async (): Promise<SeasonalBestPlaces> => {
        const token = getAuthToken();
        const resp = await fetch(`${API_BASE}/seasonal-best-places`, {
            headers: token
                ? { Authorization: `Bearer ${token}` }
                : undefined,
        });
        if (!resp.ok) {
            throw new Error(
                `/seasonal-best-places failed: ${resp.status} ${resp.statusText}`,
            );
        }
        const body = (await resp.json()) as SeasonalBestPlacesResponseRaw;
        return {
            monthKey: body.month_key,
            places: body.places.map(toPlace),
            cached: body.cached,
        };
    };
