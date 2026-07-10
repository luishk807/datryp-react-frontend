import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    tripRatingPayloadFixture,
    tripRatingEmptyPayloadFixture,
} from 'test/fixtures/tripRating';
import { TripRatingWireContract } from 'test/contracts/tripRating.contract';
import { getTripRating, setTripRating } from './tripRatingApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = (tripId: string) => `${API_BASE}/me/trip-rating/${tripId}`;

describe('tripRatingApi contract — /me/trip-rating/{tripId}', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('raw wire fixtures satisfy the contract', () => {
        expect(() =>
            TripRatingWireContract.parse(tripRatingPayloadFixture)
        ).not.toThrow();
        expect(() =>
            TripRatingWireContract.parse(tripRatingEmptyPayloadFixture)
        ).not.toThrow();
    });

    it('getTripRating reshapes snake_case → camelCase and sends the bearer', async () => {
        let authHeader: string | null = null;
        let method: string | undefined;
        server.use(
            http.get(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                method = request.method;
                return HttpResponse.json(tripRatingPayloadFixture);
            })
        );
        const res = await getTripRating('trip-1');
        expect(res).toEqual({
            myRating: 5,
            myExpectations: 'Hoped for great ramen — it delivered.',
            mySurprised: 'The train punctuality blew me away.',
            myAdvice: 'Get a Suica card on day one.',
            average: 4.5,
            count: 3,
        });
        expect(authHeader).toBe('Bearer test-token');
        expect(method).toBe('GET');
    });

    it('getTripRating maps the all-null (nobody rated) payload', async () => {
        server.use(
            http.get(url('trip-1'), () =>
                HttpResponse.json(tripRatingEmptyPayloadFixture)
            )
        );
        const res = await getTripRating('trip-1');
        expect(res).toEqual({
            myRating: null,
            myExpectations: null,
            mySurprised: null,
            myAdvice: null,
            average: null,
            count: 0,
        });
    });

    it('setTripRating PUTs the full recap body and reshapes the response', async () => {
        let method: string | undefined;
        let body: unknown;
        server.use(
            http.put(url('trip-1'), async ({ request }) => {
                method = request.method;
                body = await request.json();
                return HttpResponse.json(tripRatingPayloadFixture);
            })
        );
        const res = await setTripRating('trip-1', {
            rating: 5,
            expectations: 'ramen',
            surprised: 'trains',
            advice: 'Suica',
        });
        expect(method).toBe('PUT');
        expect(body).toEqual({
            rating: 5,
            expectations: 'ramen',
            surprised: 'trains',
            advice: 'Suica',
        });
        expect(res.myRating).toBe(5);
    });

    it('setTripRating defaults omitted recap fields to null', async () => {
        let body: unknown;
        server.use(
            http.put(url('trip-1'), async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(tripRatingPayloadFixture);
            })
        );
        await setTripRating('trip-1', { rating: null });
        expect(body).toEqual({
            rating: null,
            expectations: null,
            surprised: null,
            advice: null,
        });
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(tripRatingEmptyPayloadFixture);
            })
        );
        await getTripRating('trip-1');
        expect(authHeader).toBeNull();
    });

    it('getTripRating throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(url('trip-1'), () =>
                HttpResponse.json(
                    { detail: 'Trip not found' },
                    { status: 404, statusText: 'Not Found' }
                )
            )
        );
        await expect(getTripRating('trip-1')).rejects.toThrow(
            'get trip rating 404 Not Found — Trip not found'
        );
    });

    it('setTripRating throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.put(
                url('trip-1'),
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(
            setTripRating('trip-1', { rating: 4 })
        ).rejects.toThrow('set trip rating 500');
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = { ...tripRatingPayloadFixture } as Record<
            string,
            unknown
        >;
        delete missing.count;
        expect(() => TripRatingWireContract.parse(missing)).toThrow();
        expect(() =>
            TripRatingWireContract.parse({
                ...tripRatingPayloadFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            TripRatingWireContract.parse({
                ...tripRatingPayloadFixture,
                count: null,
            })
        ).toThrow();
    });
});
