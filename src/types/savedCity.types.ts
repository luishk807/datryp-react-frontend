import type { SavedSource } from './savedPlace.types';

/** One city the current user has bookmarked. Mirrors the backend
 *  `SavedCityItem` schema. */
export interface SavedCity {
    id: string;
    citySlug: string;
    cityName: string;
    countryName: string;
    countryCode: string;
    imageUrl: string | null;
    source: SavedSource;
    savedAt: string;
}

export interface SavedCityCreatePayload {
    name: string;
    country: string;
    code: string;
    imageUrl?: string | null;
}
