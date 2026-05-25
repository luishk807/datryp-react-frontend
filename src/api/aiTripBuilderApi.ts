/**
 * Fetch wrapper for `POST /me/plan-trip-ai` — the structured-input
 * AI Trip Builder. Same response shape as the bucket-list-driven
 * trip generation; the FE navigates the user straight into the
 * just-saved trip's editor on success.
 *
 * Pro-only on the backend; surfaces 402 via a `BucketListPaywallError`
 * so consumers can reuse the existing paywall modal flow without a
 * dedicated 402-error class.
 */
import { getAuthToken } from 'api/authStorage';
import { BucketListPaywallError } from 'api/bucketListApi';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface AiTripBuilderInput {
    budgetUsd: number;
    interests: string[];
    durationDays?: number;
    countryHint?: string;
    /** Pre-picked hero photo URL. Used by the options flow so the
     *  trip's hero matches the photo the user saw on the option card.
     *  Omitted by the bucket-list flow — the backend then falls back
     *  to the country's catalog image (and Unsplash as a final
     *  fallback). */
    heroImageUrl?: string;
    /** Number of travelers. Defaults to 2 in the UI. The backend
     *  uses this to size lodging hints, split the budget into
     *  per-person ballpark figures, and tune the activity mix
     *  (e.g. "family-friendly" copy for parties of 4+, "couples
     *  retreat" framing for parties of 2). */
    partySize?: number;
    /** Optional traveler-style tags pulled from the user's saved
     *  preferences (Adventurer / Foodie / Luxury / etc). Sent
     *  alongside the per-trip `interests` so the AI personalizes
     *  even when the user leaves the interests field blank. */
    travelerStyles?: string[];
}

export interface AiTripBuilderResult {
    itineraryId: string;
    tripType: 'single' | 'multi';
    tripName: string;
    countryName: string;
    durationDays: number;
    rationale: string;
}

interface AiTripBuilderResultRaw {
    itinerary_id: string;
    trip_type: 'single' | 'multi';
    trip_name: string;
    country_name: string;
    duration_days: number;
    rationale: string;
}

const authHeaders = (): HeadersInit => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export interface TripOption {
    countryName: string;
    countryCode: string;
    headline: string;
    whyThisFits: string;
    estimatedCostUsd: number;
    durationDays: number;
    highlights: string[];
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

interface TripOptionRaw {
    country_name: string;
    country_code: string;
    headline: string;
    why_this_fits: string;
    estimated_cost_usd: number;
    duration_days: number;
    highlights: string[];
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface TripOptionsResponseRaw {
    options: TripOptionRaw[];
}

const toOption = (raw: TripOptionRaw): TripOption => ({
    countryName: raw.country_name,
    countryCode: raw.country_code,
    headline: raw.headline,
    whyThisFits: raw.why_this_fits,
    estimatedCostUsd: raw.estimated_cost_usd,
    durationDays: raw.duration_days,
    highlights: raw.highlights,
    imageUrl: raw.image_url,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
});

/** Generate 4 destination options for the user to pick from. Cheap +
 *  fast (one OpenAI call + 4 Unsplash lookups). The chosen option's
 *  country gets fed back into `planTripWithAi` as `countryHint`. */
export const generateTripOptions = async (
    input: AiTripBuilderInput,
): Promise<TripOption[]> => {
    const resp = await fetch(`${API_BASE}/me/plan-trip-ai/options`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({
            budget_usd: input.budgetUsd,
            interests: input.interests,
            duration_days: input.durationDays ?? null,
            country_hint: input.countryHint ?? null,
            party_size: input.partySize ?? null,
            traveler_styles: input.travelerStyles ?? null,
        }),
    });
    if (resp.status === 402) {
        let kind = 'ai_trip_builder_pro';
        let message =
            'AI trip building is a Pro feature. Upgrade to unlock it.';
        try {
            const body = (await resp.json()) as {
                detail?: { kind?: string; message?: string };
            };
            kind = body.detail?.kind ?? kind;
            message = body.detail?.message ?? message;
        } catch {
            /* fall through */
        }
        throw new BucketListPaywallError({
            kind: kind as
                | 'bucket_list_cap'
                | 'bucket_list_generate'
                | 'ai_trip_builder_pro',
            message,
        });
    }
    if (!resp.ok) {
        let message = `Trip options failed: ${resp.status} ${resp.statusText}`;
        try {
            const body = (await resp.json()) as { detail?: unknown };
            if (typeof body.detail === 'string') message = body.detail;
        } catch {
            /* fall through */
        }
        throw new Error(message);
    }
    const body = (await resp.json()) as TripOptionsResponseRaw;
    return body.options.map(toOption);
};

export const planTripWithAi = async (
    input: AiTripBuilderInput,
): Promise<AiTripBuilderResult> => {
    const resp = await fetch(`${API_BASE}/me/plan-trip-ai`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({
            budget_usd: input.budgetUsd,
            interests: input.interests,
            duration_days: input.durationDays ?? null,
            country_hint: input.countryHint ?? null,
            hero_image_url: input.heroImageUrl ?? null,
            party_size: input.partySize ?? null,
            traveler_styles: input.travelerStyles ?? null,
        }),
    });
    if (resp.status === 402) {
        // Pro paywall. Reuse the existing bucket-list paywall-error
        // class so the modal can render via the same `PaywallModal`
        // ref pattern other Pro features use.
        let kind = 'ai_trip_builder_pro';
        let message =
            'AI trip building is a Pro feature. Upgrade to unlock it.';
        try {
            const body = (await resp.json()) as {
                detail?: { kind?: string; message?: string };
            };
            kind = body.detail?.kind ?? kind;
            message = body.detail?.message ?? message;
        } catch {
            /* fall through to defaults */
        }
        throw new BucketListPaywallError({
            kind: kind as
                | 'bucket_list_cap'
                | 'bucket_list_generate'
                | 'ai_trip_builder_pro',
            message,
        });
    }
    if (!resp.ok) {
        let message = `Trip planning failed: ${resp.status} ${resp.statusText}`;
        try {
            const body = (await resp.json()) as { detail?: unknown };
            if (typeof body.detail === 'string') message = body.detail;
        } catch {
            /* fall through */
        }
        throw new Error(message);
    }
    const body = (await resp.json()) as AiTripBuilderResultRaw;
    return {
        itineraryId: body.itinerary_id,
        tripType: body.trip_type,
        tripName: body.trip_name,
        countryName: body.country_name,
        durationDays: body.duration_days,
        rationale: body.rationale,
    };
};
