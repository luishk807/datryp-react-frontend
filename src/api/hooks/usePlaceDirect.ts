import { useQuery } from '@tanstack/react-query';
import { fetchPlaceDirect } from 'api/placeRecommendationsApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';
import { useActiveLang } from 'i18n/useActiveLang';
import type { PlaceRecommendationsResult } from 'types';

/**
 * Go-direct resolver for a KNOWN place (name + city + country). Seeds/reuses a
 * single-place cache row server-side and returns the same shape as
 * `useSearchPlaces` (with one item at index 0), so the place page can swap
 * between the two paths transparently.
 *
 * This skips the 5-result AI recommender "discovery hop" the place page
 * otherwise runs first — navigations from saved / visited / map sources already
 * know the place, so there's no search to run. Gated on a non-empty name.
 */
export const usePlaceDirect = (
    name: string,
    city: string,
    country: string,
    options: { enabled?: boolean } = {}
) => {
    const { enabled = true } = options;
    const lang = useActiveLang();
    return useQuery<PlaceRecommendationsResult>({
        queryKey: [
            'place-direct',
            name.trim().toLowerCase(),
            city.trim().toLowerCase(),
            country.trim().toLowerCase(),
            lang,
        ],
        queryFn: () => fetchPlaceDirect(name, city, country),
        enabled: enabled && name.trim().length > 0,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};
