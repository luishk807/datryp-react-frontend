import { useQuery } from '@tanstack/react-query';
import {
    fetchFriendsVisitedAll,
    type FriendsVisitedAllResult,
} from 'api/friendsVisitedApi';
import { useUser } from 'context/UserContext';

/**
 * Every opted-in friend's visits (countries / cities / places), grouped
 * by location — backs the Travel Atlas "visited by friends" overlay.
 *
 * Gated by `enabled` (the caller passes `isPro`, since the Atlas is a
 * Pro feature) AND a signed-in user. Cached 5 min like the per-location
 * friends-visited hook — the social graph + visited lists don't move
 * fast enough to need tighter staleness.
 */
export const useFriendsVisitedAll = (enabled = true) => {
    const { user } = useUser();
    return useQuery<FriendsVisitedAllResult>({
        queryKey: ['me', 'friends-visited', 'all'],
        queryFn: fetchFriendsVisitedAll,
        enabled: Boolean(user) && enabled,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
};
