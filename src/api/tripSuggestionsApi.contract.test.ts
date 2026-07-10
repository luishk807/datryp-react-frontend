import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { tripSuggestionsRawFixture } from 'test/fixtures/tripSuggestions';
import { TripSuggestionsWireContract } from 'test/contracts/tripSuggestions.contract';
import {
    fetchTripSuggestions,
    TripSuggestionsBackendError,
} from './tripSuggestionsApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = (tripId: string) =>
    `${API_BASE}/me/trip-suggestions/${encodeURIComponent(tripId)}`;

describe('tripSuggestionsApi contract — POST /me/trip-suggestions/{tripId}', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('raw wire fixture satisfies the contract', () => {
        expect(() =>
            TripSuggestionsWireContract.parse(tripSuggestionsRawFixture)
        ).not.toThrow();
    });

    it('reshapes snake_case → camelCase, sends bearer + empty JSON body', async () => {
        let authHeader: string | null = null;
        let contentType: string | null = null;
        let method: string | undefined;
        let body: unknown;
        server.use(
            http.post(url('trip-1'), async ({ request }) => {
                authHeader = request.headers.get('authorization');
                contentType = request.headers.get('content-type');
                method = request.method;
                body = await request.json();
                return HttpResponse.json(tripSuggestionsRawFixture);
            })
        );
        const res = await fetchTripSuggestions('trip-1');
        expect(res).toEqual({
            suggestions: [
                {
                    name: 'teamLab Planets',
                    place: 'Toyosu, Tokyo',
                    category: 'Museum',
                    why: 'Immersive digital-art rooms unlike anything back home.',
                    estimatedCostUsd: 32,
                    durationHours: 2,
                    imageUrl: 'https://images.unsplash.com/photo-teamlab',
                    photographerName: 'Jane Doe',
                    photographerUrl: 'https://unsplash.com/@janedoe',
                },
                {
                    name: 'Sunrise at a neighborhood shrine',
                    place: null,
                    category: null,
                    why: 'A quiet, free way to start the day like a local.',
                    estimatedCostUsd: null,
                    durationHours: null,
                    imageUrl: null,
                    photographerName: null,
                    photographerUrl: null,
                },
            ],
            dontForget: 'Carry cash — many small shops are cash-only.',
            quota: {
                used: 1,
                cap: 5,
                remaining: 4,
                resetsAt: '2026-07-11T00:00:00Z',
                window: 'day',
            },
        });
        expect(authHeader).toBe('Bearer test-token');
        expect(method).toBe('POST');
        expect(contentType).toContain('application/json');
        expect(body).toEqual({});
    });

    it('URL-encodes the trip id in the path', async () => {
        let path: string | undefined;
        server.use(
            http.post(url('a/b c'), ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json(tripSuggestionsRawFixture);
            })
        );
        await fetchTripSuggestions('a/b c');
        expect(path).toBe('/me/trip-suggestions/a%2Fb%20c');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.post(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(tripSuggestionsRawFixture);
            })
        );
        await fetchTripSuggestions('trip-1');
        expect(authHeader).toBeNull();
    });

    it('throws TripSuggestionsBackendError with a string detail (kind null)', async () => {
        server.use(
            http.post(url('trip-1'), () =>
                HttpResponse.json({ detail: 'Trip not found' }, { status: 404 })
            )
        );
        await expect(fetchTripSuggestions('trip-1')).rejects.toMatchObject({
            name: 'TripSuggestionsBackendError',
            message: 'Trip not found',
            status: 404,
            kind: null,
        });
    });

    it('extracts kind + message from a structured detail object', async () => {
        server.use(
            http.post(url('trip-1'), () =>
                HttpResponse.json(
                    {
                        detail: {
                            kind: 'trip_suggestions_pro',
                            message: 'Upgrade to Pro for suggestions',
                        },
                    },
                    { status: 402 }
                )
            )
        );
        let err: unknown;
        try {
            await fetchTripSuggestions('trip-1');
        } catch (e) {
            err = e;
        }
        expect(err).toBeInstanceOf(TripSuggestionsBackendError);
        const be = err as TripSuggestionsBackendError;
        expect(be.kind).toBe('trip_suggestions_pro');
        expect(be.message).toBe('Upgrade to Pro for suggestions');
        expect(be.status).toBe(402);
    });

    it('falls back to a generic message + null kind on a non-JSON error body', async () => {
        server.use(
            http.post(
                url('trip-1'),
                () => new HttpResponse('gateway down', { status: 502 })
            )
        );
        await expect(fetchTripSuggestions('trip-1')).rejects.toMatchObject({
            message: 'Trip suggestions failed (502)',
            status: 502,
            kind: null,
        });
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        expect(() => TripSuggestionsWireContract.parse({})).toThrow();
        expect(() =>
            TripSuggestionsWireContract.parse({
                ...tripSuggestionsRawFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            TripSuggestionsWireContract.parse({
                ...tripSuggestionsRawFixture,
                quota: {
                    used: 1,
                    cap: 5,
                    remaining: 4,
                    resets_at: 0, // should be string | null
                    window: 'day',
                },
            })
        ).toThrow();
    });
});
