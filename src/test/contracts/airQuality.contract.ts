import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /air-quality` (Open-Meteo air-quality proxy). Pins the
 * raw wire shape the frontend reshapes into `AirQualityLive`.
 *
 * `category_key` is left as a plain string on purpose: the backend may add
 * bands and the client tolerantly falls back to `moderate` for any value it
 * doesn't recognize, so this contract must not reject an unknown band.
 *
 * `.strict()` still catches a renamed/removed/added field.
 */
export const AirQualityWireContract = z
    .object({
        aqi: z.number(),
        category_key: z.string(),
        pm2_5: z.number().nullable(),
        observed_at: z.string().nullable(),
    })
    .strict();
