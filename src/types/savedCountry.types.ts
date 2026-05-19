import type { SavedSource } from './savedPlace.types';

/** One country the current user has bookmarked. Mirrors the backend
 *  `SavedCountryItem` schema. */
export interface SavedCountry {
    id: string;
    countryId: string;
    countryName: string;
    countryCode: string;
    countryImage: string | null;
    source: SavedSource;
    savedAt: string;
}
