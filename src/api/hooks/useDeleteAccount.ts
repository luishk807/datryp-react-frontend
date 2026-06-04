import { useMutation } from '@tanstack/react-query';
import { deleteMyAccount } from 'api/authApi';

/**
 * Self-service account deletion. On success the CALLER handles logout +
 * redirect — we deliberately keep navigation out of the hook so the
 * caller controls the exact teardown order (logout, then navigate). There's
 * no cache to invalidate: the user row is gone server-side and the whole
 * session is about to be torn down.
 */
export const useDeleteAccount = () =>
    useMutation({
        mutationFn: () => deleteMyAccount(),
    });
