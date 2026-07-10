import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /me/similar-to-saves` (ML "similar to your saves"
 * homepage box). Pins the snake_case wire shape the FE reshapes into
 * camelCase `SimilarPlaceItem`s.
 *
 * `.strict()` — an extra or missing field fails the contract so backend drift
 * is caught in CI instead of surfacing as a silent `undefined` on the card.
 */
export const SimilarPlaceItemContract = z
    .object({
        place_key: z.string(),
        name: z.string(),
        city: z.string(),
        country: z.string(),
        country_code: z.string().nullable(),
        image_url: z.string().nullable(),
        best_time_to_visit: z.string().nullable(),
        similarity: z.number(),
    })
    .strict();

export const SimilarToSavesContract = z
    .object({
        items: z.array(SimilarPlaceItemContract),
    })
    .strict();
