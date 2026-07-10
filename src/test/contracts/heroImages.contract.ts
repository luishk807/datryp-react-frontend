import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /hero-images` (app backend `HeroImagesResponse`).
 * The envelope wraps a list of items the client reshapes snake→camel into
 * `HeroImage`. Every field is a required string on the wire (the backend
 * always fills photographer credit for its curated hero set), so a null or a
 * renamed key is real drift the reshaper would silently propagate. `.strict()`
 * fails if the backend adds a field `toHeroImage` doesn't yet map.
 */
export const HeroImageItemWireContract = z
    .object({
        id: z.string(),
        city: z.string(),
        image_url: z.string(),
        source: z.string(),
        photographer_name: z.string(),
        photographer_url: z.string(),
    })
    .strict();

export const HeroImagesResponseContract = z
    .object({
        items: z.array(HeroImageItemWireContract),
    })
    .strict();
