import type { VisitedSource } from './visitedPlace.types';

/** One city the current user has marked as visited.
 *  Mirrors the backend `VisitedCityItem` schema. */
export interface VisitedCity {
    id: string;
    citySlug: string;
    cityName: string;
    countryName: string;
    countryCode: string;
    /** Geocoded centre point of the city, set at mark-visited time via
     *  the OpenAI geocoder. Null on rows persisted before the geocoder
     *  shipped — the Mapper city-dropdown disables those rows so the
     *  "fly to city" action only lights up when we have coords. */
    latitude: number | null;
    longitude: number | null;
    source: VisitedSource;
    visitedAt: string;
}

export interface VisitedCityCreatePayload {
    name: string;
    country: string;
    code: string;
}
