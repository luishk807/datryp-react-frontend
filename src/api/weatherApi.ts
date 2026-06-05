/**
 * Wrapper for the Python backend's `GET /weather` endpoint (Open-Meteo proxy).
 *
 * Returns real current conditions + today's high/low for a coordinate. The
 * detail pages call this with the destination's coordinates (from the `facts`
 * detail slice) to replace the AI-hallucinated climate sentence with real data,
 * falling back to that prose when coords are missing or this endpoint errors.
 */
import type { WeatherLive } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface WeatherResponseRaw {
    temperature_c: number;
    apparent_temperature_c: number | null;
    high_c: number | null;
    low_c: number | null;
    wind_kph: number | null;
    is_day: boolean;
    weather_code: number;
    condition: string;
    flavor: WeatherLive['flavor'];
    observed_at: string | null;
}

export const fetchWeather = async (
    lat: number,
    lng: number,
): Promise<WeatherLive> => {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    const resp = await fetch(`${API_BASE}/weather?${params}`);
    if (!resp.ok) {
        throw new Error(`Weather lookup failed (${resp.status})`);
    }
    const raw = (await resp.json()) as WeatherResponseRaw;
    return {
        temperatureC: raw.temperature_c,
        apparentTemperatureC: raw.apparent_temperature_c,
        highC: raw.high_c,
        lowC: raw.low_c,
        windKph: raw.wind_kph,
        isDay: raw.is_day,
        weatherCode: raw.weather_code,
        condition: raw.condition,
        flavor: raw.flavor,
        observedAt: raw.observed_at,
    };
};
