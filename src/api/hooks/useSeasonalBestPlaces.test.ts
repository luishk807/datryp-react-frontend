import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { seasonalBestPlacesWireFixture } from '../../test/fixtures/seasonalBestPlaces';
import {
    useSeasonalBestPlaces,
    currentMonthKey,
} from './useSeasonalBestPlaces';

const ENDPOINT = 'http://localhost:8000/seasonal-best-places';

describe('currentMonthKey', () => {
    it('formats the current month as YYYY-MM', () => {
        expect(currentMonthKey()).toMatch(/^\d{4}-\d{2}$/);
    });
});

describe('useSeasonalBestPlaces', () => {
    it('stays idle when disabled via the enabled option', () => {
        const { result } = renderHookWithProviders(() =>
            useSeasonalBestPlaces({ enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fetches + reshapes the seasonal picks', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(seasonalBestPlacesWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useSeasonalBestPlaces()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).pathname).toBe('/seasonal-best-places');
        expect(result.current.data).toMatchObject({
            monthKey: '2026-07',
            cached: true,
        });
        expect(result.current.data?.places).toHaveLength(2);
        expect(result.current.data?.places[0]).toMatchObject({
            name: 'Reykjavik',
            countryCode: 'IS',
            imageUrl: 'https://images.example.com/reykjavik.jpg',
        });
        expect(result.current.data?.places[1]).toMatchObject({
            name: 'Provence',
            imageUrl: null,
            photographerName: null,
        });
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useSeasonalBestPlaces()
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
