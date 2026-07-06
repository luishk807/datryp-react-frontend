import { useQuery } from '@tanstack/react-query';
import { fetchGeoCountry } from 'api/geoLanguageApi';
import { useMyPreferences } from 'api/hooks/useMyPreferences';

/**
 * The traveler's residence country (ISO-2): their saved home country if set,
 * else their IP-geolocated country. `null` while resolving / undeterminable.
 * Shared by the travel-advisory widget (as the advisory "source") and the
 * weather widget (to default °C vs °F).
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
