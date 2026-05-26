import type { VISITED_SOURCE } from 'constants';

export type VisitedSource = (typeof VISITED_SOURCE)[keyof typeof VISITED_SOURCE];

/** One trip that visited a given place. A user who's travelled to the
 *  same place across multiple trips gets multiple of these attached to
 *  a single `VisitedPlace`. Surfaced by the Mapper popup as either a
 *  single "View trip" CTA (one trip) or an inline list (2+ trips). */
export interface VisitedPlaceTrip {
    tripId: string;
    tripName: string | null;
    visitedAt: string;
}

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
    /** Trips that visited this place. Empty for `source='manual'` rows
     *  with no matching cascade write and for legacy rows from before
     *  the multi-trip data model shipped. Newest-first by `visitedAt`. */
    trips: VisitedPlaceTrip[];
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
