import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /me/monthly-best-place` — the Pro "best place to visit
 * this month" pick. The wire nests a single `place` object plus a flat
 * `highlights` list. Image/credit fields on `place` are nullable; everything
 * else is required prose. `.strict()` on every level catches backend drift the
 * `toPlace` reshaper hasn't been taught yet.
 */
export const MonthlyBestPlaceInfoWireContract = z
    .object({
        name: z.string(),
        country: z.string(),
        country_code: z.string(),
        tagline: z.string(),
        why_for_you: z.string(),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

export const MonthlyBestPlaceHighlightContract = z
    .object({
        title: z.string(),
        description: z.string(),
    })
    .strict();

export const MonthlyBestPlaceWireContract = z
    .object({
        month_key: z.string(),
        place: MonthlyBestPlaceInfoWireContract,
        highlights: z.array(MonthlyBestPlaceHighlightContract),
    })
    .strict();
