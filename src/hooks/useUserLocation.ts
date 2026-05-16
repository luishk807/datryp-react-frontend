import { useQuery } from '@tanstack/react-query';

export interface UserLocation {
    lat: number;
    lng: number;
    city: string;
    country: string;
    /** ISO 3166-1 alpha-2 code (uppercase), e.g. "US", "PA". Empty string if
     *  the geolocation lookup didn't return one. */
    countryCode: string;
}

const STORAGE_KEY = 'datryp:user-location';

interface IpapiResponse {
    latitude?: number;
    longitude?: number;
    city?: string;
    country_name?: string;
    country?: string;        // alpha-2 code
    country_code?: string;   // alpha-2 code (some plans)
    error?: boolean;
    reason?: string;
}

const fetchUserLocation = async (): Promise<UserLocation> => {
    // One lookup per browser session — ipapi.co has a free per-IP quota and
    // user location doesn't meaningfully change while the tab is open.
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached) {
        try {
            const parsed = JSON.parse(cached) as Partial<UserLocation>;
            if (typeof parsed.countryCode === 'string' && parsed.lat != null) {
                return parsed as UserLocation;
            }
            // Older cache entries missing countryCode — drop and refetch.
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            sessionStorage.removeItem(STORAGE_KEY);
        }
    }

    const resp = await fetch('https://ipapi.co/json/');
    if (!resp.ok) {
        throw new Error(`ipapi.co failed: ${resp.status}`);
    }
    const body = (await resp.json()) as IpapiResponse;
    if (body.error || typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
        throw new Error(body.reason ?? 'ipapi.co returned no coordinates');
    }

    const loc: UserLocation = {
        lat: body.latitude,
        lng: body.longitude,
        city: body.city ?? '',
        country: body.country_name ?? '',
        countryCode: (body.country_code ?? body.country ?? '').toUpperCase(),
    };
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
        // sessionStorage can throw in private-mode/full-storage — silent fallback.
    }
    return loc;
};

/** Best-effort browser location via IP geolocation (ipapi.co). City-level
 *  accuracy; no permission prompt. Cached in sessionStorage so each tab only
 *  hits the API once. */
export const useUserLocation = () =>
    useQuery<UserLocation>({
        queryKey: ['user-location'],
        queryFn: fetchUserLocation,
        staleTime: Infinity,
        gcTime: Infinity,
        retry: 1,
    });
