import type { VisitedSource } from './visitedPlace.types';

/** One city the current user has marked as visited.
 *  Mirrors the backend `VisitedCityItem` schema. */
export interface VisitedCity {
    id: string;
    citySlug: string;
    cityName: string;
    countryName: string;
    countryCode: string;
    source: VisitedSource;
    visitedAt: string;
}

export interface VisitedCityCreatePayload {
    name: string;
    country: string;
    code: string;
}
