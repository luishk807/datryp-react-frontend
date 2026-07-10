import { z } from 'zod';

/**
 * Zod CONTRACTS for the `/place-recommendations`, `/place-direct`,
 * `/place-details` and `/place-details/{prose,lists,facts}` REST boundary
 * (backend app/routers/place_recommendations.py). The client
 * (`placeRecommendationsApi.ts`) reshapes each snake_case wire payload into the
 * camelCase FE types, so these contracts pin the shape the FRONTEND consumes.
 *
 * `.strict()` throughout — a renamed / dropped / retyped wire field surfaces
 * here as a missing / wrong-typed camelCase field after the `to*` mappers run.
 * Sub-object schemas are `.optional()` where the mapper emits `undefined`
 * (null / absent wire sub-objects collapse to `undefined` on the slice path).
 */

// ---------- recommendations ----------

export const PlaceRecommendationContract = z
    .object({
        name: z.string(),
        city: z.string(),
        country: z.string(),
        countryCode: z.string().nullable(),
        rating: z.number(),
        bestTimeToVisit: z.string(),
        description: z.string(),
        imageUrl: z.string().nullable(),
        photographerName: z.string().nullable(),
        photographerUrl: z.string().nullable(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
    })
    .strict();

export const PlaceRecommendationsResultContract = z
    .object({
        query: z.string(),
        cached: z.boolean(),
        items: z.array(PlaceRecommendationContract),
        // `?? undefined` — present-as-undefined on the recommendations path,
        // key absent entirely on the /place-direct path. Both allowed.
        summary: z.string().optional(),
        relatedSearches: z.array(z.string()).optional(),
    })
    .strict();

// ---------- place details (shared leaf schemas) ----------

// toNamedTip emits the image trio as `?? undefined`, so they're optional
// strings; foods / photoSpots / notes leave them undefined entirely.
const NamedTipContract = z
    .object({
        name: z.string(),
        why: z.string(),
        imageUrl: z.string().optional(),
        photographerName: z.string().optional(),
        photographerUrl: z.string().optional(),
    })
    .strict();

const NearbyDestinationContract = z
    .object({
        name: z.string(),
        country: z.string(),
        kind: z.string(),
        why: z.string(),
        lat: z.number(),
        lng: z.number(),
        // `n.image_url ?? null` — string | null.
        imageUrl: z.string().nullable(),
        // Leaked by the `...n` spread when the wire row carried it (snake key).
        image_url: z.string().nullable().optional(),
    })
    .strict();

const CurrencyInfoContract = z
    .object({
        code: z.string(),
        name: z.string(),
        ratePerUsd: z.number(),
    })
    .strict();

const SafetyInfoContract = z
    .object({
        score: z.number(),
        level: z.enum(['low', 'moderate', 'high']),
        summary: z.string(),
    })
    .strict();

const CoordinatesContract = z
    .object({ lat: z.number(), lng: z.number() })
    .strict();

const TravelBasicsContract = z
    .object({
        preferredTransport: z.string(),
        transportSystem: z.string(),
        paymentMethod: z.enum(['cash', 'card', 'mixed']),
        paymentNote: z.string(),
        language: z.string(),
        vibe: z.string(),
        audience: z.string(),
        ageRecommendation: z.string(),
    })
    .strict();

const LodgingInfoContract = z
    .object({
        recommendedType: z.string(),
        airbnbAvailability: z.enum(['common', 'limited', 'none']),
        airbnbNote: z.string(),
        hotelAvailability: z.enum(['common', 'limited', 'none']),
        hotelNote: z.string(),
        priceRange: z.string(),
        bookingTip: z.string(),
    })
    .strict();

const VisaInfoContract = z
    .object({
        destinationCountryCode: z.string(),
        visaFreeCountries: z.array(z.string()),
        visaOnArrivalCountries: z.array(z.string()),
        summary: z.string(),
    })
    .strict();

const AirportContract = z
    .object({
        iataCode: z.string(),
        name: z.string(),
        distanceKm: z.number(),
        international: z.boolean(),
    })
    .strict();

const PopularityInfoContract = z
    .object({
        score: z.number(),
        trend: z.enum(['rising', 'steady', 'falling']),
        summary: z.string(),
    })
    .strict();

const WalkabilityInfoContract = z
    .object({ rating: z.number(), note: z.string() })
    .strict();

const HiddenGemContract = z
    .object({ name: z.string(), why: z.string() })
    .strict();

const NeighborhoodTipsContract = z
    .object({ best: z.array(z.string()), avoid: z.array(z.string()) })
    .strict();

const LocalFlavorContract = z
    .object({
        funLevel: z.number(),
        nightlife: z.string(),
        famousLiquor: z.string(),
        uniqueSouvenir: z.string(),
        mustDoBeforeLeaving: z.array(NamedTipContract),
    })
    .strict();

// Slice shapes — one per progressive OpenAI prompt group. The monolithic
// PlaceDetails is exactly their merge (see `toDetails`).
const proseShape = {
    longDescription: z.string(),
    countryDescription: z.string(),
    budgetDescription: z.string(),
    cityHighlight: z.string(),
    countryHighlight: z.string(),
    weather: z.string(),
    worstTimeToVisit: z.string(),
    culturalShock: z.string().optional(),
    beforeYouGo: z.array(z.string()).optional(),
    hiddenGems: z.array(HiddenGemContract).optional(),
    neighborhoods: NeighborhoodTipsContract.optional(),
};

const listsShape = {
    foods: z.array(NamedTipContract),
    placesToVisit: z.array(NamedTipContract),
    thingsToDo: z.array(NamedTipContract),
    photoSpots: z.array(NamedTipContract),
    notesToKnow: z.array(NamedTipContract),
    nearbyDestinations: z.array(NearbyDestinationContract),
    localFlavor: LocalFlavorContract.optional(),
};

const factsShape = {
    currency: CurrencyInfoContract.optional(),
    safety: SafetyInfoContract.optional(),
    coordinates: CoordinatesContract.optional(),
    travelBasics: TravelBasicsContract.optional(),
    lodging: LodgingInfoContract.optional(),
    costLevel: z.number(),
    visa: VisaInfoContract.optional(),
    airports: z.array(AirportContract),
    popularity: PopularityInfoContract.optional(),
    walkability: WalkabilityInfoContract.optional(),
    greatFor: z.array(z.string()).optional(),
};

export const PlaceProseSliceContract = z.object(proseShape).strict();
export const PlaceListsSliceContract = z.object(listsShape).strict();
export const PlaceFactsSliceContract = z.object(factsShape).strict();

export const PlaceDetailsContract = z
    .object({ ...proseShape, ...listsShape, ...factsShape })
    .strict();

export const PlaceDetailsResultContract = z
    .object({
        query: z.string(),
        index: z.number(),
        cached: z.boolean(),
        details: PlaceDetailsContract,
    })
    .strict();
