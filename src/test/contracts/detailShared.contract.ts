import { z } from 'zod';

/**
 * Shared WIRE (snake_case) leaf contracts for the destination-detail endpoints.
 * `GET /city-details` and `GET /country-details` (plus their prose/lists/facts
 * slices) reshape the SAME set of nested sub-objects — currency, safety, travel
 * basics, visa, lodging, nearby destinations, local flavor, airports, etc. —
 * into camelCase. These leaf schemas are the single source of truth for those
 * sub-shapes so the two per-module contracts (cityDetails / countryDetails)
 * compose them instead of duplicating field-by-field.
 *
 * Every leaf is `.strict()` so a new backend field surfaces as a parse failure
 * and forces the FE reshaper to be updated alongside the backend. The image
 * fields on `namedTipWire` / `nearbyDestinationWire` are `.nullable().optional()`
 * because they're only populated for the first-N Unsplash-enriched entries.
 */

export const namedTipWire = z
    .object({
        name: z.string(),
        why: z.string(),
        image_url: z.string().nullable().optional(),
        photographer_name: z.string().nullable().optional(),
        photographer_url: z.string().nullable().optional(),
    })
    .strict();

export const currencyInfoWire = z
    .object({
        code: z.string(),
        name: z.string(),
        rate_per_usd: z.number(),
    })
    .strict();

export const safetyInfoWire = z
    .object({
        score: z.number(),
        level: z.enum(['low', 'moderate', 'high']),
        summary: z.string(),
    })
    .strict();

export const coordinatesWire = z
    .object({
        lat: z.number(),
        lng: z.number(),
    })
    .strict();

export const travelBasicsWire = z
    .object({
        preferred_transport: z.string(),
        transport_system: z.string(),
        payment_method: z.enum(['cash', 'card', 'mixed']),
        payment_note: z.string(),
        language: z.string(),
        vibe: z.string(),
        audience: z.string(),
        age_recommendation: z.string(),
    })
    .strict();

export const visaInfoWire = z
    .object({
        destination_country_code: z.string(),
        visa_free_countries: z.array(z.string()),
        visa_on_arrival_countries: z.array(z.string()),
        summary: z.string(),
    })
    .strict();

export const lodgingInfoWire = z
    .object({
        recommended_type: z.string(),
        airbnb_availability: z.enum(['common', 'limited', 'none']),
        airbnb_note: z.string(),
        hotel_availability: z.enum(['common', 'limited', 'none']),
        hotel_note: z.string(),
        price_range: z.string(),
        booking_tip: z.string(),
    })
    .strict();

export const nearbyDestinationWire = z
    .object({
        name: z.string(),
        country: z.string(),
        kind: z.string(),
        why: z.string(),
        lat: z.number(),
        lng: z.number(),
        image_url: z.string().nullable().optional(),
    })
    .strict();

export const localFlavorWire = z
    .object({
        fun_level: z.number(),
        nightlife: z.string(),
        famous_liquor: z.string(),
        unique_souvenir: z.string(),
        must_do_before_leaving: z.array(namedTipWire),
    })
    .strict();

export const airportWire = z
    .object({
        iata_code: z.string(),
        name: z.string(),
        distance_km: z.number(),
        international: z.boolean(),
    })
    .strict();

export const popularityWire = z
    .object({
        score: z.number(),
        trend: z.enum(['rising', 'steady', 'falling']),
        summary: z.string(),
    })
    .strict();

// `why` is nullable on the wire — the reshaper coerces it via `why ?? ""`.
export const hiddenGemWire = z
    .object({
        name: z.string(),
        why: z.string().nullable(),
    })
    .strict();
