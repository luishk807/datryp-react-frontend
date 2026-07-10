import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /geo/language` (app/routers/geo.py). Pins the wire
 * shape the frontend reads: a `lang` hint (Spanish/English or null when the
 * backend can't tell) plus the IP-geolocated ISO-2 `country`.
 *
 * `.strict()` — an extra or missing field fails the contract so backend drift
 * is caught in CI instead of surfacing as a silent `undefined` in the
 * geo-language bootstrap.
 */
export const GeoLanguageContract = z
    .object({
        lang: z.enum(['en', 'es']).nullable(),
        country: z.string().nullable(),
    })
    .strict();
