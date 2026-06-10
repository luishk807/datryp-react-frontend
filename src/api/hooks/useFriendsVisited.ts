import { useQuery } from '@tanstack/react-query';
import {
    fetchFriendsVisited,
    type FriendsVisitedKind,
    type FriendsVisitedResult,
} from 'api/friendsVisitedApi';
import { useUser } from 'context/UserContext';

/**
 * "X friends visited here" hook for the detail-page badge + modal.
 * Returns 0-count for users with no signed-in session (gated by
 * `enabled`) and for users with no matching friend visits.
 *
 * Cached 5 min client-side — the underlying social graph + visited
 * lists don't change fast enough to need tighter staleness, and the
 * detail page commonly mounts multiple times (navigation between
 * sibling places) so we want the chip rendered instantly on re-mount.
 */
export const useFriendsVisited = (
    kind: FriendsVisitedKind,
    key: string | null | undefined,
    /** Synthetic review-slug for city / country pages — see
     *  `fetchFriendsVisited`. Omitted on place pages. */
    reviewKey?: string | null,
) => {
    const { user } = useUser();
    return useQuery<FriendsVisitedResult>({
        queryKey: ['me', 'friends-visited', kind, key, reviewKey ?? null],
        queryFn: () => fetchFriendsVisited(kind, key as string, reviewKey),
        // Skip entirely when there's no key yet (detail page mid-load)
        // or no signed-in user. Both produce the "no badge" state.
        enabled: Boolean(user && key),
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
};
