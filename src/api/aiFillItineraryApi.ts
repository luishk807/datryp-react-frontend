/**
 * Fetch wrapper for `POST /me/trip-complete-ai/{tripId}` — fills an EXISTING
 * trip (in Planning, essentially empty besides its flight) with AI-generated
 * activities for the trip's destination(s). Keeps the existing flight/items
 * and slots new activities into the empty days.
 *
 * Pro-only on the backend; surfaces 402 via `BucketListPaywallError` so the
 * caller can route to the membership upsell, the same way the AI Trip Builder
 * does.
 */
import { getAuthToken } from 'api/authStorage';
import { BucketListPaywallError } from 'api/bucketListApi';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface CompleteTripWithAiResult {
    itineraryId: string;
    addedCount: number;
}

interface CompleteTripWithAiResultRaw {
    itinerary_id: string;
    added_count: number;
}

const authHeaders = (): HeadersInit => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const completeTripWithAi = async (
    tripId: string,
    lang: string,
): Promise<CompleteTripWithAiResult> => {
    const resp = await fetch(
        `${API_BASE}/me/trip-complete-ai/${encodeURIComponent(tripId)}`,
        {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ lang }),
        },
    );
    if (resp.status === 402) {
        let kind = 'ai_trip_builder_pro';
        let message =
            'AI trip planning is a Pro feature. Upgrade to unlock it.';
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
        let message = `Itinerary planning failed: ${resp.status} ${resp.statusText}`;
        try {
            const body = (await resp.json()) as { detail?: unknown };
            // `detail` is a plain string for simple errors, or a
            // `{ kind, message }` object for the structured ones (429 quota,
            // 409 not-planning) — surface the human message in both cases.
            if (typeof body.detail === 'string') {
                message = body.detail;
            } else if (
                body.detail &&
                typeof body.detail === 'object' &&
                typeof (body.detail as { message?: unknown }).message ===
                    'string'
            ) {
                message = (body.detail as { message: string }).message;
            }
        } catch {
            /* fall through */
        }
        throw new Error(message);
    }
    const body = (await resp.json()) as CompleteTripWithAiResultRaw;
    return {
        itineraryId: body.itinerary_id,
        addedCount: body.added_count,
    };
};
