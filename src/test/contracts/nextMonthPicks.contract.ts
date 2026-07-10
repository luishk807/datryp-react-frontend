import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /me/next-month-picks` (homepage "great next month"
 * box). Pins the snake_case wire shape the FE reshapes into camelCase
 * `NextMonthPickItem`s plus the `month_label` title.
 *
 * `.strict()` catches backend drift (extra / missing / mistyped field) in CI.
 */
export const NextMonthPickItemContract = z
    .object({
        kind: z.enum(['place', 'city', 'country']),
        key: z.string(),
        name: z.string(),
        location: z.string(),
        city: z.string().nullable(),
        country: z.string().nullable(),
        country_code: z.string().nullable(),
        image_url: z.string().nullable(),
        best_time_to_visit: z.string(),
        saved_at: z.string(),
    })
    .strict();

export const NextMonthPicksContract = z
    .object({
        items: z.array(NextMonthPickItemContract),
        month_label: z.string(),
    })
    .strict();
