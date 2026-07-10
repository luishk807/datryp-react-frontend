import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { meFixture, tokenFixture } from '../test/fixtures/auth';
import {
    MeResponseContract,
    TokenResponseContract,
} from '../test/contracts/auth.contract';
import { fetchMe, login } from './authApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';

// Contract tests for the REST auth boundary: drive the REAL client functions
// through MSW (so request-building + response-parsing are exercised) and
// validate the returned payloads against the Zod contracts.
describe('authApi contract — GET /auth/me', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fetchMe returns a payload that satisfies the /auth/me contract', async () => {
        server.use(
            http.get(`${API_BASE}/auth/me`, () => HttpResponse.json(meFixture))
        );
        const me = await fetchMe();
        expect(() => MeResponseContract.parse(me)).not.toThrow();
        expect(me.email).toBe(meFixture.email);
    });

    it('sends the stored bearer token in the Authorization header', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(`${API_BASE}/auth/me`, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(meFixture);
            })
        );
        await fetchMe();
        expect(authHeader).toBe('Bearer test-token');
    });

    it('contract catches a MISSING required field (backend drift)', () => {
        const missing = { ...meFixture } as Record<string, unknown>;
        delete missing.email;
        expect(() => MeResponseContract.parse(missing)).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            MeResponseContract.parse({ ...meFixture, surprise_field: true })
        ).toThrow();
    });

    it('contract catches a WRONG-typed field (null where a boolean is required)', () => {
        expect(() =>
            MeResponseContract.parse({ ...meFixture, is_paid_member: null })
        ).toThrow();
    });
});

describe('authApi contract — POST /auth/login', () => {
    it('login returns a payload that satisfies the token contract', async () => {
        let body: unknown;
        server.use(
            http.post(`${API_BASE}/auth/login`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(tokenFixture);
            })
        );
        const res = await login({ email: 'a@b.com', password: 'secret' });
        expect(() => TokenResponseContract.parse(res)).not.toThrow();
        expect(res.access_token).toBe(tokenFixture.access_token);
        // Request contract: the client sends the credentials as JSON.
        expect(body).toEqual({ email: 'a@b.com', password: 'secret' });
    });
});
