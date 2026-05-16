import { useMutation } from '@tanstack/react-query';
import { shareEmail, type ShareEmailResponse } from 'api/shareApi';
import type { ShareEmailRequest } from 'types';

/**
 * Mutation: send a "share this place" email via the backend.
 * The backend uses SendGrid; if not configured it returns 503 with a clean
 * message that we surface to the user as an inline error.
 */
export const useShareEmail = () =>
    useMutation<ShareEmailResponse, Error, ShareEmailRequest>({
        mutationFn: shareEmail,
    });
