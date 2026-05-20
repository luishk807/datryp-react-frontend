/**
 * REST wrappers for `/me/bucket-list`. Free-text travel goals. POST runs
 * through server-side moderation before persistence — flagged text never
 * reaches the DB, and we surface the 422 body to the caller so the UI can
 * show "We can't add that one — try rephrasing" copy with the matching
 * category.
 */
import { getAuthToken } from './authStorage';
import type { BucketListBlocked, BucketListItem } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface BucketListItemRaw {
    id: string;
    text: string;
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

const handleError = async (resp: Response, label: string): Promise<never> => {
    let detail: unknown;
    try {
        const body = await resp.json();
        detail = body?.detail;
    } catch {
        /* ignore */
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
