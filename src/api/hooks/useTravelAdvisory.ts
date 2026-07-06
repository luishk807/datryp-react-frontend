import { useQuery } from '@tanstack/react-query';
import { fetchTravelAdvisory } from 'api/travelAdvisoryApi';

// Residence lives in its own hook now (shared with the weather widget);
// re-exported so existing advisory imports keep working.
export { useResidenceCountry } from 'api/hooks/useResidenceCountry';

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
