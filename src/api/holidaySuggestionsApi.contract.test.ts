import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { holidaySuggestionsWireFixture } from 'test/fixtures/holidaySuggestions';
import { HolidaySuggestionsWireContract } from 'test/contracts/holidaySuggestions.contract';
import { fetchHolidaySuggestions } from './holidaySuggestionsApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/me/holiday-suggestions`;

// Contract tests for the Pro holiday-picks boundary: drive the REAL client
// through MSW so the bearer token, the nested holiday + places reshape, the
// activities passthrough, and both error branches are exercised.
describe('holidaySuggestionsApi contract — GET /me/holiday-suggestions', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('wire fixture satisfies the contract', () => {
        expect(() =>
            HolidaySuggestionsWireContract.parse(holidaySuggestionsWireFixture)
        ).not.toThrow();
    });

    it('reshapes holiday + places snake→camel, passes activities through, sends bearer', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(holidaySuggestionsWireFixture);
            })
        );
        const result = await fetchHolidaySuggestions();
        expect(authHeader).toBe('Bearer test-token');
        expect(result).toEqual({
            holiday: {
                name: 'Día de los Muertos',
                date: '2026-11-02',
                country: 'Mexico',
                description: 'A vibrant celebration honoring departed loved ones.',
                imageUrl: 'https://images.example.com/muertos.jpg',
                photographerName: 'Ana López',
                photographerUrl: 'https://example.com/ana',
            },
            places: [
                {
                    name: 'Oaxaca',
                    country: 'Mexico',
                    countryCode: 'MX',
                    why: 'The most atmospheric Día de los Muertos celebrations.',
                    imageUrl: 'https://images.example.com/oaxaca.jpg',
                    photographerName: 'Luis Cruz',
                    photographerUrl: 'https://example.com/luis',
                },
            ],
            activities: [
                {
                    title: 'Visit a panteón at night',
                    description: 'Candlelit graveyard vigils honoring the departed.',
                },
            ],
        });
    });

    it('passes empty places + activities straight through', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json({
                    ...holidaySuggestionsWireFixture,
                    places: [],
                    activities: [],
                })
            )
        );
        const result = await fetchHolidaySuggestions();
        expect(result.places).toEqual([]);
        expect(result.activities).toEqual([]);
    });

    it('omits the Authorization header when signed out', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(holidaySuggestionsWireFixture);
            })
        );
        await fetchHolidaySuggestions();
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK JSON error', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json({ detail: 'Pro required' }, { status: 403 })
            )
        );
        await expect(fetchHolidaySuggestions()).rejects.toThrow(
            '/me/holiday-suggestions 403 — Pro required'
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
        await expect(fetchHolidaySuggestions()).rejects.toThrow(
            '/me/holiday-suggestions 500'
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = {
            ...holidaySuggestionsWireFixture,
        } as Record<string, unknown>;
        delete missing.holiday;
        expect(() => HolidaySuggestionsWireContract.parse(missing)).toThrow();
        expect(() =>
            HolidaySuggestionsWireContract.parse({
                ...holidaySuggestionsWireFixture,
                extra: true,
            })
        ).toThrow();
        expect(() =>
            HolidaySuggestionsWireContract.parse({
                ...holidaySuggestionsWireFixture,
                places: [
                    {
                        ...holidaySuggestionsWireFixture.places[0],
                        country_code: 42,
                    },
                ],
            })
        ).toThrow();
    });
});
