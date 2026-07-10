import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /essential-apps?code=<ISO2>` (curated essential-apps
 * section). Pins the static, public wire shape the FE reshapes. `source` and
 * `intro` are optional on the wire (older cached rows omit them).
 *
 * `.strict()` catches an unexpected extra / missing required field so backend
 * drift is caught in CI.
 */
export const EssentialAppContract = z
    .object({
        name: z.string(),
        note: z.string().nullable(),
        status: z.string().nullable(),
    })
    .strict();

export const EssentialAppCategoryContract = z
    .object({
        key: z.string(),
        apps: z.array(EssentialAppContract),
    })
    .strict();

export const EssentialAppsContract = z
    .object({
        country_code: z.string(),
        categories: z.array(EssentialAppCategoryContract),
        source: z.string().optional(),
        intro: z.string().nullable().optional(),
    })
    .strict();
