import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    monthlyTopCitiesResponseFixture,
    monthlyTopCitiesEmptyFixture,
} from 'test/fixtures/topCitiesMonthly';
import { MonthlyTopCitiesResponseContract } from 'test/contracts/topCitiesMonthly.contract';
import { fetchMonthlyTopCities } from './topCitiesMonthlyApi';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/top-cities-monthly`;

// Contract tests for the REST /top-cities-monthly boundary: drive the REAL
// client through MSW so request-building + per-city snake→camel reshaping run,
// then validate the wire envelope against the Zod contract.
describe('topCitiesMonthlyApi contract — GET /top-cities-monthly', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            MonthlyTopCitiesResponseContract.parse(
                monthlyTopCitiesResponseFixture
            )
        ).not.toThrow();
        expect(() =>
            MonthlyTopCitiesResponseContract.parse(monthlyTopCitiesEmptyFixture)
        ).not.toThrow();
    });

    it('reshapes the envelope + every city snake→camel (nulls passed through)', async () => {
        let method: string | undefined;
        server.use(
            http.get(url, ({ request }) => {
                method = request.method;
                return HttpResponse.json(monthlyTopCitiesResponseFixture);
            })
        );
        const result = await fetchMonthlyTopCities();
        expect(method).toBe('GET');
        expect(result).toEqual({
            month: '2026-07',
            cached: true,
            cities: [
                {
                    name: 'Tokyo',
                    country: 'Japan',
                    countryCode: 'JP',
                    why: 'Summer festivals light up the city.',
                    imageUrl: 'https://images.example.com/tokyo.jpg',
                    photographerName: 'Ansel Adams',
                    photographerUrl: 'https://example.com/ansel',
                },
                {
                    name: 'Reykjavik',
                    country: 'Iceland',
                    countryCode: 'IS',
                    why: 'Midnight sun and puffin season.',
                    imageUrl: null,
                    photographerName: null,
                    photographerUrl: null,
                },
            ],
        });
    });

    it('maps an empty cities list to an empty result list', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json(monthlyTopCitiesEmptyFixture)
            )
        );
        const result = await fetchMonthlyTopCities();
        expect(result).toEqual({ month: '2026-07', cached: false, cities: [] });
    });

    it('throws a descriptive error on a non-OK response', async () => {
        server.use(
            http.get(
                url,
                () =>
                    new HttpResponse(null, {
                        status: 502,
                        statusText: 'Bad Gateway',
                    })
            )
        );
        await expect(fetchMonthlyTopCities()).rejects.toThrow(
            /\/top-cities-monthly failed: 502 Bad Gateway/
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = {
            ...monthlyTopCitiesResponseFixture,
            cities: [
                (() => {
                    const c = {
                        ...monthlyTopCitiesResponseFixture.cities[0],
                    } as Record<string, unknown>;
                    delete c.country_code;
                    return c;
                })(),
            ],
        };
        expect(() =>
            MonthlyTopCitiesResponseContract.parse(missing)
        ).toThrow();
        expect(() =>
            MonthlyTopCitiesResponseContract.parse({
                ...monthlyTopCitiesResponseFixture,
                surprise: true,
            })
        ).toThrow();
        expect(() =>
            MonthlyTopCitiesResponseContract.parse({
                ...monthlyTopCitiesResponseFixture,
                cached: 'yes',
            })
        ).toThrow();
    });
});
