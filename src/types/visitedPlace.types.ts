import type { VISITED_SOURCE } from 'constants';

export type VisitedSource = (typeof VISITED_SOURCE)[keyof typeof VISITED_SOURCE];

/** One place the current user has marked as visited.
 *  Mirrors the backend `VisitedPlaceItem` schema (camelCase here, snake_case
 *  on the wire). */
export interface VisitedPlace {
    id: string;
    placeKey: string;
    placeName: string;
    placeCity: string;
    placeCountry: string;
    /** ISO 3166-1 alpha-2, e.g. "IT", "FR". `null` for older / partial rows. */
    countryCode: string | null;
    /** ISO 3166-2, e.g. "IT-62". `null` until a region geocoder is wired in. */
    regionCode: string | null;
    regionName: string | null;
    latitude: number | null;
    longitude: number | null;
    source: VisitedSource;
    /** Itinerary id back-link. Set when the row was written by the
     *  trip-completion cascade (or back-filled onto a manual row by that
     *  cascade). Null on rows persisted before the cascade extension
     *  shipped and on pure-manual marks with no matching trip. The
     *  Mapper pin popup renders a "View trip" CTA when present. */
    tripId: string | null;
    /** Denormalized trip name at cascade-write time. Can go stale if
     *  the trip is renamed later — these are historical records. */
    tripName: string | null;
    visitedAt: string;
}

export interface VisitedPlaceCreatePayload {
    placeName: string;
    placeCity: string;
    placeCountry: string;
    countryCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}
