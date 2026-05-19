/**
 * REST wrappers for the friends-flow endpoints on the Python backend.
 *
 * The bulk of the friend lifecycle (respond, cancel, unfriend) still goes
 * through GraphQL — REST is just for the email-based invite which needs
 * server-side email lookup + branching (existing user vs not-yet-user).
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export type InviteByEmailKind = 'friend_request' | 'join_invitation';

export interface InviteByEmailResponse {
    /** `friend_request` → the recipient was a daTryp user and a friend
     *  request was created. `join_invitation` → the recipient isn't
     *  registered; we sent them a signup email instead. */
    kind: InviteByEmailKind;
    /** UI-ready message the modal can show in a toast / inline. */
    message: string;
}

class FriendsApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'FriendsApiError';
    }
}

export const inviteFriendByEmail = async (
    email: string
): Promise<InviteByEmailResponse> => {
    const token = getAuthToken();
    const resp = await fetch(`${API_BASE}/friends/invite-by-email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email }),
    });
    if (resp.ok) return (await resp.json()) as InviteByEmailResponse;

    let detail: string = `${resp.status} ${resp.statusText}`;
    try {
        const body = await resp.json();
        if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
        // ignore
    }
    throw new FriendsApiError(detail, resp.status);
};

export { FriendsApiError };
