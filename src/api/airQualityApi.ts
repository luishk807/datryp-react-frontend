/**
 * Wrapper for the Python backend's `GET /air-quality` endpoint (Open-Meteo
 * air-quality proxy). Returns the real current US AQI for a coordinate. The
 * detail pages call it with the destination's coordinates (from the `facts`
 * detail slice) and hide the card when coords are missing or the endpoint
 * errors — a best-effort enhancement, like the live-weather card.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export type AirQualityBand =
    | 'good'
    | 'moderate'
    | 'sensitive'
    | 'unhealthy'
    | 'very_unhealthy'
    | 'hazardous';

const BANDS: readonly string[] = [
    'good',
    'moderate',
    'sensitive',
    'unhealthy',
    'very_unhealthy',
    'hazardous',
];

interface AirQualityResponseRaw {
    aqi: number;
    category_key: string;
    pm2_5: number | null;
    observed_at: string | null;
}

export interface AirQualityLive {
    /** US Air Quality Index (0-500+). */
    aqi: number;
    /** US AQI band — drives the color + label. */
    categoryKey: AirQualityBand;
    /** Fine particulate matter, µg/m³ (may be null). */
    pm25: number | null;
    observedAt: string | null;
}

export const fetchAirQuality = async (
    lat: number,
    lng: number
): Promise<AirQualityLive> => {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    const resp = await fetch(`${API_BASE}/air-quality?${params}`);
    if (!resp.ok) {
        throw new Error(`Air quality lookup failed (${resp.status})`);
    }
    const raw = (await resp.json()) as AirQualityResponseRaw;
    return {
        aqi: raw.aqi,
        categoryKey: BANDS.includes(raw.category_key)
            ? (raw.category_key as AirQualityBand)
            : 'moderate',
        pm25: raw.pm2_5,
        observedAt: raw.observed_at,
    };
};
