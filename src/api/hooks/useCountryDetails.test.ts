import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    fullCountryDetailsResponseFixture,
    countryProseSliceFixture,
    countryListsSliceFixture,
    countryFactsSliceFixture,
} from '../../test/fixtures/countryDetails';
import {
    useCountryDetails,
    useCountryProse,
    useCountryLists,
    useCountryFacts,
    useCountryDetailsProgressive,
} from './useCountryDetails';

const BASE = 'http://localhost:8000';

describe('useCountryDetails', () => {
    it('stays idle until the code is at least 2 chars', () => {
        const { result } = renderHookWithProviders(() =>
            useCountryDetails('J')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fetches + reshapes the full country detail payload', async () => {
        server.use(
            http.get(`${BASE}/country-details`, () =>
                HttpResponse.json(fullCountryDetailsResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryDetails('JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.country).toMatchObject({
            name: 'Japan',
            code: 'JP',
        });
        expect(result.current.data?.details.capitalCity).toBe('Tokyo');
        expect(result.current.data?.details.currency).toMatchObject({
            ratePerUsd: 150,
        });
    });

    it('uppercases + trims the code into the query param', async () => {
        let requestUrl = '';
        server.use(
            http.get(`${BASE}/country-details`, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(fullCountryDetailsResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useCountryDetails('  jp  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('code')).toBe('JP');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(
                `${BASE}/country-details`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryDetails('JP')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useCountryDetails slice hooks', () => {
    it('useCountryProse returns the reshaped prose slice + country summary', async () => {
        server.use(
            http.get(`${BASE}/country-details/prose`, () =>
                HttpResponse.json(countryProseSliceFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryProse('JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.country.name).toBe('Japan');
        expect(result.current.data?.details.capitalCity).toBe('Tokyo');
    });

    it('useCountryLists returns the reshaped lists slice', async () => {
        server.use(
            http.get(`${BASE}/country-details/lists`, () =>
                HttpResponse.json(countryListsSliceFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryLists('JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.topCities).toHaveLength(2);
        expect(result.current.data?.topCities?.[0].name).toBe('Tokyo');
    });

    it('useCountryFacts returns the reshaped facts slice', async () => {
        server.use(
            http.get(`${BASE}/country-details/facts`, () =>
                HttpResponse.json(countryFactsSliceFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryFacts('JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.currency).toMatchObject({
            ratePerUsd: 150,
        });
        expect(result.current.data?.touristRating).toBe(5);
    });

    it('slice hook is disabled on a too-short code', () => {
        const { result } = renderHookWithProviders(() =>
            useCountryProse('J')
        );
        expect(result.current.fetchStatus).toBe('idle');
    });
});

describe('useCountryDetailsProgressive', () => {
    it('merges prose + lists + facts as the three slices resolve', async () => {
        server.use(
            http.get(`${BASE}/country-details/prose`, () =>
                HttpResponse.json(countryProseSliceFixture)
            ),
            http.get(`${BASE}/country-details/lists`, () =>
                HttpResponse.json(countryListsSliceFixture)
            ),
            http.get(`${BASE}/country-details/facts`, () =>
                HttpResponse.json(countryFactsSliceFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryDetailsProgressive('JP')
        );
        await waitFor(() =>
            expect(result.current.factsLoading).toBe(false)
        );
        expect(result.current.country?.name).toBe('Japan');
        expect(result.current.details.capitalCity).toBe('Tokyo');
        expect(result.current.details.topCities).toHaveLength(2);
        expect(result.current.details.currency?.code).toBe('JPY');
    });

    it('fires no request and stays empty when the code is blank', () => {
        const { result } = renderHookWithProviders(() =>
            useCountryDetailsProgressive('')
        );
        expect(result.current.country).toBeUndefined();
        expect(result.current.details).toEqual({});
        expect(result.current.isError).toBe(false);
    });
});
