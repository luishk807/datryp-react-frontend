import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    tripCompanionsPayloadFixture,
    tripCompanionsEmptyFixture,
} from 'test/fixtures/tripCompanions';
import { TripCompanionsWireContract } from 'test/contracts/tripCompanions.contract';
import { getTripCompanions } from './tripCompanionsApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = (tripId: string) => `${API_BASE}/me/trip-companions/${tripId}`;

describe('tripCompanionsApi contract — GET /me/trip-companions/{tripId}', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('raw wire fixtures satisfy the contract', () => {
        expect(() =>
            TripCompanionsWireContract.parse(tripCompanionsPayloadFixture)
        ).not.toThrow();
        expect(() =>
            TripCompanionsWireContract.parse(tripCompanionsEmptyFixture)
        ).not.toThrow();
    });

    it('reshapes each companion snake_case → camelCase and sends the bearer', async () => {
        let authHeader: string | null = null;
        let method: string | undefined;
        server.use(
            http.get(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                method = request.method;
                return HttpResponse.json(tripCompanionsPayloadFixture);
            })
        );
        const res = await getTripCompanions('trip-1');
        expect(res).toEqual([
            {
                userId: 'user-1',
                name: 'Alice',
                profileImageUrl: 'https://cdn.example.com/alice.jpg',
                rating: 5,
                favoritePlace: 'Fushimi Inari',
            },
            {
                userId: 'user-2',
                name: null,
                profileImageUrl: null,
                rating: null,
                favoritePlace: null,
            },
        ]);
        expect(authHeader).toBe('Bearer test-token');
        expect(method).toBe('GET');
    });

    it('returns an empty array when no other members joined', async () => {
        server.use(
            http.get(url('trip-1'), () =>
                HttpResponse.json(tripCompanionsEmptyFixture)
            )
        );
        expect(await getTripCompanions('trip-1')).toEqual([]);
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(tripCompanionsEmptyFixture);
            })
        );
        await getTripCompanions('trip-1');
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(url('trip-1'), () =>
                HttpResponse.json(
                    { detail: 'Not a trip member' },
                    { status: 403, statusText: 'Forbidden' }
                )
            )
        );
        await expect(getTripCompanions('trip-1')).rejects.toThrow(
            'get trip companions 403 Forbidden — Not a trip member'
        );
    });

    it('throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.get(
                url('trip-1'),
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(getTripCompanions('trip-1')).rejects.toThrow(
            'get trip companions 500'
        );
    });

    it('contract catches drift (missing envelope / extra / wrong-typed companion)', () => {
        expect(() => TripCompanionsWireContract.parse({})).toThrow();
        expect(() =>
            TripCompanionsWireContract.parse({
                ...tripCompanionsPayloadFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            TripCompanionsWireContract.parse({
                companions: [{ user_id: 5, name: null }],
            })
        ).toThrow();
    });
});
