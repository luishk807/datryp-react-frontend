import { z } from 'zod';

/**
 * Zod CONTRACT for the saved-CITIES boundary (`/me/saved/cities`). The client
 * reshapes the snake_case wire payload into these camelCase fields; the
 * contract pins the shape the frontend consumes so backend drift is caught in
 * CI. `.strict()` — extra or missing field fails. Update alongside `SavedCity`.
 */
export const SavedCityContract = z
    .object({
        id: z.string(),
        citySlug: z.string(),
        cityName: z.string(),
        countryName: z.string(),
        countryCode: z.string(),
        imageUrl: z.string().nullable(),
        source: z.enum(['manual']),
        savedAt: z.string(),
    })
    .strict();

export const SavedCitiesResponseContract = z
    .object({
        items: z.array(SavedCityContract),
        total: z.number(),
    })
    .strict();
