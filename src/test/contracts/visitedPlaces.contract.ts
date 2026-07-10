import { z } from 'zod';

/**
 * Zod CONTRACT for the visited-PLACES boundary (`/me/visited`). The client
 * reshapes the snake_case wire payload (including the nested `trips` array) into
 * these camelCase fields; the contract pins the shape the frontend consumes so
 * backend drift is caught in CI. `.strict()` — extra or missing field fails.
 * Update alongside `VisitedPlace` / `VisitedPlaceTrip`.
 */
export const VisitedPlaceTripContract = z
    .object({
        tripId: z.string(),
        tripName: z.string().nullable(),
        visitedAt: z.string(),
    })
    .strict();

export const VisitedPlaceContract = z
    .object({
        id: z.string(),
        placeKey: z.string(),
        placeName: z.string(),
        placeCity: z.string(),
        placeCountry: z.string(),
        countryCode: z.string().nullable(),
        regionCode: z.string().nullable(),
        regionName: z.string().nullable(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        source: z.enum(['manual', 'itinerary']),
        trips: z.array(VisitedPlaceTripContract),
        visitedAt: z.string(),
    })
    .strict();

export const VisitedPlacesResponseContract = z
    .object({
        items: z.array(VisitedPlaceContract),
        total: z.number(),
    })
    .strict();
