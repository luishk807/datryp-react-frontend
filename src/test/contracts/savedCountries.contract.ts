import { z } from 'zod';

/**
 * Zod CONTRACT for the saved-COUNTRIES boundary (`/me/saved/countries`). The
 * client reshapes the snake_case wire payload into these camelCase fields; the
 * contract pins the shape the frontend consumes so backend drift is caught in
 * CI. `.strict()` — extra or missing field fails. Update with `SavedCountry`.
 */
export const SavedCountryContract = z
    .object({
        id: z.string(),
        countryId: z.string(),
        countryName: z.string(),
        countryCode: z.string(),
        countryImage: z.string().nullable(),
        source: z.enum(['manual']),
        savedAt: z.string(),
    })
    .strict();

export const SavedCountriesResponseContract = z
    .object({
        items: z.array(SavedCountryContract),
        total: z.number(),
    })
    .strict();
