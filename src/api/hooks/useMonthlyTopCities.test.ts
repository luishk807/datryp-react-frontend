import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    monthlyTopCitiesResponseFixture,
    monthlyTopCitiesEmptyFixture,
} from '../../test/fixtures/topCitiesMonthly';
import { useMonthlyTopCities } from './useMonthlyTopCities';

const ENDPOINT = 'http://localhost:8000/top-cities-monthly';

describe('useMonthlyTopCities', () => {
    it('fetches + reshapes the monthly top cities', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(monthlyTopCitiesResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useMonthlyTopCities()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).pathname).toBe('/top-cities-monthly');
        expect(result.current.data).toMatchObject({
            month: '2026-07',
            cached: true,
        });
        expect(result.current.data?.cities).toHaveLength(2);
        expect(result.current.data?.cities[0]).toMatchObject({
            name: 'Tokyo',
            countryCode: 'JP',
            imageUrl: 'https://images.example.com/tokyo.jpg',
        });
        expect(result.current.data?.cities[1]).toMatchObject({
            name: 'Reykjavik',
            imageUrl: null,
            photographerUrl: null,
        });
    });

    it('maps an empty (fresh, non-cached) response to no cities', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(monthlyTopCitiesEmptyFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useMonthlyTopCities()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            cached: false,
            cities: [],
        });
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useMonthlyTopCities()
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
