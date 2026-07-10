import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { MonthlyBestPlaceWireContract } from '../test/contracts/monthlyBestPlace.contract';
import { monthlyBestPlaceWireFixture } from '../test/fixtures/monthlyBestPlace';
import { fetchMonthlyBestPlace } from './monthlyBestPlaceApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/me/monthly-best-place`;

// Contract tests for the Pro monthly pick boundary: drive the REAL client
// through MSW so the bearer token, the nested `place` snake→camel reshape, the
// `highlights` passthrough, and both error branches are exercised.
describe('monthlyBestPlaceApi contract — GET /me/monthly-best-place', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixture satisfies the wire contract', () => {
        expect(() =>
            MonthlyBestPlaceWireContract.parse(monthlyBestPlaceWireFixture)
        ).not.toThrow();
    });

    it('reshapes the nested place + highlights and sends the bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(monthlyBestPlaceWireFixture);
            })
        );
        const result = await fetchMonthlyBestPlace();
        expect(authHeader).toBe('Bearer test-token');
        expect(result).toEqual({
            monthKey: '2026-07',
            place: {
                name: 'Reykjavik',
                country: 'Iceland',
                countryCode: 'IS',
                tagline: monthlyBestPlaceWireFixture.place.tagline,
                whyForYou: monthlyBestPlaceWireFixture.place.why_for_you,
                imageUrl: monthlyBestPlaceWireFixture.place.image_url,
                photographerName:
                    monthlyBestPlaceWireFixture.place.photographer_name,
                photographerUrl:
                    monthlyBestPlaceWireFixture.place.photographer_url,
            },
            highlights: monthlyBestPlaceWireFixture.highlights,
        });
    });

    it('omits the Authorization header when signed out', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(monthlyBestPlaceWireFixture);
            })
        );
        await fetchMonthlyBestPlace();
        expect(authHeader).toBeNull();
    });

    it('passes an empty highlights list straight through', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json({
                    ...monthlyBestPlaceWireFixture,
                    highlights: [],
                })
            )
        );
        const result = await fetchMonthlyBestPlace();
        expect(result.highlights).toEqual([]);
    });

    it('throws with the backend detail on a non-OK JSON error', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json({ detail: 'Pro required' }, { status: 403 })
            )
        );
        await expect(fetchMonthlyBestPlace()).rejects.toThrow(
            '/me/monthly-best-place 403 — Pro required'
        );
    });

    it('throws a bare status message when the error body is not JSON', async () => {
        server.use(
            http.get(
                url,
                () =>
                    new HttpResponse('nope', {
                        status: 500,
                        headers: { 'content-type': 'text/plain' },
                    })
            )
        );
        await expect(fetchMonthlyBestPlace()).rejects.toThrow(
            '/me/monthly-best-place 500'
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = {
            ...monthlyBestPlaceWireFixture,
        } as Record<string, unknown>;
        delete missing.month_key;
        expect(() => MonthlyBestPlaceWireContract.parse(missing)).toThrow();
        expect(() =>
            MonthlyBestPlaceWireContract.parse({
                ...monthlyBestPlaceWireFixture,
                extra: true,
            })
        ).toThrow();
        expect(() =>
            MonthlyBestPlaceWireContract.parse({
                ...monthlyBestPlaceWireFixture,
                place: {
                    ...monthlyBestPlaceWireFixture.place,
                    why_for_you: 99,
                },
            })
        ).toThrow();
    });
});
