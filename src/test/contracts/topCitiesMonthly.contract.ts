import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /top-cities-monthly` (app backend
 * `MonthlyTopCitiesResponseRaw`). The client reshapes each city snake→camel
 * into `MonthlyTopCity`. The three image fields are nullable (an AI pick may
 * lack a resolved photo / attribution); `name` / `country` / `country_code` /
 * `why` are always present. `.strict()` catches a renamed key or an added
 * field `toCity` doesn't yet map.
 */
export const MonthlyTopCityWireContract = z
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

export const MonthlyTopCitiesResponseContract = z
    .object({
        month: z.string(),
        cached: z.boolean(),
        cities: z.array(MonthlyTopCityWireContract),
    })
    .strict();
