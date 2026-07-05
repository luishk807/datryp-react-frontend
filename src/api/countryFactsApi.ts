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
interface CountryFactsResponseRaw {
    country_code: string;
    emergency: Record<string, string>;
    power: PowerInfoRaw | null;
    timezone: string | null;
    timezone_multi: boolean;
}

export interface PowerInfo {
    /** Plug-type letters, e.g. `["C", "F"]` — rendered as "Type C / F". */
    plugs: string[];
    voltage: number;
    frequency: number;
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
    };
};
