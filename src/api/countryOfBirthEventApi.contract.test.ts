import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { countryOfBirthEventWireFixture } from 'test/fixtures/countryOfBirthEvent';
import { CountryOfBirthEventWireContract } from 'test/contracts/countryOfBirthEvent.contract';
import { fetchCountryOfBirthEvent } from './countryOfBirthEventApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/me/country-of-birth-event`;

// Contract tests for the country-of-birth-event boundary: drive the REAL client
// through MSW so the bearer token, the `?lang=` tag, the 204→null branch, the
// nested event + places reshape, and both error branches are exercised.
describe('countryOfBirthEventApi contract — GET /me/country-of-birth-event', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('wire fixture satisfies the contract', () => {
        expect(() =>
            CountryOfBirthEventWireContract.parse(countryOfBirthEventWireFixture)
        ).not.toThrow();
    });

    it('reshapes event + places snake→camel, sends bearer, defaults lang=en', async () => {
        let authHeader: string | null = null;
        let lang: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                lang = new URL(request.url).searchParams.get('lang');
                return HttpResponse.json(countryOfBirthEventWireFixture);
            })
        );
        const result = await fetchCountryOfBirthEvent();
        expect(authHeader).toBe('Bearer test-token');
        expect(lang).toBe('en');
        expect(result).toEqual({
            event: {
                name: 'Carnaval de Barranquilla',
                startDate: '2027-02-13',
                endDate: '2027-02-16',
                hostCountry: 'Colombia',
                description: "One of the world's largest carnivals.",
                hype: 'Four days of cumbia, costumes and coastal joy.',
                imageUrl: 'https://images.example.com/carnaval.jpg',
                photographerName: 'María Restrepo',
                photographerUrl: 'https://example.com/maria',
            },
            places: [
                {
                    name: 'Barranquilla',
                    country: 'Colombia',
                    countryCode: 'CO',
                    why: 'Ground zero for the carnival parades.',
                    imageUrl: 'https://images.example.com/barranquilla.jpg',
                    photographerName: 'Diego Pérez',
                    photographerUrl: 'https://example.com/diego',
                },
            ],
        });
    });

    it('forwards a custom lang', async () => {
        let lang: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                lang = new URL(request.url).searchParams.get('lang');
                return HttpResponse.json(countryOfBirthEventWireFixture);
            })
        );
        await fetchCountryOfBirthEvent('es');
        expect(lang).toBe('es');
    });

    it('returns null on 204 No Content', async () => {
        server.use(http.get(url, () => new HttpResponse(null, { status: 204 })));
        expect(await fetchCountryOfBirthEvent()).toBeNull();
    });

    it('omits the Authorization header when signed out', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(countryOfBirthEventWireFixture);
            })
        );
        await fetchCountryOfBirthEvent();
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK JSON error', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json({ detail: 'Pro required' }, { status: 403 })
            )
        );
        await expect(fetchCountryOfBirthEvent()).rejects.toThrow(
            '/me/country-of-birth-event 403 — Pro required'
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
        await expect(fetchCountryOfBirthEvent()).rejects.toThrow(
            '/me/country-of-birth-event 500'
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = {
            ...countryOfBirthEventWireFixture,
        } as Record<string, unknown>;
        delete missing.places;
        expect(() =>
            CountryOfBirthEventWireContract.parse(missing)
        ).toThrow();
        expect(() =>
            CountryOfBirthEventWireContract.parse({
                ...countryOfBirthEventWireFixture,
                extra: true,
            })
        ).toThrow();
        expect(() =>
            CountryOfBirthEventWireContract.parse({
                ...countryOfBirthEventWireFixture,
                places: [
                    {
                        ...countryOfBirthEventWireFixture.places[0],
                        country_code: 42,
                    },
                ],
            })
        ).toThrow();
    });
});
