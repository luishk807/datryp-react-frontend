/**
 * `/seasonal-best-places` query hook. Pro-only — gated at the consumer
 * via `enabled` so anonymous + free users never trigger a 401/402.
 *
 * The backend caches in-memory per ISO month, so refetches inside one
 * month are essentially free. The query key includes the local month
 * (`YYYY-MM`) so a tab kept open across a month boundary automatically
 * fetches fresh picks for the new month instead of serving the prior
 * month's stale cache.
 */
import { useQuery } from '@tanstack/react-query';
import {
    fetchSeasonalBestPlaces,
    type SeasonalBestPlaces,
} from 'api/seasonalBestPlacesApi';

const currentMonthKey = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const useSeasonalBestPlaces = (options?: { enabled?: boolean }) =>
    useQuery<SeasonalBestPlaces>({
        // Month-scoped key: rolling over to a new calendar month
        // changes the key and forces a fresh fetch the next time the
        // hook runs — without this, a long-lived tab keeps showing the
        // previous month's picks until staleTime elapses.
        queryKey: ['seasonal-best-places', currentMonthKey()],
        queryFn: fetchSeasonalBestPlaces,
        enabled: options?.enabled ?? true,
        // Picks don't change inside a calendar month, so don't refetch
        // on focus / mount within the same session.
        staleTime: 12 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
    });
