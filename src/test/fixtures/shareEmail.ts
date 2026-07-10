import type { ShareEmailRequest } from 'types';

/** A well-formed `POST /share/email` request body (FE-typed so it can't drift
 *  from `ShareEmailRequest`). */
export const shareEmailRequestFixture: ShareEmailRequest = {
    to: ['friend@example.com', 'buddy@example.com'],
    place: {
        name: 'Kyoto',
        city: 'Kyoto',
        country: 'Japan',
        description: 'Temples and gardens',
        image_url: 'https://images.example.com/kyoto.jpg',
    },
    search_url: 'https://datryp.com/place/kyoto',
    sender_name: 'Test Traveler',
    personal_message: 'You have to see this!',
};

/** Success response with the recipient count. */
export const shareEmailResponseFixture = {
    sent: true,
    recipients: 2,
} as const;

/** Success response without the optional `recipients` field. */
export const shareEmailResponseNoCountFixture = {
    sent: true,
} as const;
