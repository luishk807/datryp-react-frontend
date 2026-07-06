/**
 * Fetch layer for the curated per-country reference facts — emergency numbers,
 * mains power (plug types / voltage / frequency), and the capital's IANA time
 * zone. Backend is purely static and grounded (app/data/country_facts.py):
 * these are safety- and correctness-critical, so they're hand-curated and never
 * AI-generated. A 204 means the country isn't curated; we map it to `null` so
 * the card hides — same convention as /essential-apps.
 *
 * The API returns the IANA `timezone` name only; the live local time + the
 * offset relative to the visitor's own zone are computed client-side in the
 * component via `Intl`, so the fact stays correct without a server round-trip.
 */
const API_BASE = import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface PowerInfoRaw {
    plugs: string[];
    voltage: number;
    frequency: number;
}
interface ReligionInfoRaw {
    main: string;
    emoji: string | null;
    note: string | null;
    customs: string[];
}
interface TippingInfoRaw {
    summary: string;
    categories: Record<string, string>;
}
interface WaterInfoRaw {
    status: string;
    note: string | null;
}
interface WifiInfoRaw {
    rating: number;
    summary: string;
    mobile: string | null;
}
interface CurrencyTipsInfoRaw {
    cards: string | null;
    cash: string | null;
    atm: string | null;
    apple_pay?: string | null;
    cards_rating?: number | null;
    cash_rating?: number | null;
}
interface HealthInfoRaw {
    vaccinations: string | null;
    mosquitoes: string | null;
    malaria: string | null;
}
interface AccessibilityInfoRaw {
    wheelchair: string | null;
    transit: string | null;
    sidewalks: string | null;
    signage: string | null;
}
interface AvgCostsInfoRaw {
    budget: string | null;
    midrange: string | null;
    luxury: string | null;
    meal: string | null;
    coffee: string | null;
    transit: string | null;
    beer: string | null;
}
interface FestivalInfoRaw {
    name: string;
    when: string | null;
}
interface CountryFactsResponseRaw {
    country_code: string;
    emergency: Record<string, string>;
    power: PowerInfoRaw | null;
    timezone: string | null;
    timezone_multi: boolean;
    religion?: ReligionInfoRaw | null;
    tipping?: TippingInfoRaw | null;
    water?: WaterInfoRaw | null;
    wifi?: WifiInfoRaw | null;
    great_for?: string[];
    safety_tips?: string[];
    scams?: string[];
    currency_tips?: CurrencyTipsInfoRaw | null;
    avg_costs?: AvgCostsInfoRaw | null;
    health?: HealthInfoRaw | null;
    accessibility?: AccessibilityInfoRaw | null;
    festivals?: FestivalInfoRaw[];
    etiquette?: string[];
    source?: string;
}

export interface PowerInfo {
    /** Plug-type letters, e.g. `["C", "F"]` — rendered as "Type C / F". */
    plugs: string[];
    voltage: number;
    frequency: number;
}
export interface ReligionInfo {
    /** Dominant faith(s), traveler-facing (e.g. "Islam", "Shinto & Buddhism"). */
    main: string;
    /** Decorative glyph for the faith (e.g. "☪️", "⛩️"); may be null. */
    emoji: string | null;
    /** Short qualifier: "majority" / "official religion" / "very secular" … */
    note: string | null;
    /** A few practical, widely-accepted customs a visitor actually acts on. */
    customs: string[];
}
export interface TippingInfo {
    /** One-line overall stance (e.g. "Not expected — service is included"). */
    summary: string;
    /** Free-form service → expectation map. Common keys: `restaurants`,
     *  `bars`, `taxi`, `hotel`. The component labels the ones it knows and
     *  passes the rest through. */
    categories: Record<string, string>;
}
export type WaterStatus = 'safe' | 'caution' | 'unsafe';
export interface WaterInfo {
    /** Tap-water safety verdict. Unknown backend values fall back to
     *  `caution` (the safe default). */
    status: WaterStatus;
    /** Short practical note (e.g. "Stick to bottled water"). */
    note: string | null;
}
export interface WifiInfo {
    /** Overall connectivity quality, 1-5. */
    rating: number;
    /** One-line availability + speed feel. */
    summary: string;
    /** Optional mobile-network note (e.g. "5G widely available"). */
    mobile: string | null;
}
export interface CurrencyTipsInfo {
    /** Are cards widely accepted? */
    cards: string | null;
    /** Is cash needed, and where? */
    cash: string | null;
    /** ATM availability / caveats. */
    atm: string | null;
    /** Apple/Google Pay acceptance. Null for rows predating this field. */
    applePay: string | null;
    /** 1-5 how card-friendly. Null when unrated. */
    cardsRating: number | null;
    /** 1-5 how much cash you still need. Null when unrated. */
    cashRating: number | null;
}
export interface HealthInfo {
    /** Routine vs recommended vaccinations. */
    vaccinations: string | null;
    /** Mosquito-borne disease risk + advice. */
    mosquitoes: string | null;
    /** Malaria risk picture. */
    malaria: string | null;
}
export interface AccessibilityInfo {
    /** Wheelchair-friendliness. */
    wheelchair: string | null;
    /** Public-transit accessibility. */
    transit: string | null;
    /** Sidewalk quality / terrain. */
    sidewalks: string | null;
    /** How much English signage to expect. */
    signage: string | null;
}
export interface AvgCostsInfo {
    /** Budget traveler, per-day all-in total (USD). */
    budget: string | null;
    /** Mid-range traveler, per-day total (USD). */
    midrange: string | null;
    /** Luxury traveler, per-day total (USD). */
    luxury: string | null;
    /** Casual sit-down meal (USD). */
    meal: string | null;
    /** Café coffee (USD). */
    coffee: string | null;
    /** One local transit ride (USD). */
    transit: string | null;
    /** Local beer at a bar (USD). */
    beer: string | null;
}
export interface FestivalInfo {
    name: string;
    /** Rough timing — a month or season (many are movable). */
    when: string | null;
}
export interface CountryFactsResult {
    countryCode: string;
    /** Free-form map of emergency-service → number. Common keys: `general`,
     *  `police`, `ambulance`, `fire`, `tourist`, `mobile`. The component
     *  renders the ones it has labels for and passes the rest through. */
    emergency: Record<string, string>;
    power: PowerInfo | null;
    /** IANA zone name of the capital / main zone (e.g. "Asia/Tokyo"). */
    timezone: string | null;
    /** True when the country spans several zones (this is just the capital's). */
    timezoneMulti: boolean;
    /** Dominant religion + practical customs. Grounded (never AI). Null for
     *  curated entries that predate this field. */
    religion: ReligionInfo | null;
    /** Tipping norms (summary + per-service expectations). Grounded (never AI).
     *  Null for curated entries that predate this field. */
    tipping: TippingInfo | null;
    /** Tap-water safety verdict + note. Null for curated entries that predate
     *  this field. */
    water: WaterInfo | null;
    /** Internet / connectivity (rating + summary + mobile note). Null for
     *  curated entries that predate this field. */
    wifi: WifiInfo | null;
    /** "Great for" traveler-type / vibe tags from a closed vocabulary (the
     *  component labels + icons each). Empty when none. */
    greatFor: string[];
    /** Actionable safety pointers (the "watch out for X" bullets). Empty when
     *  none. */
    safetyTips: string[];
    /** Common tourist scams to recognize (distinct from safetyTips). Empty
     *  when none. */
    scams: string[];
    /** Traveler-health basics (vaccinations / mosquitoes / malaria). Null when
     *  none. Always shown with a "consult a travel clinic" note. */
    health: HealthInfo | null;
    /** Accessibility basics (wheelchair / transit / sidewalks / signage). Null
     *  when none. */
    accessibility: AccessibilityInfo | null;
    /** Practical money tips (cards / cash / ATM). Null when none. */
    currencyTips: CurrencyTipsInfo | null;
    /** Rough travel costs in USD (daily budget bands + sample prices). Always
     *  approximate. Null when none. */
    avgCosts: AvgCostsInfo | null;
    /** Major festivals & holidays to know (name + rough timing). Empty when
     *  none. */
    festivals: FestivalInfo[];
    /** Everyday cultural etiquette do's and don'ts. Empty when none. */
    etiquette: string[];
    /** `curated` = hand-verified (authoritative); `ai` = guardrailed AI
     *  fallback for uncurated countries, shown under an "approximate — verify"
     *  note. */
    source: 'curated' | 'ai';
}

export const fetchCountryFacts = async (
    code: string
): Promise<CountryFactsResult | null> => {
    const resp = await fetch(
        `${API_BASE}/country-facts?code=${encodeURIComponent(code)}`
    );
    if (resp.status === 204) return null;
    if (!resp.ok) {
        let detail = `Request failed (${resp.status})`;
        try {
            const body = (await resp.json()) as { detail?: string };
            if (body?.detail) detail = body.detail;
        } catch {
            /* non-JSON error body — keep the status-code message */
        }
        throw new Error(detail);
    }
    const body = (await resp.json()) as CountryFactsResponseRaw;
    return {
        countryCode: body.country_code,
        emergency: body.emergency ?? {},
        power: body.power
            ? {
                  plugs: body.power.plugs ?? [],
                  voltage: body.power.voltage,
                  frequency: body.power.frequency,
              }
            : null,
        timezone: body.timezone ?? null,
        timezoneMulti: Boolean(body.timezone_multi),
        religion: body.religion
            ? {
                  main: body.religion.main,
                  emoji: body.religion.emoji ?? null,
                  note: body.religion.note ?? null,
                  customs: body.religion.customs ?? [],
              }
            : null,
        tipping: body.tipping
            ? {
                  summary: body.tipping.summary,
                  categories: body.tipping.categories ?? {},
              }
            : null,
        water: body.water
            ? {
                  status:
                      body.water.status === 'safe' ||
                      body.water.status === 'unsafe'
                          ? body.water.status
                          : 'caution',
                  note: body.water.note ?? null,
              }
            : null,
        wifi: body.wifi
            ? {
                  rating: body.wifi.rating,
                  summary: body.wifi.summary,
                  mobile: body.wifi.mobile ?? null,
              }
            : null,
        greatFor: Array.isArray(body.great_for) ? body.great_for : [],
        safetyTips: Array.isArray(body.safety_tips) ? body.safety_tips : [],
        scams: Array.isArray(body.scams) ? body.scams : [],
        health: body.health
            ? {
                  vaccinations: body.health.vaccinations ?? null,
                  mosquitoes: body.health.mosquitoes ?? null,
                  malaria: body.health.malaria ?? null,
              }
            : null,
        accessibility: body.accessibility
            ? {
                  wheelchair: body.accessibility.wheelchair ?? null,
                  transit: body.accessibility.transit ?? null,
                  sidewalks: body.accessibility.sidewalks ?? null,
                  signage: body.accessibility.signage ?? null,
              }
            : null,
        currencyTips: body.currency_tips
            ? {
                  cards: body.currency_tips.cards ?? null,
                  cash: body.currency_tips.cash ?? null,
                  atm: body.currency_tips.atm ?? null,
                  applePay: body.currency_tips.apple_pay ?? null,
                  cardsRating: body.currency_tips.cards_rating ?? null,
                  cashRating: body.currency_tips.cash_rating ?? null,
              }
            : null,
        avgCosts: body.avg_costs
            ? {
                  budget: body.avg_costs.budget ?? null,
                  midrange: body.avg_costs.midrange ?? null,
                  luxury: body.avg_costs.luxury ?? null,
                  meal: body.avg_costs.meal ?? null,
                  coffee: body.avg_costs.coffee ?? null,
                  transit: body.avg_costs.transit ?? null,
                  beer: body.avg_costs.beer ?? null,
              }
            : null,
        festivals: Array.isArray(body.festivals)
            ? body.festivals.map((f) => ({
                  name: f.name,
                  when: f.when ?? null,
              }))
            : [],
        etiquette: Array.isArray(body.etiquette) ? body.etiquette : [],
        source: body.source === 'ai' ? 'ai' : 'curated',
    };
};
