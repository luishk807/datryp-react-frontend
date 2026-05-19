import type { SAVED_SOURCE } from 'constants';

export type SavedSource = (typeof SAVED_SOURCE)[keyof typeof SAVED_SOURCE];

/** One place the current user has bookmarked from the recommender.
 *  Mirrors the backend `SavedPlaceItem` schema (camelCase here, snake_case
 *  on the wire). */
export interface SavedPlace {
    id: string;
    placeKey: string;
    placeName: string;
    placeCity: string;
    placeCountry: string;
    /** ISO 3166-1 alpha-2. Null when the bookmark was created before the
     *  field existed (e.g. migrated from localStorage). */
    countryCode: string | null;
    imageUrl: string | null;
    /** (query, index) pair the bookmark was created from. The Saved page
     *  links back to `/place?q=<query>&i=<index>` so re-opening hits the
     *  cached recommender result. Null for legacy / non-search saves. */
    searchQuery: string | null;
    searchIndex: number | null;
    source: SavedSource;
    savedAt: string;
}

export interface SavedPlaceCreatePayload {
    placeName: string;
    placeCity: string;
    placeCountry: string;
    countryCode?: string | null;
    imageUrl?: string | null;
    searchQuery?: string | null;
    searchIndex?: number | null;
}
