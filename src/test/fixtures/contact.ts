import type {
    ContactFormRequest,
    ContactFormResponse,
} from 'api/contactApi';

/** A well-formed contact-form request (typed as the FE's own interface so the
 *  fixture can't drift from it). */
export const contactRequestFixture: ContactFormRequest = {
    name: 'Test Traveler',
    email: 'traveler@example.com',
    subject: 'Hello',
    message: 'Loving the app!',
};

export const contactResponseFixture: ContactFormResponse = {
    sent: true,
};
