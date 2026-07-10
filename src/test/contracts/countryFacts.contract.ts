import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /country-facts` (app/routers/country_facts.py, grounded
 * by app/data/country_facts.py). The response is a large, mostly-optional facts
 * bundle: only `country_code`, `emergency`, `power`, `timezone`, and
 * `timezone_multi` are always present; every richer section was added later and
 * is `.optional()` so older curated rows still validate.
 *
 * A 204 (uncurated country) never reaches this contract — the client maps it to
 * null before parsing. `.strict()` catches unexpected new fields so the FE's
 * reshaper is updated alongside the backend.
 */
const powerContract = z
    .object({
        plugs: z.array(z.string()),
        voltage: z.number(),
        frequency: z.number(),
    })
    .strict();

const religionContract = z
    .object({
        main: z.string(),
        emoji: z.string().nullable(),
        note: z.string().nullable(),
        customs: z.array(z.string()),
    })
    .strict();

const tippingContract = z
    .object({
        summary: z.string(),
        categories: z.record(z.string()),
    })
    .strict();

const waterContract = z
    .object({
        status: z.string(),
        note: z.string().nullable(),
    })
    .strict();

const wifiContract = z
    .object({
        rating: z.number(),
        summary: z.string(),
        mobile: z.string().nullable(),
    })
    .strict();

const currencyTipsContract = z
    .object({
        cards: z.string().nullable(),
        cash: z.string().nullable(),
        atm: z.string().nullable(),
        apple_pay: z.string().nullable().optional(),
        cards_rating: z.number().nullable().optional(),
        cash_rating: z.number().nullable().optional(),
    })
    .strict();

const healthContract = z
    .object({
        vaccinations: z.string().nullable(),
        mosquitoes: z.string().nullable(),
        malaria: z.string().nullable(),
    })
    .strict();

const accessibilityContract = z
    .object({
        wheelchair: z.string().nullable(),
        transit: z.string().nullable(),
        sidewalks: z.string().nullable(),
        signage: z.string().nullable(),
    })
    .strict();

const avgCostsContract = z
    .object({
        budget: z.string().nullable(),
        midrange: z.string().nullable(),
        luxury: z.string().nullable(),
        meal: z.string().nullable(),
        coffee: z.string().nullable(),
        transit: z.string().nullable(),
        beer: z.string().nullable(),
    })
    .strict();

const festivalContract = z
    .object({
        name: z.string(),
        when: z.string().nullable(),
    })
    .strict();

export const CountryFactsWireContract = z
    .object({
        country_code: z.string(),
        emergency: z.record(z.string()),
        power: powerContract.nullable(),
        timezone: z.string().nullable(),
        timezone_multi: z.boolean(),
        religion: religionContract.nullable().optional(),
        tipping: tippingContract.nullable().optional(),
        water: waterContract.nullable().optional(),
        wifi: wifiContract.nullable().optional(),
        great_for: z.array(z.string()).optional(),
        safety_tips: z.array(z.string()).optional(),
        scams: z.array(z.string()).optional(),
        currency_tips: currencyTipsContract.nullable().optional(),
        avg_costs: avgCostsContract.nullable().optional(),
        health: healthContract.nullable().optional(),
        accessibility: accessibilityContract.nullable().optional(),
        festivals: z.array(festivalContract).optional(),
        etiquette: z.array(z.string()).optional(),
        source: z.string().optional(),
    })
    .strict();
