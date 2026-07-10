import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    nextMonthPicksFixture,
    nextMonthPicksEmptyFixture,
} from 'test/fixtures/nextMonthPicks';
import {
    NextMonthPickItemContract,
    NextMonthPicksContract,
} from 'test/contracts/nextMonthPicks.contract';
import { fetchNextMonthPicks } from './nextMonthPicksApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const URL = `${API_BASE}/me/next-month-picks`;

describe('nextMonthPicksApi contract — GET /me/next-month-picks', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            NextMonthPicksContract.parse(nextMonthPicksFixture)
        ).not.toThrow();
    });

    it('fetchNextMonthPicks reshapes items + monthLabel', async () => {
        server.use(http.get(URL, () => HttpResponse.json(nextMonthPicksFixture)));
        const res = await fetchNextMonthPicks();
        expect(res.monthLabel).toBe('August');
        expect(res.items).toHaveLength(2);
        expect(res.items[0]).toEqual({
            kind: 'place',
            key: 'santorini-gr',
            name: 'Santorini',
            location: 'Cyclades, Greece',
            city: 'Fira',
            country: 'Greece',
            countryCode: 'GR',
            imageUrl: 'https://img.example/santorini.jpg',
            bestTimeToVisit: 'May to October',
            savedAt: '2026-06-01T12:00:00Z',
        });
        // country kind: null city/country passthrough
        expect(res.items[1].kind).toBe('country');
        expect(res.items[1].city).toBeNull();
        expect(res.items[1].countryCode).toBe('JP');
    });

    it('handles an empty pick list', async () => {
        server.use(
            http.get(URL, () => HttpResponse.json(nextMonthPicksEmptyFixture))
        );
        const res = await fetchNextMonthPicks();
        expect(res.items).toEqual([]);
        expect(res.monthLabel).toBe('August');
    });

    it('sends the stored bearer token in the Authorization header', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(nextMonthPicksEmptyFixture);
            })
        );
        await fetchNextMonthPicks();
        expect(authHeader).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'sentinel';
        server.use(
            http.get(URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(nextMonthPicksEmptyFixture);
            })
        );
        await fetchNextMonthPicks();
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(URL, () =>
                HttpResponse.json({ detail: 'boom' }, { status: 500 })
            )
        );
        await expect(fetchNextMonthPicks()).rejects.toThrow(
            '/me/next-month-picks 500 — boom'
        );
    });

    it('throws a status-only error when the error body is not JSON', async () => {
        server.use(
            http.get(URL, () => new HttpResponse('nope', { status: 502 }))
        );
        await expect(fetchNextMonthPicks()).rejects.toThrow(
            '/me/next-month-picks 502'
        );
    });

    it('contract catches a MISSING required field (backend drift)', () => {
        const missing = {
            ...nextMonthPicksFixture.items[0],
        } as Record<string, unknown>;
        delete missing.best_time_to_visit;
        expect(() => NextMonthPickItemContract.parse(missing)).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            NextMonthPickItemContract.parse({
                ...nextMonthPicksFixture.items[0],
                extra: 1,
            })
        ).toThrow();
    });

    it('contract catches a BAD enum value for kind', () => {
        expect(() =>
            NextMonthPickItemContract.parse({
                ...nextMonthPicksFixture.items[0],
                kind: 'region',
            })
        ).toThrow();
    });
});
