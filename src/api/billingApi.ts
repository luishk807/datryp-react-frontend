/**
 * Stripe billing endpoints on the Python backend. REST (not GraphQL) — these
 * flows redirect the browser to Stripe-hosted pages, so they need plain URLs
 * to follow rather than typed GraphQL responses.
 *
 * The backend is the source of truth for which Stripe Price IDs back the
 * 'monthly' and 'yearly' plans, so the frontend just picks one of those
 * symbolic names and lets the server resolve.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export type CheckoutPlan = 'monthly' | 'yearly';

interface CheckoutSessionResponse {
    url: string;
}

interface PortalSessionResponse {
    url: string;
}

class BillingError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'BillingError';
    }
}

const authHeader = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleJson = async <T>(resp: Response): Promise<T> => {
    if (resp.ok) return (await resp.json()) as T;
    let message = `${resp.status} ${resp.statusText}`;
    try {
        const body = await resp.json();
        if (typeof body?.detail === 'string') message = body.detail;
    } catch {
        // ignore parse error
    }
    throw new BillingError(message, resp.status);
};

/** Create a Stripe Checkout session and return its hosted URL. The caller is
 *  expected to redirect the browser via `window.location.href = url`. */
export const createCheckoutSession = (
    plan: CheckoutPlan
): Promise<CheckoutSessionResponse> =>
    fetch(`${API_BASE}/billing/checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader(),
        },
        body: JSON.stringify({ plan }),
    }).then(handleJson<CheckoutSessionResponse>);

/** Create a Stripe Customer Portal session — for active subscribers to manage
 *  their plan, payment method, or cancel. Throws 404 if the user has never
 *  completed a Checkout. */
export const createPortalSession = (): Promise<PortalSessionResponse> =>
    fetch(`${API_BASE}/billing/portal-session`, {
        method: 'POST',
        headers: authHeader(),
    }).then(handleJson<PortalSessionResponse>);

export { BillingError };
