import { useQuery } from '@tanstack/react-query';
import { fetchTravelAdvisory } from 'api/travelAdvisoryApi';
import { fetchGeoCountry } from 'api/geoLanguageApi';
import { useMyPreferences } from 'api/hooks/useMyPreferences';

/**
 * The traveler's residence country (ISO-2), used as the advisory "source":
 * their saved home country if set, else their IP-geolocated country. `null`
 * while resolving / undeterminable — the widget then hides.
 */
export const useResidenceCountry = (): string | null => {
    const { data: prefs } = useMyPreferences();
    const home = prefs?.homeCountryCode ?? null;
    const { data: geo } = useQuery({
        queryKey: ['geo-country'],
        queryFn: () => fetchGeoCountry(),
        // IP country is stable for a session; only fetch when there's no saved
        // home country to fall back from.
        enabled: !home,
        staleTime: Infinity,
        retry: 0,
    });
    return home ?? geo ?? null;
};

/**
 * The official travel advisory for `destination` (ISO-2) from `source`'s
 * (ISO-2 residence) government. Disabled until both are known.
 */
export const useTravelAdvisory = (
    destination: string | undefined,
    source: string | null,
) =>
    useQuery({
        queryKey: ['travel-advisory', destination, source],
        queryFn: () => fetchTravelAdvisory(destination as string, source as string),
        enabled: Boolean(destination && source),
        staleTime: 60 * 60 * 1000,
        retry: 0,
    });
