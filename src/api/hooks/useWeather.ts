import { useQuery } from '@tanstack/react-query';
import { fetchWeather } from 'api/weatherApi';
import type { WeatherLive } from 'types';

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

/**
 * Real current weather for a coordinate (backend `/weather` → Open-Meteo).
 *
 * Unlike the detail slices this is time-sensitive, so it uses a short 15-minute
 * staleTime rather than the 1-hour STATIC_DETAIL_CACHE — the backend already
 * caches ~20min per ~1km cell, so a stale client window just rides that. Gated
 * on finite coordinates; callers pass `undefined` until the `facts` slice
 * resolves the destination's lat/lng. `retry: 0` so a 502 (Open-Meteo down)
 * surfaces immediately and the section falls back to the climate prose.
 */
export const useWeather = (
    lat: number | undefined,
    lng: number | undefined,
    options: { enabled?: boolean } = {},
) => {
    const { enabled = true } = options;
    const hasCoords =
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng);
    return useQuery<WeatherLive>({
        queryKey: ['weather', lat ?? null, lng ?? null],
        queryFn: () => fetchWeather(lat as number, lng as number),
        enabled: enabled && hasCoords,
        staleTime: FIFTEEN_MIN_MS,
        gcTime: FIFTEEN_MIN_MS,
        retry: 0,
    });
};
