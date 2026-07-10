import { z } from 'zod';

/**
 * Zod CONTRACT for the visited-COUNTRIES boundary (`/me/visited-countries`).
 * The client reshapes the snake_case wire payload into these camelCase fields;
 * the contract pins the shape the frontend consumes so backend drift is caught
 * in CI. `.strict()` — extra or missing field fails. Update with
 * `VisitedCountry`.
 */
export const VisitedCountryContract = z
    .object({
        id: z.string(),
        countryId: z.string(),
        countryName: z.string(),
        countryCode: z.string(),
        countryImage: z.string().nullable(),
        source: z.enum(['manual', 'itinerary']),
        visitedAt: z.string(),
    })
    .strict();

export const VisitedCountriesResponseContract = z
    .object({
        items: z.array(VisitedCountryContract),
        total: z.number(),
    })
    .strict();
