import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { DestinationProseWireContract } from '../test/contracts/quickDetails.contract';
import { destinationProseWireFixture } from '../test/fixtures/quickDetails';
import { fetchCityQuick, fetchCountryQuick } from './quickDetailsApi';

const API_BASE = 'http://localhost:8000';
const cityUrl = `${API_BASE}/city-details/quick`;
const countryUrl = `${API_BASE}/country-details/quick`;

// Contract tests for the progressive prose slices: drive the REAL clients
// through MSW so query-param building (name/country/code/lang) and the
// snake→camel `?? null` reshape are exercised.
describe('quickDetailsApi contract — prose slices', () => {
    it('fixture satisfies the wire contract', () => {
        expect(() =>
            DestinationProseWireContract.parse(destinationProseWireFixture)
        ).not.toThrow();
    });

    describe('GET /city-details/quick', () => {
        it('forwards name/country/code + a lang param and reshapes prose', async () => {
            let params: URLSearchParams | null = null;
            server.use(
                http.get(cityUrl, ({ request }) => {
                    params = new URL(request.url).searchParams;
                    return HttpResponse.json(destinationProseWireFixture);
                })
            );
            const result = await fetchCityQuick('Kyoto', 'Japan', 'JP');
            expect(params!.get('name')).toBe('Kyoto');
            expect(params!.get('country')).toBe('Japan');
            expect(params!.get('code')).toBe('JP');
            expect(params!.get('lang')).toBeTruthy();
            expect(result).toEqual({
                longDescription: destinationProseWireFixture.long_description,
                countryDescription:
                    destinationProseWireFixture.country_description,
                budgetDescription:
                    destinationProseWireFixture.budget_description,
            });
        });

        it('coerces omitted paragraphs to null', async () => {
            server.use(http.get(cityUrl, () => HttpResponse.json({})));
            const result = await fetchCityQuick('Kyoto', 'Japan', 'JP');
            expect(result).toEqual({
                longDescription: null,
                countryDescription: null,
                budgetDescription: null,
            });
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(cityUrl, () => new HttpResponse(null, { status: 500 }))
            );
            await expect(fetchCityQuick('Kyoto', 'Japan', 'JP')).rejects.toThrow(
                /\/city-details\/quick failed: 500/
            );
        });
    });

    describe('GET /country-details/quick', () => {
        it('forwards code + a lang param and reshapes prose', async () => {
            let params: URLSearchParams | null = null;
            server.use(
                http.get(countryUrl, ({ request }) => {
                    params = new URL(request.url).searchParams;
                    return HttpResponse.json(destinationProseWireFixture);
                })
            );
            const result = await fetchCountryQuick('JP');
            expect(params!.get('code')).toBe('JP');
            expect(params!.get('lang')).toBeTruthy();
            expect(result.longDescription).toBe(
                destinationProseWireFixture.long_description
            );
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(
                    countryUrl,
                    () => new HttpResponse(null, { status: 502 })
                )
            );
            await expect(fetchCountryQuick('JP')).rejects.toThrow(
                /\/country-details\/quick failed: 502/
            );
        });
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = {
            ...destinationProseWireFixture,
        } as Record<string, unknown>;
        delete missing.long_description;
        expect(() => DestinationProseWireContract.parse(missing)).toThrow();
        expect(() =>
            DestinationProseWireContract.parse({
                ...destinationProseWireFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            DestinationProseWireContract.parse({
                ...destinationProseWireFixture,
                budget_description: 5,
            })
        ).toThrow();
    });
});
