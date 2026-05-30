/**
 * REST wrapper for `POST /budgets/suggest` — the OpenAI-backed trip
 * budget estimator. Backend is fail-soft: a null `result` means the
 * model couldn't estimate (unknown country, OpenAI down, all-null
 * response) and the caller should leave the budget input blank
 * rather than show an error.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface BudgetSuggestRequest {
    /** ISO-2 country code of the trip's primary destination. On
     *  multi-destination trips the FE passes the first leg's country —
     *  one suggestion covers the whole trip. */
    countryCode: string;
    /** Optional city refinement — anchors the lodging / transit
     *  estimate to that city when supplied. */
    city?: string | null;
    /** Trip duration including travel days (1..90). */
    days: number;
    /** Free-text style hint forwarded to the model — "budget",
     *  "mid-range", "luxury", "family", etc. Null = unspecified, the
     *  model assumes mid-range. */
    travelStyle?: string | null;
    /** YYYY-MM-DD trip start. Optional — when set, the model factors
     *  in seasonality (peak vs shoulder, holiday weeks, monsoon /
     *  hurricane risk) so the same destination in July vs January
     *  doesn't return the same number. */
    startDate?: string | null;
    /** Where the traveller is coming FROM — drives the round-trip
     *  transport leg of the estimate (flight vs train vs drive). Both
     *  fields optional; the backend falls back to a regional default
     *  when neither is supplied. */
    homeCountryCode?: string | null;
    homeCity?: string | null;
}

export interface BudgetSuggestResult {
    /** Whole-dollar USD figure for the entire trip. Null when the
     *  model couldn't estimate — paired with a null `daily`. */
    suggestedTotal: number | null;
    /** Always 'USD' for now — kept on the wire so we can add other
     *  currencies later without a schema bump. */
    currency: string;
    daily: number | null;
    /** One-sentence rationale (≤200 chars). Null when no estimate. */
    note: string | null;
}

interface BudgetSuggestRaw {
    result: {
        suggested_total: number | null;
        currency: string;
        daily: number | null;
        note: string | null;
    } | null;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const suggestBudget = async (
    payload: BudgetSuggestRequest,
    signal?: AbortSignal
): Promise<BudgetSuggestResult | null> => {
    const body = {
        country_code: payload.countryCode,
        city: payload.city ?? null,
        days: payload.days,
        travel_style: payload.travelStyle ?? null,
        start_date: payload.startDate ?? null,
        home_country_code: payload.homeCountryCode ?? null,
        home_city: payload.homeCity ?? null,
    };
    const resp = await fetch(`${API_BASE}/budgets/suggest`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify(body),
        signal,
    });
    if (!resp.ok) {
        throw new Error(
            `/budgets/suggest ${resp.status} ${resp.statusText}`
        );
    }
    const raw = (await resp.json()) as BudgetSuggestRaw;
    if (!raw.result) return null;
    return {
        suggestedTotal: raw.result.suggested_total,
        currency: raw.result.currency,
        daily: raw.result.daily,
        note: raw.result.note,
    };
};
