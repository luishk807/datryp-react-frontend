import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    checkoutSessionFixture,
    portalSessionFixture,
} from 'test/fixtures/billing';
import { BillingSessionResponseContract } from 'test/contracts/billing.contract';
import {
    createCheckoutSession,
    createPortalSession,
    BillingError,
} from './billingApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const checkoutUrl = `${API_BASE}/billing/checkout-session`;
const portalUrl = `${API_BASE}/billing/portal-session`;

// Contract tests for the REST billing boundary: drive the REAL client through
// MSW so request-building + BillingError mapping run, then validate the
// session response against the Zod contract.
describe('billingApi contract — POST /billing/checkout-session', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            BillingSessionResponseContract.parse(checkoutSessionFixture)
        ).not.toThrow();
        expect(() =>
            BillingSessionResponseContract.parse(portalSessionFixture)
        ).not.toThrow();
    });

    it('POSTs { plan } as JSON with the bearer and returns { url }', async () => {
        let body: unknown;
        let contentType: string | null = null;
        let authHeader: string | null = null;
        let method: string | undefined;
        server.use(
            http.post(checkoutUrl, async ({ request }) => {
                body = await request.json();
                contentType = request.headers.get('content-type');
                authHeader = request.headers.get('authorization');
                method = request.method;
                return HttpResponse.json(checkoutSessionFixture);
            })
        );
        const res = await createCheckoutSession('monthly');
        expect(() =>
            BillingSessionResponseContract.parse(res)
        ).not.toThrow();
        expect(res).toEqual(checkoutSessionFixture);
        expect(method).toBe('POST');
        expect(authHeader).toBe('Bearer test-token');
        expect(contentType).toContain('application/json');
        expect(body).toEqual({ plan: 'monthly' });
    });

    it('forwards the yearly plan', async () => {
        let body: unknown;
        server.use(
            http.post(checkoutUrl, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(checkoutSessionFixture);
            })
        );
        await createCheckoutSession('yearly');
        expect(body).toEqual({ plan: 'yearly' });
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.post(checkoutUrl, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(checkoutSessionFixture);
            })
        );
        await createCheckoutSession('monthly');
        expect(authHeader).toBeNull();
    });

    it('throws a BillingError with the backend `detail` on a non-OK response', async () => {
        server.use(
            http.post(checkoutUrl, () =>
                HttpResponse.json(
                    { detail: 'Price not configured' },
                    { status: 400, statusText: 'Bad Request' }
                )
            )
        );
        const err = await createCheckoutSession('monthly').catch((e) => e);
        expect(err).toBeInstanceOf(BillingError);
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe('BillingError');
        expect(err.message).toBe('Price not configured');
        expect(err.status).toBe(400);
    });

    it('falls back to status/statusText when `detail` is not a string', async () => {
        server.use(
            http.post(checkoutUrl, () =>
                HttpResponse.json(
                    { detail: { code: 1 } },
                    { status: 402, statusText: 'Payment Required' }
                )
            )
        );
        const err = await createCheckoutSession('monthly').catch((e) => e);
        expect(err).toBeInstanceOf(BillingError);
        expect(err.message).toBe('402 Payment Required');
        expect(err.status).toBe(402);
    });

    it('falls back to status/statusText when the error body is not JSON', async () => {
        server.use(
            http.post(
                checkoutUrl,
                () =>
                    new HttpResponse('boom', {
                        status: 500,
                        statusText: 'Internal Server Error',
                    })
            )
        );
        const err = await createCheckoutSession('monthly').catch((e) => e);
        expect(err).toBeInstanceOf(BillingError);
        expect(err.message).toBe('500 Internal Server Error');
        expect(err.status).toBe(500);
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        expect(() => BillingSessionResponseContract.parse({})).toThrow();
        expect(() =>
            BillingSessionResponseContract.parse({
                ...checkoutSessionFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            BillingSessionResponseContract.parse({ url: 42 })
        ).toThrow();
    });
});

describe('billingApi contract — POST /billing/portal-session', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('POSTs with the bearer and returns { url }', async () => {
        let authHeader: string | null = null;
        let method: string | undefined;
        server.use(
            http.post(portalUrl, ({ request }) => {
                authHeader = request.headers.get('authorization');
                method = request.method;
                return HttpResponse.json(portalSessionFixture);
            })
        );
        const res = await createPortalSession();
        expect(() =>
            BillingSessionResponseContract.parse(res)
        ).not.toThrow();
        expect(res).toEqual(portalSessionFixture);
        expect(method).toBe('POST');
        expect(authHeader).toBe('Bearer test-token');
    });

    it('throws a BillingError(404) when the user never completed checkout', async () => {
        server.use(
            http.post(portalUrl, () =>
                HttpResponse.json(
                    { detail: 'No Stripe customer' },
                    { status: 404, statusText: 'Not Found' }
                )
            )
        );
        const err = await createPortalSession().catch((e) => e);
        expect(err).toBeInstanceOf(BillingError);
        expect(err.message).toBe('No Stripe customer');
        expect(err.status).toBe(404);
    });
});
