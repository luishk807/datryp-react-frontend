import { z } from 'zod';

/**
 * Zod CONTRACT for the saved-PLACES boundary (`/me/saved/places`,
 * app/routers/saved_places.py). The client (`savedPlacesApi.ts`) reshapes the
 * snake_case wire payload into these camelCase fields, so the contract pins the
 * shape the FRONTEND consumes — a renamed / dropped / retyped wire field
 * surfaces here as a missing / wrong-typed camelCase field after `toItem`.
 *
 * `.strict()` — an unexpected extra field OR a missing one fails the contract,
 * so backend drift is caught in CI instead of surfacing as a runtime
 * `undefined`. Update this together with the `SavedPlace` interface when the
 * payload intentionally changes.
 */
export const SavedPlaceContract = z
    .object({
        id: z.string(),
        placeKey: z.string(),
        placeName: z.string(),
        placeCity: z.string(),
        placeCountry: z.string(),
        countryCode: z.string().nullable(),
        imageUrl: z.string().nullable(),
        searchQuery: z.string().nullable(),
        searchIndex: z.number().nullable(),
        source: z.enum(['manual']),
        savedAt: z.string(),
    })
    .strict();

export const SavedPlacesResponseContract = z
    .object({
        items: z.array(SavedPlaceContract),
        total: z.number(),
    })
    .strict();
