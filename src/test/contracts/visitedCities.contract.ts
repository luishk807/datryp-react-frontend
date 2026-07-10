import { z } from 'zod';

/**
 * Zod CONTRACT for the visited-CITIES boundary (`/me/visited-cities`). The
 * client reshapes the snake_case wire payload into these camelCase fields; the
 * contract pins the shape the frontend consumes so backend drift is caught in
 * CI. `.strict()` — extra or missing field fails. Update with `VisitedCity`.
 */
export const VisitedCityContract = z
    .object({
        id: z.string(),
        citySlug: z.string(),
        cityName: z.string(),
        countryName: z.string(),
        countryCode: z.string(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        source: z.enum(['manual', 'itinerary']),
        visitedAt: z.string(),
    })
    .strict();

export const VisitedCitiesResponseContract = z
    .object({
        items: z.array(VisitedCityContract),
        total: z.number(),
    })
    .strict();
