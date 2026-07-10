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
 * Zod CONTRACTS for the four country endpoints in
 * `src/api/countryDetailsApi.ts` (backend `app/routers/country_details.py`):
 *   - GET /country-details          → full envelope { country, cached, details }
 *   - GET /country-details/prose    → { country, cached, prose }
 *   - GET /country-details/lists    → { cached, lists }
 *   - GET /country-details/facts    → { cached, facts }
 *
 * Country mirrors city but drops the city-only fields (coordinates on the
 * detail root, walkability, neighborhoods, great_for) and swaps `top_places`
 * for `top_cities`, adding `capital_city` + `capital_coordinates`. The slice
 * payloads relax sub-objects to `.nullable()`. `.strict()` everywhere so a new
 * backend field forces the reshaper to be updated.
 */

export const countrySummaryWire = z
    .object({
        id: z.string(),
        name: z.string(),
        code: z.string(),
        local: z.string().nullable(),
        image: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

export const countryDetailsWire = z
    .object({
        long_description: z.string(),
        capital_city: z.string(),
        capital_coordinates: coordinatesWire.nullable().optional(),
        budget_description: z.string(),
        country_highlight: z.string(),
        top_cities: z.array(namedTipWire),
        foods: z.array(namedTipWire),
        things_to_do: z.array(namedTipWire),
        photo_spots: z.array(namedTipWire),
        notes_to_know: z.array(namedTipWire),
        best_time_to_visit: z.string(),
        worst_time_to_visit: z.string(),
        weather: z.string(),
        currency: currencyInfoWire,
        safety: safetyInfoWire,
        travel_basics: travelBasicsWire,
        lodging: lodgingInfoWire,
        nearby_destinations: z.array(nearbyDestinationWire),
        local_flavor: localFlavorWire,
        cost_level: z.number(),
        visa: visaInfoWire,
        airports: z.array(airportWire).optional(),
        tourist_rating: z.number().optional(),
        popularity: popularityWire.nullable().optional(),
        cultural_shock: z.string().nullable().optional(),
        before_you_go: z.array(z.string()).optional(),
        hidden_gems: z.array(hiddenGemWire).optional(),
    })
    .strict();

export const CountryDetailsResponseWireContract = z
    .object({
        country: countrySummaryWire,
        cached: z.boolean(),
        details: countryDetailsWire,
    })
    .strict();

export const countryProseWire = z
    .object({
        long_description: z.string(),
        capital_city: z.string(),
        capital_coordinates: coordinatesWire.nullable().optional(),
        budget_description: z.string(),
        country_highlight: z.string(),
        weather: z.string(),
        best_time_to_visit: z.string(),
        worst_time_to_visit: z.string(),
        cultural_shock: z.string().nullable().optional(),
        before_you_go: z.array(z.string()).optional(),
        hidden_gems: z.array(hiddenGemWire).optional(),
    })
    .strict();

export const CountryProseResponseWireContract = z
    .object({
        country: countrySummaryWire,
        cached: z.boolean(),
        prose: countryProseWire,
    })
    .strict();

export const countryListsWire = z
    .object({
        top_cities: z.array(namedTipWire),
        foods: z.array(namedTipWire),
        things_to_do: z.array(namedTipWire),
        photo_spots: z.array(namedTipWire),
        notes_to_know: z.array(namedTipWire),
        nearby_destinations: z.array(nearbyDestinationWire),
        local_flavor: localFlavorWire.nullable(),
    })
    .strict();

export const CountryListsResponseWireContract = z
    .object({
        cached: z.boolean(),
        lists: countryListsWire,
    })
    .strict();

export const countryFactsWire = z
    .object({
        currency: currencyInfoWire.nullable(),
        safety: safetyInfoWire.nullable(),
        travel_basics: travelBasicsWire.nullable(),
        lodging: lodgingInfoWire.nullable(),
        cost_level: z.number(),
        visa: visaInfoWire.nullable(),
        airports: z.array(airportWire).optional(),
        tourist_rating: z.number().optional(),
        popularity: popularityWire.nullable().optional(),
    })
    .strict();

export const CountryFactsResponseWireContract = z
    .object({
        cached: z.boolean(),
        facts: countryFactsWire,
    })
    .strict();
