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
        source: body.source === 'ai' ? 'ai' : 'curated',
    };
};
