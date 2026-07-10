import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /me/country-of-birth-event` — the biggest upcoming
 * event in the user's country of birth (one event + N host cities). Mirrors
 * the `/me/world-event` shape but is a distinct endpoint that can drift on its
 * own, so it gets its own contract. 204 (→ null, no country of birth set or no
 * major event) is short-circuited before parsing. `.strict()` on every level.
 */
export const CountryOfBirthEventInfoWireContract = z
    .object({
        name: z.string(),
        start_date: z.string(),
        end_date: z.string(),
        host_country: z.string(),
        description: z.string(),
        hype: z.string(),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

export const CountryOfBirthEventPlaceWireContract = z
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

export const CountryOfBirthEventWireContract = z
    .object({
        event: CountryOfBirthEventInfoWireContract,
        places: z.array(CountryOfBirthEventPlaceWireContract),
    })
    .strict();
