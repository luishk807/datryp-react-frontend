import { useQuery } from '@tanstack/react-query';
import { fetchPlaceRating, type PlaceRating } from 'api/placeRatingApi';

/**
 * Fetch a Google Places rating for `(name, location)`. Cached for an
 * hour in TanStack Query and another 6 hours server-side, so repeat
 * renders of the same chip don't burn quota.
 *
 * Returns `null` when:
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
) => {
    const trimmedName = name.trim();
    const trimmedLocation = location?.trim() ?? '';
    return useQuery<PlaceRating | null>({
        queryKey: ['placeRating', trimmedName.toLowerCase(), trimmedLocation.toLowerCase()],
        queryFn: () => fetchPlaceRating(trimmedName, trimmedLocation),
        enabled: enabled && trimmedName.length >= 2,
        staleTime: 60 * 60 * 1000,
        retry: 0,
    });
};
