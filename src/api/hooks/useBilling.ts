/**
 * Hooks that wrap the billing API for use in components. Mirror the existing
 * `useAuth` pattern — return a mutation hook so consumers can call `mutate()`
 * and read `isPending` / `error` without managing state manually.
 *
 * Both hooks redirect the browser to a Stripe-hosted page on success, so
 * there's no need to wire onSuccess / cache invalidation — the user leaves
 * the SPA entirely. The success path returns control via the configured
 * STRIPE_SUCCESS_URL / STRIPE_PORTAL_RETURN_URL.
 */
import { useMutation } from '@tanstack/react-query';
import {
    createCheckoutSession,
    createPortalSession,
    type CheckoutPlan,
} from 'api/billingApi';

/** Kicks off a Stripe Checkout flow for the chosen plan. On success the
 *  caller is automatically redirected to the hosted checkout page. */
export const useStartCheckout = () =>
    useMutation<void, Error, CheckoutPlan>({
        mutationFn: async (plan) => {
            const { url } = await createCheckoutSession(plan);
            // Leave the SPA — Stripe handles the rest. We use href (not
            // assign) so the back button returns to the page they came from.
            window.location.href = url;
        },
    });

/** Opens the Stripe Customer Portal in the current tab. The user manages
 *  their subscription there, then Stripe redirects back to
 *  STRIPE_PORTAL_RETURN_URL when they're done. */
export const useOpenBillingPortal = () =>
    useMutation<void, Error, void>({
        mutationFn: async () => {
            const { url } = await createPortalSession();
            window.location.href = url;
        },
    });
