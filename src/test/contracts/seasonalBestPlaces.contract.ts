import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /seasonal-best-places` — the Pro homepage strip of
 * six destinations whose current-month season stands out. The wire is a
 * `{ month_key, places: [...], cached }` envelope; each place carries nullable
 * image/credit fields plus required prose. `.strict()` on the place shape and
 * the envelope catches fields the `toPlace` reshaper doesn't map.
 */
export const SeasonalPlaceWireContract = z
    .object({
        name: z.string(),
        country: z.string(),
        country_code: z.string(),
        why: z.string(),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

export const SeasonalBestPlacesWireContract = z
    .object({
        month_key: z.string(),
        places: z.array(SeasonalPlaceWireContract),
        cached: z.boolean(),
    })
    .strict();
