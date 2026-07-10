import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    fullCityDetailsResponseFixture,
    cityProseSliceFixture,
    cityListsSliceFixture,
    cityFactsSliceFixture,
} from '../../test/fixtures/cityDetails';
import {
    useCityDetails,
    useCityProse,
    useCityLists,
    useCityFacts,
    useCityDetailsProgressive,
} from './useCityDetails';

const BASE = 'http://localhost:8000';

describe('useCityDetails', () => {
    it('stays idle (no request) until all three params are present', () => {
        const { result } = renderHookWithProviders(() =>
            useCityDetails('', '', '')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fetches + reshapes the full city detail payload', async () => {
        server.use(
            http.get(`${BASE}/city-details`, () =>
                HttpResponse.json(fullCityDetailsResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCityDetails('Kyoto', 'Japan', 'JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.city).toMatchObject({
            name: 'Kyoto',
            countryCode: 'JP',
        });
        expect(result.current.data?.cached).toBe(true);
        expect(result.current.data?.details.longDescription).toBe(
            'Kyoto is the cultural heart of Japan.'
        );
        expect(result.current.data?.details.currency).toMatchObject({
            ratePerUsd: 150,
        });
    });

    it('forwards name / country / code query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(`${BASE}/city-details`, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(fullCityDetailsResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useCityDetails('  Kyoto  ', '  Japan  ', 'jp')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('name')).toBe('Kyoto');
        expect(params.get('country')).toBe('Japan');
        expect(params.get('code')).toBe('JP');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(
                `${BASE}/city-details`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCityDetails('Kyoto', 'Japan', 'JP')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useCityDetails slice hooks', () => {
    it('useCityProse returns the reshaped prose slice + city summary', async () => {
        server.use(
            http.get(`${BASE}/city-details/prose`, () =>
                HttpResponse.json(cityProseSliceFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCityProse('Kyoto', 'Japan', 'JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.city.name).toBe('Kyoto');
        expect(result.current.data?.details.longDescription).toBe(
            'Kyoto is the cultural heart of Japan.'
        );
    });

    it('useCityLists returns the reshaped lists slice', async () => {
        server.use(
            http.get(`${BASE}/city-details/lists`, () =>
                HttpResponse.json(cityListsSliceFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCityLists('Kyoto', 'Japan', 'JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.topPlaces).toHaveLength(2);
        expect(result.current.data?.topPlaces?.[0].name).toBe('Fushimi Inari');
    });

    it('useCityFacts returns the reshaped facts slice', async () => {
        server.use(
            http.get(`${BASE}/city-details/facts`, () =>
                HttpResponse.json(cityFactsSliceFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCityFacts('Kyoto', 'Japan', 'JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.currency).toMatchObject({
            ratePerUsd: 150,
        });
        expect(result.current.data?.greatFor).toEqual(['culture', 'food']);
    });

    it('slice hook is disabled on a too-short code', () => {
        const { result } = renderHookWithProviders(() =>
            useCityProse('Kyoto', 'Japan', 'J')
        );
        expect(result.current.fetchStatus).toBe('idle');
    });
});

describe('useCityDetailsProgressive', () => {
    it('merges prose + lists + facts as the three slices resolve', async () => {
        server.use(
            http.get(`${BASE}/city-details/prose`, () =>
                HttpResponse.json(cityProseSliceFixture)
            ),
            http.get(`${BASE}/city-details/lists`, () =>
                HttpResponse.json(cityListsSliceFixture)
            ),
            http.get(`${BASE}/city-details/facts`, () =>
                HttpResponse.json(cityFactsSliceFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCityDetailsProgressive('Kyoto', 'Japan', 'JP')
        );
        await waitFor(() =>
            expect(result.current.factsLoading).toBe(false)
        );
        expect(result.current.city?.name).toBe('Kyoto');
        // longDescription from prose, topPlaces from lists, currency from facts.
        expect(result.current.details.longDescription).toBeTruthy();
        expect(result.current.details.topPlaces).toHaveLength(2);
        expect(result.current.details.currency?.code).toBe('JPY');
    });

    it('fires no request and stays empty when params are blank', () => {
        const { result } = renderHookWithProviders(() =>
            useCityDetailsProgressive('', '', '')
        );
        expect(result.current.city).toBeUndefined();
        expect(result.current.details).toEqual({});
        expect(result.current.isError).toBe(false);
    });
});
