/**
 * `/me/trip-checkup/{tripId}` — readiness score + verdict + per-
 * dimension breakdown for a Planning trip. Same gate semantics as
 * the lightbulb suggestions (402 for free, 403 non-member, 404 not
 * found, 409 not Planning, 502 OpenAI failure, 503 missing key) so
 * the FE error handling mirrors `tripSuggestionsApi`.
 *
 * Fresh AI call on every click. No FE caching — re-clicks after
 * editing the trip should reflect new state.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface TripCheckupDimension {
    /** Soft enum on the wire: "Strong" | "On track" | "Needs work" | "Weak".
     *  Kept as a string so we can tune labels without a schema bump. */
    verdict: string;
    why: string;
    /** 0-100 sub-score for this dimension. */
    score: number;
}

export interface TripCheckupResult {
    /** 0-100 overall readiness score. */
    score: number;
    /** "Excellent" | "Solid" | "Needs work" | "Concerning". */
    verdict: string;
    summary: string;
    strengths: string[];
    gaps: string[];
    budgetAssessment: TripCheckupDimension;
    timeAssessment: TripCheckupDimension;
    activityAssessment: TripCheckupDimension;
}

interface RawDimension {
    verdict: string;
    why: string;
    score: number;
}

interface RawResponse {
    score: number;
    verdict: string;
    summary: string;
    strengths: string[];
    gaps: string[];
    budget_assessment: RawDimension;
    time_assessment: RawDimension;
    activity_assessment: RawDimension;
}

export class TripCheckupBackendError extends Error {
    readonly kind: string | null;
    readonly status: number;

    constructor(message: string, status: number, kind: string | null) {
        super(message);
        this.name = 'TripCheckupBackendError';
        this.status = status;
        this.kind = kind;
    }
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toDimension = (r: RawDimension): TripCheckupDimension => ({
    verdict: r.verdict,
    why: r.why,
    score: r.score,
});

export const fetchTripCheckup = async (
    tripId: string,
): Promise<TripCheckupResult> => {
    const resp = await fetch(
        `${API_BASE}/me/trip-checkup/${encodeURIComponent(tripId)}`,
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
            /* ignore */
        }
        throw new TripCheckupBackendError(
            detail ?? `Trip checkup failed (${resp.status})`,
            resp.status,
            kind,
        );
    }
    const body = (await resp.json()) as RawResponse;
    return {
        score: body.score,
        verdict: body.verdict,
        summary: body.summary,
        strengths: body.strengths,
        gaps: body.gaps,
        budgetAssessment: toDimension(body.budget_assessment),
        timeAssessment: toDimension(body.time_assessment),
        activityAssessment: toDimension(body.activity_assessment),
    };
};
