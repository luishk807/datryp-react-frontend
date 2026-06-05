import { useQuery } from '@tanstack/react-query';
import {
    fetchPlaceRating,
    type PlaceRating,
    type PlaceRatingFields,
} from 'api/placeRatingApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';
import { useUser } from 'context/UserContext';

/**
 * Fetch a Google Places rating for `(name, location)`. Cached for an
 * hour in TanStack Query and another 6 hours server-side, so repeat
 * renders of the same chip don't burn quota.
 *
 * Pro-only: Google Places is the real per-call cost, so we only fetch for
 * paid members (admins count as Pro). Free / anonymous users skip the call
 * entirely — the chip renders nothing and they're told it's a Pro perk on
 * the pricing page (/membership). The backend enforces the same gate.
 *
 * Returns `null` when:
 *   - the user isn't entitled (free / anonymous)
 *   - the backend isn't configured with a Google Maps key (503)
 *   - the query doesn't match a real place
 *   - the place has no rating yet
 * In all of those cases the calling chip just renders nothing — same
 * silent-fail UX the flight lookup uses.
 *
 * Pass `enabled=false` to skip the fetch entirely (e.g. when a parent
 * doesn't want ratings on a particular variant of a card).
 */
export const usePlaceRating = (
    name: string,
    location?: string,
    enabled: boolean = true,
    fields: PlaceRatingFields = 'all',
) => {
    const { user, isAdmin } = useUser();
    const isEntitled = Boolean(user && (user.isPaidMember || isAdmin));
    const trimmedName = name.trim();
    const trimmedLocation = location?.trim() ?? '';
    return useQuery<PlaceRating | null>({
        // `fields` is part of the key — a 'rating' result has no address
        // and a 'place' result has no rating, so they can't share a slot.
        queryKey: [
            'placeRating',
            trimmedName.toLowerCase(),
            trimmedLocation.toLowerCase(),
            fields,
        ],
        queryFn: () => fetchPlaceRating(trimmedName, trimmedLocation, fields),
        enabled: enabled && isEntitled && trimmedName.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 0,
    });
};
