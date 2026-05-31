/**
 * `/me/trip-suggestions/{tripId}` — lightbulb activity suggestions for
 * an existing Planning trip. Pro-only on the backend (402 for free,
 * 403 for non-members, 404 for unknown trip, 409 when the trip is past
 * Planning, 502/503 for upstream / config failures).
 *
 * Fresh AI call on every click — the FE never caches the response so
 * the user can re-roll for variety as they add activities. TanStack
 * Query is used only for mutation state (loading / error), not for
 * caching the payload.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface TripSuggestionItem {
    name: string;
    place: string | null;
    category: string | null;
    why: string;
    estimatedCostUsd: number | null;
    durationHours: number | null;
    /** Unsplash hero photo for the card. Null when no match — the
     *  card falls back to a neutral gradient placeholder. */
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface QuotaInfo {
    used: number;
    cap: number;
    /** -1 sentinel means unlimited (admin bypass). Otherwise >= 0. */
    remaining: number;
    /** ISO-8601 UTC timestamp; null when unlimited. */
    resetsAt: string | null;
    /** "day" | "month" — drives the FE's "left today" vs "left this
     *  month" copy. */
    window: string;
}

export interface TripSuggestionsResult {
    suggestions: TripSuggestionItem[];
    dontForget: string;
    quota: QuotaInfo;
}

interface RawSuggestion {
    name: string;
    place: string | null;
    category: string | null;
    why: string;
    estimated_cost_usd: number | null;
    duration_hours: number | null;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface RawQuota {
    used: number;
    cap: number;
    remaining: number;
    resets_at: string | null;
    window: string;
}

interface RawResponse {
    suggestions: RawSuggestion[];
    dont_forget: string;
    quota: RawQuota;
}

export class TripSuggestionsBackendError extends Error {
    /** Kind tag from the backend payload (`trip_suggestions_pro`,
     *  `trip_suggestions_not_planning`, …) when the server returned a
     *  structured detail body. Lets the UI decide between showing the
     *  upgrade modal, hiding the lightbulb, or a generic retry. */
    readonly kind: string | null;
    readonly status: number;

    constructor(message: string, status: number, kind: string | null) {
        super(message);
        this.name = 'TripSuggestionsBackendError';
        this.status = status;
        this.kind = kind;
    }
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toSuggestion = (r: RawSuggestion): TripSuggestionItem => ({
    name: r.name,
    place: r.place,
    category: r.category,
    why: r.why,
    estimatedCostUsd: r.estimated_cost_usd,
    durationHours: r.duration_hours,
    imageUrl: r.image_url,
    photographerName: r.photographer_name,
    photographerUrl: r.photographer_url,
});

export const fetchTripSuggestions = async (
    tripId: string,
): Promise<TripSuggestionsResult> => {
    const resp = await fetch(
        `${API_BASE}/me/trip-suggestions/${encodeURIComponent(tripId)}`,
        {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: '{}',
        },
    );
    if (!resp.ok) {
        let detail: string | undefined;
        let kind: string | null = null;
        try {
            const body = await resp.json();
            // FastAPI returns either `{ detail: string }` or
            // `{ detail: { kind, message, ... } }` depending on the
            // raise site. Handle both.
            if (typeof body?.detail === 'string') {
                detail = body.detail;
            } else if (body?.detail && typeof body.detail === 'object') {
                if (typeof body.detail.kind === 'string') {
                    kind = body.detail.kind;
                }
                if (typeof body.detail.message === 'string') {
                    detail = body.detail.message;
                }
            }
        } catch {
            /* ignore — non-JSON body */
        }
        throw new TripSuggestionsBackendError(
            detail ?? `Trip suggestions failed (${resp.status})`,
            resp.status,
            kind,
        );
    }
    const body = (await resp.json()) as RawResponse;
    return {
        suggestions: body.suggestions.map(toSuggestion),
        dontForget: body.dont_forget,
        quota: {
            used: body.quota.used,
            cap: body.quota.cap,
            remaining: body.quota.remaining,
            resetsAt: body.quota.resets_at,
            window: body.quota.window,
        },
    };
};
