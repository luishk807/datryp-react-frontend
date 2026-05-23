/**
 * `/seasonal-best-places` query hook. Pro-only — gated at the consumer
 * via `enabled` so anonymous + free users never trigger a 401/402.
 *
 * The backend caches in-memory per ISO month, so refetches inside one
 * month are essentially free.
 */
import { useQuery } from '@tanstack/react-query';
import {
    fetchSeasonalBestPlaces,
    type SeasonalBestPlaces,
} from 'api/seasonalBestPlacesApi';

export const useSeasonalBestPlaces = (options?: { enabled?: boolean }) =>
    useQuery<SeasonalBestPlaces>({
        queryKey: ['seasonal-best-places'],
        queryFn: fetchSeasonalBestPlaces,
        enabled: options?.enabled ?? true,
        // The picks don't change inside a calendar month, so don't
        // refetch on focus / mount within the same session.
        staleTime: 12 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
    });
