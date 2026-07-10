import { z } from 'zod';

/**
 * Zod CONTRACTS for the REST auth endpoints (app/routers/auth.py +
 * app/schemas/auth.py on the backend). These pin the exact wire shape the
 * frontend depends on: field names (snake_case), types, and nullability.
 *
 * `.strict()` is deliberate — an unexpected extra field OR a missing field
 * both fail the contract, so a backend response drifting from what the FE
 * expects is caught in CI instead of surfacing as a runtime `undefined`.
 *
 * When the backend intentionally changes a payload, update the matching
 * schema here (and the FE `MeResponse` / `TokenResponse` interface) together.
 */

export const TokenResponseContract = z
    .object({
        access_token: z.string(),
        token_type: z.literal('bearer'),
        expires_in: z.number(),
    })
    .strict();

export const MeResponseContract = z
    .object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable(),
        role: z.string(),
        subscription_plan: z.string(),
        subscription_status: z.string(),
        effective_trip_cap: z.number(),
        is_paid_member: z.boolean(),
        trial_ends_at: z.string().nullable(),
        current_period_end: z.string().nullable(),
        subscription_cancel_at_period_end: z.boolean(),
        phone: z.string().nullable(),
        birth_year: z.number().nullable(),
        country_of_birth_code: z.string().nullable(),
        passport_country_code: z.string().nullable(),
        gender_id: z.string().nullable(),
        interests: z.array(z.string()),
        traveler_styles: z.array(z.string()),
        dream_destinations: z.array(z.string()),
        onboarding_completed_at: z.string().nullable(),
        profile_image_url: z.string().nullable(),
        home_city: z.string().nullable(),
        home_country: z.string().nullable(),
        home_country_code: z.string().nullable(),
        home_latitude: z.number().nullable(),
        home_longitude: z.number().nullable(),
        travel_companions: z.array(z.string()),
        kids_age_buckets: z.array(z.string()),
        notify_email: z.boolean(),
        notify_sms: z.boolean(),
        email_verified: z.boolean(),
        detected_country_code: z.string().nullable(),
        free_everything_active: z.boolean(),
        free_everything_until: z.string().nullable(),
    })
    .strict();
