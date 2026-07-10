import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { worldEventWireFixture } from 'test/fixtures/worldEvent';
import { WorldEventWireContract } from 'test/contracts/worldEvent.contract';
import { fetchWorldEvent } from './worldEventApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/me/world-event`;

// Contract tests for the Pro world-event boundary: drive the REAL client
// through MSW so the bearer token, the `?lang=` tag, the 204→null branch, the
// nested event + places reshape, and both error branches are exercised.
describe('worldEventApi contract — GET /me/world-event', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('wire fixture satisfies the contract', () => {
        expect(() =>
            WorldEventWireContract.parse(worldEventWireFixture)
        ).not.toThrow();
    });

    it('reshapes event + places snake→camel, sends bearer, defaults lang=en', async () => {
        let authHeader: string | null = null;
        let lang: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                lang = new URL(request.url).searchParams.get('lang');
                return HttpResponse.json(worldEventWireFixture);
            })
        );
        const result = await fetchWorldEvent();
        expect(authHeader).toBe('Bearer test-token');
        expect(lang).toBe('en');
        expect(result).toEqual({
            event: {
                name: 'FIFA World Cup 2026',
                startDate: '2026-06-11',
                endDate: '2026-07-19',
                hostCountry: 'United States',
                description: 'The biggest football tournament on Earth.',
                hype: 'A once-in-a-lifetime summer of football across North America.',
                imageUrl: 'https://images.example.com/wc.jpg',
                photographerName: 'Sam Field',
                photographerUrl: 'https://example.com/sam',
            },
            places: [
                {
                    name: 'New York',
                    country: 'United States',
                    countryCode: 'US',
                    why: 'Hosts the final at MetLife Stadium.',
                    imageUrl: 'https://images.example.com/ny.jpg',
                    photographerName: 'Dana West',
                    photographerUrl: 'https://example.com/dana',
                },
            ],
        });
    });

    it('forwards a custom lang', async () => {
        let lang: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                lang = new URL(request.url).searchParams.get('lang');
                return HttpResponse.json(worldEventWireFixture);
            })
        );
        await fetchWorldEvent('es');
        expect(lang).toBe('es');
    });

    it('returns null on 204 No Content', async () => {
        server.use(http.get(url, () => new HttpResponse(null, { status: 204 })));
        expect(await fetchWorldEvent()).toBeNull();
    });

    it('omits the Authorization header when signed out', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(worldEventWireFixture);
            })
        );
        await fetchWorldEvent();
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK JSON error', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json({ detail: 'Pro required' }, { status: 403 })
            )
        );
        await expect(fetchWorldEvent()).rejects.toThrow(
            '/me/world-event 403 — Pro required'
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
        await expect(fetchWorldEvent()).rejects.toThrow('/me/world-event 500');
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = { ...worldEventWireFixture } as Record<string, unknown>;
        delete missing.event;
        expect(() => WorldEventWireContract.parse(missing)).toThrow();
        expect(() =>
            WorldEventWireContract.parse({
                ...worldEventWireFixture,
                extra: true,
            })
        ).toThrow();
        expect(() =>
            WorldEventWireContract.parse({
                ...worldEventWireFixture,
                event: { ...worldEventWireFixture.event, start_date: 20260611 },
            })
        ).toThrow();
    });
});
