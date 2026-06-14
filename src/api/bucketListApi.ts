/**
 * REST wrappers for `/me/bucket-list`. Free-text travel goals. POST runs
 * through server-side moderation before persistence — flagged text never
 * reaches the DB, and we surface the 422 body to the caller so the UI can
 * show "We can't add that one — try rephrasing" copy with the matching
 * category.
 */
import { getAuthToken } from './authStorage';
import { activeLang } from 'i18n';
import type { BucketListBlocked, BucketListItem } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface BucketListItemRaw {
    id: string;
    text: string;
    title?: string | null;
    description?: string | null;
    emoji?: string | null;
    tags?: string[];
    enrichment_attempted?: boolean;
    created_at: string;
    updated_at: string;
}

interface BucketListResponseRaw {
    items: BucketListItemRaw[];
    total: number;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toItem = (r: BucketListItemRaw): BucketListItem => ({
    id: r.id,
    text: r.text,
    title: r.title ?? null,
    description: r.description ?? null,
    emoji: r.emoji ?? null,
    tags: r.tags ?? [],
    enrichmentAttempted: r.enrichment_attempted ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
});

export class BucketListBlockedError extends Error {
    category: string;
    constructor(detail: BucketListBlocked) {
        super(detail.message);
        this.category = detail.category;
        this.name = 'BucketListBlockedError';
    }
}

/** 402 Payment Required from the bucket-list endpoints. `kind` tells the
 *  caller which paywall scenario to surface — `bucket_list_cap` for "free
 *  user hit the 10-item limit on add", `bucket_list_generate` for "free
 *  user tried to Create trip from a bucket-list row". */
export type BucketListPaywallKind =
    | 'bucket_list_cap'
    | 'bucket_list_generate'
    // Reused by `/me/plan-trip-ai` for free-tier users — same paywall
    // modal flow, distinct kind so the copy can address the AI Trip
    // Builder feature specifically.
    | 'ai_trip_builder_pro';

export class BucketListPaywallError extends Error {
    kind: BucketListPaywallKind;
    /** Free-tier cap. Only set for `bucket_list_cap`. */
    cap?: number;
    /** Items the user currently has. Only set for `bucket_list_cap`. */
    currentCount?: number;
    constructor(detail: {
        kind: BucketListPaywallKind;
        message: string;
        cap?: number;
        current_count?: number;
    }) {
        super(detail.message);
        this.kind = detail.kind;
        this.cap = detail.cap;
        this.currentCount = detail.current_count;
        this.name = 'BucketListPaywallError';
    }
}

const handleError = async (resp: Response, label: string): Promise<never> => {
    let detail: unknown;
    try {
        const body = await resp.json();
        detail = body?.detail;
    } catch {
        /* ignore */
    }
    // 402 = paywall. Detail is a structured object — surface as a typed
    // error so the page can open the upgrade modal without string-sniffing.
    if (
        resp.status === 402 &&
        detail &&
        typeof detail === 'object' &&
        'kind' in (detail as Record<string, unknown>) &&
        'message' in (detail as Record<string, unknown>)
    ) {
        throw new BucketListPaywallError(
            detail as {
                kind: BucketListPaywallKind;
                message: string;
                cap?: number;
                current_count?: number;
            }
        );
    }
    // 422 from POST means the moderation gate fired — the FastAPI detail
    // is an object {message, category}, not a string. Surface it as a
    // typed error so the wizard can render category-specific UI without
    // sniffing the message.
    if (
        resp.status === 422 &&
        detail &&
        typeof detail === 'object' &&
        'message' in (detail as Record<string, unknown>) &&
        'category' in (detail as Record<string, unknown>)
    ) {
        throw new BucketListBlockedError(detail as BucketListBlocked);
    }
    const detailStr = typeof detail === 'string' ? detail : undefined;
    throw new Error(
        `${label} ${resp.status} ${resp.statusText}${
            detailStr ? ` — ${detailStr}` : ''
        }`
    );
};

export const fetchBucketList = async (): Promise<BucketListItem[]> => {
    const resp = await fetch(`${API_BASE}/me/bucket-list`, {
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, '/me/bucket-list');
    const body = (await resp.json()) as BucketListResponseRaw;
    return body.items.map(toItem);
};

export const addBucketListItem = async (
    text: string
): Promise<BucketListItem> => {
    const resp = await fetch(`${API_BASE}/me/bucket-list`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({ text }),
    });
    if (!resp.ok) await handleError(resp, 'add bucket-list item');
    return toItem((await resp.json()) as BucketListItemRaw);
};

/** POST /me/bucket-list/enrich-existing — Pro-only backfill. Enriches the
 *  caller's existing un-attempted goals into titled cards and returns the
 *  full, updated list. Idempotent: already-attempted rows are skipped
 *  server-side, so it's safe to call whenever un-enriched rows remain. */
export const enrichExistingBucketList = async (): Promise<BucketListItem[]> => {
    const resp = await fetch(`${API_BASE}/me/bucket-list/enrich-existing`, {
        method: 'POST',
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, 'enrich bucket-list');
    const body = (await resp.json()) as BucketListResponseRaw;
    return body.items.map(toItem);
};

export const deleteBucketListItem = async (id: string): Promise<void> => {
    const resp = await fetch(
        `${API_BASE}/me/bucket-list/${encodeURIComponent(id)}`,
        {
            method: 'DELETE',
            headers: authHeaders(),
        }
    );
    if (!resp.ok) await handleError(resp, 'delete bucket-list item');
};

export interface BucketTripGenerationResult {
    itineraryId: string;
    tripType: 'single' | 'multi';
    tripName: string;
    countryName: string;
    durationDays: number;
    rationale: string;
}

interface BucketTripGenerationRaw {
    itinerary_id: string;
    trip_type: 'single' | 'multi';
    trip_name: string;
    country_name: string;
    duration_days: number;
    rationale: string;
}

export interface GenerateTripFromBucketInput {
    /** Number of travelers. Optional; backend defaults to 2 when
     *  omitted so we don't break existing call sites. */
    partySize?: number;
    /** Trip length in days. Optional — omit (or pass undefined) to
     *  let the AI pick a length that fits the budget + activity mix.
     *  Capped at 21 days by the backend schema. */
    durationDays?: number;
    /** Traveler-style tags from the user's saved preferences
     *  (Adventurer / Foodie / Luxury / etc). Used by the AI prompt
     *  to personalize the trip mix even when the bucket-list item
     *  itself only carries a destination + headline. */
    travelerStyles?: string[];
}

/** POST /me/bucket-list/{id}/itinerary — kicks off the AI-driven plan +
 *  save. Returns the new trip's id and shape so the caller can navigate
 *  the user straight into edit mode of the just-saved trip. */
export const generateTripFromBucket = async (
    itemId: string,
    input?: GenerateTripFromBucketInput
): Promise<BucketTripGenerationResult> => {
    const resp = await fetch(
        `${API_BASE}/me/bucket-list/${encodeURIComponent(itemId)}/itinerary`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
            },
            body: JSON.stringify({
                party_size: input?.partySize ?? null,
                duration_days: input?.durationDays ?? null,
                traveler_styles: input?.travelerStyles ?? null,
                lang: activeLang(),
            }),
        }
    );
    if (!resp.ok) await handleError(resp, 'generate trip from bucket-list');
    const body = (await resp.json()) as BucketTripGenerationRaw;
    return {
        itineraryId: body.itinerary_id,
        tripType: body.trip_type,
        tripName: body.trip_name,
        countryName: body.country_name,
        durationDays: body.duration_days,
        rationale: body.rationale,
    };
};
