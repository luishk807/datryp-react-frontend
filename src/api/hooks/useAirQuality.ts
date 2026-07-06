import { useQuery } from '@tanstack/react-query';
import { fetchAirQuality, type AirQualityLive } from 'api/airQualityApi';

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

/**
 * Real current air quality (US AQI) for a coordinate — backend `/air-quality`
 * → Open-Meteo. Time-sensitive, so a short 15-minute staleTime (the backend
 * already caches ~30 min per ~1km cell). Gated on finite coordinates; callers
 * pass `undefined` until the `facts` slice resolves the destination's lat/lng.
 * `retry: 0` so a 502 (upstream down) surfaces immediately and the section
 * simply hides.
 */
export const useAirQuality = (
    lat: number | undefined,
    lng: number | undefined
) => {
    const hasCoords =
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng);
    return useQuery<AirQualityLive>({
        queryKey: ['air-quality', lat ?? null, lng ?? null],
        queryFn: () => fetchAirQuality(lat as number, lng as number),
        enabled: hasCoords,
        staleTime: FIFTEEN_MIN_MS,
        gcTime: FIFTEEN_MIN_MS,
        retry: 0,
    });
};
