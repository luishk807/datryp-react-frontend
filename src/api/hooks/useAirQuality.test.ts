import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    airQualityResponseFixture,
    airQualityNullsFixture,
} from '../../test/fixtures/airQuality';
import { useAirQuality } from './useAirQuality';

const ENDPOINT = 'http://localhost:8000/air-quality';

describe('useAirQuality', () => {
    it('stays idle when coordinates are undefined', () => {
        const { result } = renderHookWithProviders(() =>
            useAirQuality(undefined, undefined)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when a coordinate is not finite', () => {
        const { result } = renderHookWithProviders(() =>
            useAirQuality(48.85, Infinity)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes live air quality', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(airQualityResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAirQuality(48.85, 2.35)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            aqi: 42,
            categoryKey: 'good',
            pm25: 9.7,
            observedAt: '2026-07-10T14:00:00Z',
        });
    });

    it('maps a recognized non-good band + null pm2_5', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(airQualityNullsFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAirQuality(28.7, 77.1)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            aqi: 160,
            categoryKey: 'unhealthy',
            pm25: null,
            observedAt: null,
        });
    });

    it('falls back to "moderate" for an unrecognized band', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json({
                    aqi: 50,
                    category_key: 'bogus',
                    pm2_5: 1,
                    observed_at: null,
                })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAirQuality(1, 1)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.categoryKey).toBe('moderate');
    });

    it('forwards lat + lng as query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(airQualityResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useAirQuality(48.85, 2.35)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('lat')).toBe('48.85');
        expect(params.get('lng')).toBe('2.35');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 502 }))
        );
        const { result } = renderHookWithProviders(() =>
            useAirQuality(48.85, 2.35)
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
