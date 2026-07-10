import type { InviteByEmailResponse } from 'api/friendsApi';

/** Recipient was already a DaTryp user → a friend request was created. */
export const inviteFriendRequestFixture: InviteByEmailResponse = {
    kind: 'friend_request',
    message: 'Friend request sent to traveler@example.com.',
};

/** Recipient isn't registered → a signup invitation email was sent. */
export const inviteJoinInvitationFixture: InviteByEmailResponse = {
    kind: 'join_invitation',
    message: 'We emailed traveler@example.com an invite to join.',
};
