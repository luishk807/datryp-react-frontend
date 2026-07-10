import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /me/place-suggestions` — personalized destination
 * picks. The payload is an `{ items: [...] }` envelope. `image_url` and the
 * two photographer-credit fields are nullable (a suggestion may be enriched
 * before its image resolves). `latitude` / `longitude` are the canonical
 * current shape (nullable but present); suggestions cached before the prompt
 * returned coordinates omit them entirely, which the client's `?? null`
 * reshape handles — that legacy case is exercised with a raw payload in the
 * test rather than relaxing this contract. `.strict()` guards the item shape.
 */
export const PlaceSuggestionWireContract = z
    .object({
        name: z.string(),
        country: z.string(),
        country_code: z.string(),
        why: z.string(),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
    })
    .strict();

export const PlaceSuggestionsWireContract = z
    .object({
        items: z.array(PlaceSuggestionWireContract),
    })
    .strict();
