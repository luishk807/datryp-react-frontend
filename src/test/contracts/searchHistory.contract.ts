import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /me/search-history` (app/routers/me.py). Server-side
 * paginated; `total` is OPTIONAL because older versions of the route didn't
 * emit it — the client defaults it to 0 and falls back to an items-count
 * heuristic for "Next".
 *
 * `.strict()` on both the envelope and each item catches backend drift.
 */
export const SearchHistoryItemWireContract = z
    .object({
        query: z.string(),
        last_searched_at: z.string(),
    })
    .strict();

export const SearchHistoryWireContract = z
    .object({
        items: z.array(SearchHistoryItemWireContract),
        total: z.number().optional(),
    })
    .strict();
