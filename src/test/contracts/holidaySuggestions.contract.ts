import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /me/holiday-suggestions` — Pro upcoming-holiday picks
 * (one holiday + N places + N activities). `holiday` and each `place` reshape
 * snake→camel; `activities` pass straight through. Image / credit fields are
 * nullable prose everywhere else is required. `.strict()` on every level.
 */
export const HolidayInfoWireContract = z
    .object({
        name: z.string(),
        date: z.string(),
        country: z.string(),
        description: z.string(),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

export const HolidayPlaceWireContract = z
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

export const HolidayActivityWireContract = z
    .object({
        title: z.string(),
        description: z.string(),
    })
    .strict();

export const HolidaySuggestionsWireContract = z
    .object({
        holiday: HolidayInfoWireContract,
        places: z.array(HolidayPlaceWireContract),
        activities: z.array(HolidayActivityWireContract),
    })
    .strict();
