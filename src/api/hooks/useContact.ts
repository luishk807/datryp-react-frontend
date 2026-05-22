import { useMutation } from '@tanstack/react-query';
import {
    sendContactForm,
    type ContactFormRequest,
    type ContactFormResponse,
} from 'api/contactApi';

/**
 * Mutation: relay a contact-form submission to the DaTryp.com inbox.
 *
 * Public endpoint — no auth required. Backend uses SendGrid; if SendGrid
 * isn't configured the call returns 503 with a clean message which the
 * form surfaces inline.
 */
export const useSendContactForm = () =>
    useMutation<ContactFormResponse, Error, ContactFormRequest>({
        mutationFn: sendContactForm,
    });
