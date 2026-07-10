import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { completeTripWithAiFixture } from 'test/fixtures/aiFillItinerary';
import { CompleteTripWithAiContract } from 'test/contracts/aiFillItinerary.contract';
import { completeTripWithAi } from './aiFillItineraryApi';
import { BucketListPaywallError } from './bucketListApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
// tripId is URL-encoded by the client, so include a char that changes.
const TRIP_ID = 'trip/42';
const URL = `${API_BASE}/me/trip-complete-ai/${encodeURIComponent(TRIP_ID)}`;

describe('aiFillItineraryApi contract — POST /me/trip-complete-ai/{tripId}', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixture satisfies the wire contract', () => {
        expect(() =>
            CompleteTripWithAiContract.parse(completeTripWithAiFixture)
        ).not.toThrow();
    });

    it('reshapes itinerary_id/added_count and sends the right request', async () => {
        let body: unknown;
        let authHeader: string | null = null;
        let contentType: string | null = null;
        server.use(
            http.post(URL, async ({ request }) => {
                body = await request.json();
                authHeader = request.headers.get('authorization');
                contentType = request.headers.get('content-type');
                return HttpResponse.json(completeTripWithAiFixture);
            })
        );
        const res = await completeTripWithAi(TRIP_ID, 'es');
        expect(res).toEqual({ itineraryId: 'itin-abc123', addedCount: 7 });
        // Request contract: structured JSON body carrying only the language.
        expect(body).toEqual({ lang: 'es' });
        expect(authHeader).toBe('Bearer test-token');
        expect(contentType).toContain('application/json');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'sentinel';
        server.use(
            http.post(URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(completeTripWithAiFixture);
            })
        );
        await completeTripWithAi(TRIP_ID, 'en');
        expect(authHeader).toBeNull();
    });

    it('maps a 402 with structured detail to BucketListPaywallError', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json(
                    {
                        detail: {
                            kind: 'ai_trip_builder_pro',
                            message: 'Upgrade to Pro to auto-fill trips.',
                        },
                    },
                    { status: 402 }
                )
            )
        );
        await expect(completeTripWithAi(TRIP_ID, 'en')).rejects.toMatchObject({
            name: 'BucketListPaywallError',
            kind: 'ai_trip_builder_pro',
            message: 'Upgrade to Pro to auto-fill trips.',
        });
    });

    it('falls back to default kind/message when the 402 detail omits them', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json({ detail: {} }, { status: 402 })
            )
        );
        const err = await completeTripWithAi(TRIP_ID, 'en').catch((e) => e);
        expect(err).toBeInstanceOf(BucketListPaywallError);
        expect(err.kind).toBe('ai_trip_builder_pro');
        expect(err.message).toBe(
            'AI trip planning is a Pro feature. Upgrade to unlock it.'
        );
    });

    it('falls back to default paywall copy on a 402 with no JSON body', async () => {
        server.use(
            http.post(URL, () => new HttpResponse('nope', { status: 402 }))
        );
        const err = await completeTripWithAi(TRIP_ID, 'en').catch((e) => e);
        expect(err).toBeInstanceOf(BucketListPaywallError);
        expect(err.kind).toBe('ai_trip_builder_pro');
        expect(err.message).toBe(
            'AI trip planning is a Pro feature. Upgrade to unlock it.'
        );
    });

    it('surfaces a string `detail` on a non-OK response', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json(
                    { detail: 'Trip is no longer in Planning.' },
                    { status: 409 }
                )
            )
        );
        await expect(completeTripWithAi(TRIP_ID, 'en')).rejects.toThrow(
            'Trip is no longer in Planning.'
        );
    });

    it('surfaces an object `detail.message` on a non-OK response', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json(
                    { detail: { kind: 'quota', message: 'Daily AI limit reached.' } },
                    { status: 429 }
                )
            )
        );
        await expect(completeTripWithAi(TRIP_ID, 'en')).rejects.toThrow(
            'Daily AI limit reached.'
        );
    });

    it('falls back to a status message when the error body is not JSON', async () => {
        server.use(
            http.post(URL, () => new HttpResponse('boom', { status: 500 }))
        );
        await expect(completeTripWithAi(TRIP_ID, 'en')).rejects.toThrow(
            /Itinerary planning failed: 500/
        );
    });

    it('contract catches a MISSING required field (backend drift)', () => {
        const missing = {
            ...completeTripWithAiFixture,
        } as Record<string, unknown>;
        delete missing.itinerary_id;
        expect(() => CompleteTripWithAiContract.parse(missing)).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            CompleteTripWithAiContract.parse({
                ...completeTripWithAiFixture,
                warnings: [],
            })
        ).toThrow();
    });

    it('contract catches a WRONG-typed field (string where number added_count)', () => {
        expect(() =>
            CompleteTripWithAiContract.parse({
                ...completeTripWithAiFixture,
                added_count: '7',
            })
        ).toThrow();
    });
});
