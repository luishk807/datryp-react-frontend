import { z } from 'zod';

/**
 * Zod CONTRACTS for `/me/preferences` and the three catalog endpoints
 * (app/routers/preferences.py). Wire format is snake_case; the client reshapes
 * into camelCase. These pin the raw wire shape the reshaper depends on.
 *
 * `.strict()` catches backend drift at the wire boundary.
 */
export const PreferencesWireContract = z
    .object({
        phone: z.string().nullable(),
        birth_year: z.number().nullable(),
        country_of_birth_code: z.string().nullable(),
        passport_country_code: z.string().nullable(),
        gender_id: z.string().nullable(),
        interests: z.array(z.string()),
        traveler_styles: z.array(z.string()),
        dream_destinations: z.array(z.string()),
        onboarding_completed_at: z.string().nullable(),
        home_city: z.string().nullable(),
        home_country: z.string().nullable(),
        home_country_code: z.string().nullable(),
        home_latitude: z.number().nullable(),
        home_longitude: z.number().nullable(),
        travel_companions: z.array(z.string()),
        kids_age_buckets: z.array(z.string()),
        notify_email: z.boolean(),
        notify_sms: z.boolean(),
        share_visited_places: z.boolean(),
    })
    .strict();

const catalogOptionContract = z
    .object({ slug: z.string(), label: z.string() })
    .strict();

export const InterestsCatalogWireContract = z
    .object({ interests: z.array(catalogOptionContract) })
    .strict();

export const TravelerStylesCatalogWireContract = z
    .object({ traveler_styles: z.array(catalogOptionContract) })
    .strict();

export const GendersCatalogWireContract = z
    .object({
        genders: z.array(
            z.object({ id: z.string(), name: z.string() }).strict()
        ),
    })
    .strict();
