import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    weatherResponseFixture,
    weatherNullsFixture,
} from '../../test/fixtures/weather';
import { useWeather } from './useWeather';

const ENDPOINT = 'http://localhost:8000/weather';

describe('useWeather', () => {
    it('stays idle when coordinates are undefined', () => {
        const { result } = renderHookWithProviders(() =>
            useWeather(undefined, undefined)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when a coordinate is not finite', () => {
        const { result } = renderHookWithProviders(() =>
            useWeather(NaN, 2.35)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('stays idle when the enabled option is false', () => {
        const { result } = renderHookWithProviders(() =>
            useWeather(48.85, 2.35, { enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes live weather', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(weatherResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useWeather(48.85, 2.35)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            temperatureC: 21.4,
            apparentTemperatureC: 20.1,
            highC: 24,
            lowC: 15.5,
            isDay: true,
            condition: 'Partly cloudy',
            flavor: 'cloudy',
        });
    });

    it('passes the nullable fields through', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(weatherNullsFixture))
        );
        const { result } = renderHookWithProviders(() =>
            useWeather(64.14, -21.9)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            apparentTemperatureC: null,
            highC: null,
            lowC: null,
            windKph: null,
            observedAt: null,
        });
    });

    it('forwards lat + lng as query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(weatherResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useWeather(48.85, 2.35)
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
            useWeather(48.85, 2.35)
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
