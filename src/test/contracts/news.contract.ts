import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /news/top` (Google News RSS proxy). The envelope
 * always carries the echoed `query` + a `search_url`; `item` is null when
 * Google returned zero results (caller hides the widget).
 *
 * `.strict()` on both the envelope and the inner item catches backend drift.
 */
export const NewsItemWireContract = z
    .object({
        title: z.string(),
        source: z.string().nullable(),
        published_at: z.string().nullable(),
        link: z.string(),
    })
    .strict();

export const NewsTopWireContract = z
    .object({
        query: z.string(),
        item: NewsItemWireContract.nullable(),
        search_url: z.string(),
    })
    .strict();
