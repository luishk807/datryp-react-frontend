import { z } from 'zod';

/**
 * Zod CONTRACT for `POST /me/profile-image` (app backend `ProfileImageResponseRaw`).
 * The only field the client reads is the re-hosted public URL; it is nullable
 * because a DELETE-then-refetch flow (or a backend that couldn't persist)
 * returns a cleared image. `.strict()` catches a renamed key or an added field
 * the client would ignore.
 */
export const ProfileImageResponseContract = z
    .object({
        profile_image_url: z.string().nullable(),
    })
    .strict();
