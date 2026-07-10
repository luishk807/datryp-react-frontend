import { z } from 'zod';

/**
 * Zod CONTRACT for `POST /friends/invite-by-email` (app/routers/friends.py).
 * The response is returned to the caller unreshaped, so this is the literal
 * wire shape. `kind` branches the UI: `friend_request` when the recipient was
 * an existing DaTryp user, `join_invitation` when a signup email was sent.
 *
 * `.strict()` — extra or missing field fails, so backend drift is caught in CI.
 * Update alongside the `InviteByEmailResponse` interface.
 */
export const InviteByEmailResponseContract = z
    .object({
        kind: z.enum(['friend_request', 'join_invitation']),
        message: z.string(),
    })
    .strict();
