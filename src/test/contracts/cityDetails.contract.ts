import { z } from 'zod';
import {
    airportWire,
    coordinatesWire,
    currencyInfoWire,
    hiddenGemWire,
    localFlavorWire,
    lodgingInfoWire,
    namedTipWire,
    nearbyDestinationWire,
    popularityWire,
    safetyInfoWire,
    travelBasicsWire,
    visaInfoWire,
} from './detailShared.contract';

/**
 * Zod CONTRACTS for the four city endpoints in `src/api/cityDetailsApi.ts`
 * (backend `app/routers/city_details.py`):
 *   - GET /city-details          → full envelope { city, cached, details }
 *   - GET /city-details/prose    → { city, cached, prose }
 *   - GET /city-details/lists    → { cached, lists }
 *   - GET /city-details/facts    → { cached, facts }
 *
 * The monolithic `details` object carries every field non-null; the slice
 * payloads (`facts`, `lists`) relax sub-objects to `.nullable()` because the
 * progressive endpoints can return a partially-hydrated row. `.strict()`
 * everywhere so a new backend field forces the reshaper to be updated.
 *
 * `great_for` is on the facts slice (per-city vibe tags) and rides along on the
 * composed full `details`, so it's `.optional()` on both.
 */

export const citySummaryWire = z
    .object({
        name: z.string(),
        country: z.string(),
        country_code: z.string(),
        country_id: z.string().nullable(),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

const walkabilityWire = z
    .object({
        rating: z.number(),
        note: z.string().nullable(),
    })
    .strict();

const neighborhoodsWire = z
    .object({
        best: z.array(z.string()),
        avoid: z.array(z.string()),
    })
    .strict();

export const cityDetailsWire = z
    .object({
        long_description: z.string(),
        country_description: z.string(),
        budget_description: z.string(),
        city_highlight: z.string(),
        country_highlight: z.string(),
        top_places: z.array(namedTipWire),
        foods: z.array(namedTipWire),
        things_to_do: z.array(namedTipWire),
        photo_spots: z.array(namedTipWire),
        notes_to_know: z.array(namedTipWire),
        best_time_to_visit: z.string(),
        worst_time_to_visit: z.string(),
        weather: z.string(),
        currency: currencyInfoWire,
        safety: safetyInfoWire,
        coordinates: coordinatesWire,
        travel_basics: travelBasicsWire,
        lodging: lodgingInfoWire,
        nearby_destinations: z.array(nearbyDestinationWire),
        local_flavor: localFlavorWire,
        cost_level: z.number(),
        visa: visaInfoWire,
        airports: z.array(airportWire).optional(),
        tourist_rating: z.number().optional(),
        popularity: popularityWire.nullable().optional(),
        walkability: walkabilityWire.nullable().optional(),
        cultural_shock: z.string().nullable().optional(),
        before_you_go: z.array(z.string()).optional(),
        hidden_gems: z.array(hiddenGemWire).optional(),
        neighborhoods: neighborhoodsWire.nullable().optional(),
        great_for: z.array(z.string()).optional(),
    })
    .strict();

export const CityDetailsResponseWireContract = z
    .object({
        city: citySummaryWire,
        cached: z.boolean(),
        details: cityDetailsWire,
    })
    .strict();

export const cityProseWire = z
    .object({
        long_description: z.string(),
        country_description: z.string(),
        budget_description: z.string(),
        city_highlight: z.string(),
        country_highlight: z.string(),
        weather: z.string(),
        best_time_to_visit: z.string(),
        worst_time_to_visit: z.string(),
        cultural_shock: z.string().nullable().optional(),
        before_you_go: z.array(z.string()).optional(),
        hidden_gems: z.array(hiddenGemWire).optional(),
        neighborhoods: neighborhoodsWire.nullable().optional(),
    })
    .strict();

export const CityProseResponseWireContract = z
    .object({
        city: citySummaryWire,
        cached: z.boolean(),
        prose: cityProseWire,
    })
    .strict();

export const cityListsWire = z
    .object({
        top_places: z.array(namedTipWire),
        foods: z.array(namedTipWire),
        things_to_do: z.array(namedTipWire),
        photo_spots: z.array(namedTipWire),
        notes_to_know: z.array(namedTipWire),
        nearby_destinations: z.array(nearbyDestinationWire),
        local_flavor: localFlavorWire.nullable(),
    })
    .strict();

export const CityListsResponseWireContract = z
    .object({
        cached: z.boolean(),
        lists: cityListsWire,
    })
    .strict();

export const cityFactsWire = z
    .object({
        currency: currencyInfoWire.nullable(),
        safety: safetyInfoWire.nullable(),
        coordinates: coordinatesWire.nullable(),
        travel_basics: travelBasicsWire.nullable(),
        lodging: lodgingInfoWire.nullable(),
        cost_level: z.number(),
        visa: visaInfoWire.nullable(),
        airports: z.array(airportWire).optional(),
        tourist_rating: z.number().optional(),
        popularity: popularityWire.nullable().optional(),
        walkability: walkabilityWire.nullable().optional(),
        great_for: z.array(z.string()).optional(),
    })
    .strict();

export const CityFactsResponseWireContract = z
    .object({
        cached: z.boolean(),
        facts: cityFactsWire,
    })
    .strict();
