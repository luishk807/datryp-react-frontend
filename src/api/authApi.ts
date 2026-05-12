/**
 * Fetch-based wrappers for the Python backend's REST auth routes.
 * GraphQL is used for everything else; auth is REST because /auth/login
 * is what `pythonGqlClient` reads its token from.
 */

import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface SignupPayload {
    email: string;
    password: string;
    /** Required for COPPA age gating (server rejects under-13). */
    dob: string;
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

export const fetchMe = (): Promise<MeResponse> => {
    const token = getAuthToken();
    if (!token) throw new AuthError('Not authenticated', 401);
    return fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    }).then(handleJson<MeResponse>);
};

export { AuthError };
