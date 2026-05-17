import type { VisitedSource } from './visitedPlace.types';

/** One country the current user has marked as visited.
 *  Mirrors the backend `VisitedCountryItem` schema (camelCase here,
 *  snake_case on the wire). */
export interface VisitedCountry {
    id: string;
    countryId: string;
    countryName: string;
    countryCode: string;
    countryImage: string | null;
    source: VisitedSource;
    visitedAt: string;
}
