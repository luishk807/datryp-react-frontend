/**
 * Fetch-based wrappers for the Python backend's REST auth routes.
 * GraphQL is used for everything else; auth is REST because /auth/login
 * is what `pythonGqlClient` reads its token from.
 */

import { getAuthToken } from './authStorage';
import type { SubscriptionPlan, SubscriptionStatus, UserRole } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface SignupPayload {
    email: string;
    password: string;
    /** Year of birth (1900..current year). Server rejects definite under-13s
     *  via `currentYear - birthYear < 13`; the checkbox below covers the
     *  one-year ambiguity. */
    birth_year: number;
    /** User explicitly attests they're at least 13. Server enforces this is
     *  true on signup. */
    confirm_age_13_plus: boolean;
    name?: string;
    phone?: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: 'bearer';
    expires_in: number;
}

export interface MeResponse {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    /** Wire format uses snake_case to match the Pydantic schema; the
     *  UserContext re-shapes these into camelCase for UI consumption. */
    subscription_plan: SubscriptionPlan;
    subscription_status: SubscriptionStatus;
    effective_trip_cap: number;
    is_paid_member: boolean;
    /** ISO-8601 timestamps from the Stripe webhook. Null when there's no
     *  active subscription / trial. */
    trial_ends_at: string | null;
    current_period_end: string | null;
    /** True when the user has cancelled via the Customer Portal but the
     *  current period is still active. UI shows a "cancelling on Y" state
     *  in that case instead of the normal "Renews on Y" copy. */
    subscription_cancel_at_period_end: boolean;
    /** Onboarding state — embedded here so the UserContext can decide
     *  whether to auto-launch the wizard without an extra `/me/preferences`
     *  round-trip on every page load. Null `onboarding_completed_at` means
     *  the wizard hasn't been finished (or explicitly skipped) yet. */
    country_of_birth_code: string | null;
    interests: string[];
    onboarding_completed_at: string | null;
}

class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'AuthError';
    }
}

interface FastAPIValidationItem {
    loc?: (string | number)[];
    msg?: string;
    type?: string;
}

const formatDetail = (detail: unknown): string | null => {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return (detail as FastAPIValidationItem[])
            .map((item) => item?.msg ?? JSON.stringify(item))
            .join('; ');
    }
    return null;
};

const handleJson = async <T>(resp: Response): Promise<T> => {
    if (resp.ok) return (await resp.json()) as T;
    let message = `${resp.status} ${resp.statusText}`;
    try {
        const body = await resp.json();
        const formatted = formatDetail(body?.detail);
        if (formatted) message = formatted;
    } catch {
        // ignore parse error
    }
    throw new AuthError(message, resp.status);
};

export const signup = (payload: SignupPayload): Promise<TokenResponse> =>
    fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).then(handleJson<TokenResponse>);

export const login = (payload: LoginPayload): Promise<TokenResponse> =>
    fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).then(handleJson<TokenResponse>);

export const googleSignin = (credential: string): Promise<TokenResponse> =>
    fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
    }).then(handleJson<TokenResponse>);

export const requestPasswordReset = (email: string): Promise<void> =>
    fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    }).then(async (resp) => {
        // Backend returns 204 even when the email is unknown — same response
        // shape, no user-list leak. Anything 4xx/5xx surfaces as an error
        // (validation, network, etc.).
        if (resp.status === 204) return;
        let message = `${resp.status} ${resp.statusText}`;
        try {
            const body = await resp.json();
            const formatted = formatDetail(body?.detail);
            if (formatted) message = formatted;
        } catch {
            // ignore
        }
        throw new AuthError(message, resp.status);
    });

export const resetPassword = (
    token: string,
    newPassword: string
): Promise<TokenResponse> =>
    fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
    }).then(handleJson<TokenResponse>);

export const fetchMe = (): Promise<MeResponse> => {
    const token = getAuthToken();
    if (!token) throw new AuthError('Not authenticated', 401);
    return fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    }).then(handleJson<MeResponse>);
};

export { AuthError };
