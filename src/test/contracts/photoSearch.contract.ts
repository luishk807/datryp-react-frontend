import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /photo-search` + `GET /photo-search/gallery` (app
 * backend `PhotoSearchResponseRaw`). Only the two photographer-credit fields
 * are nullable (some hits lack attribution); `image_url` is always present on
 * a 200 (a 404 no-match never reaches this contract — the client maps it to
 * null first). Unlike `/places/image`, this envelope carries NO `source`
 * field, so `.strict()` would flag one if the backend added it.
 */
export const PhotoSearchWireContract = z
    .object({
        image_url: z.string(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

/**
 * The gallery endpoint wraps the same photo shape in a `photos` list. The
 * client fails soft to `[]` when `photos` is absent, so a real gallery hit
 * carries the array. `.strict()` catches an added envelope field.
 */
export const PhotoGalleryWireContract = z
    .object({
        photos: z.array(PhotoSearchWireContract),
    })
    .strict();
