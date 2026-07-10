import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /places/image` (app backend photo resolver).
 * The wire payload mirrors `/photo-search` plus a `source` field. Only the
 * two photographer-credit fields are nullable (Pexels/Pixabay hits sometimes
 * lack attribution); `image_url` and `source` are always present when the
 * endpoint returns 200 (a 404 no-match never reaches this contract — the
 * client maps it to null first). `.strict()` fails the build if the backend
 * adds a field the reshaper doesn't yet map.
 */
export const PlaceImageWireContract = z
    .object({
        image_url: z.string(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
        source: z.string(),
    })
    .strict();
