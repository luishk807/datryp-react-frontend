import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { WeatherWireContract } from '../test/contracts/weather.contract';
import {
    weatherResponseFixture,
    weatherNullsFixture,
} from '../test/fixtures/weather';
import { fetchWeather } from './weatherApi';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/weather`;

// Contract tests for the live-weather boundary: drive the REAL client through
// MSW (snake→camel reshaping exercised) and pin the wire shape. Unlike the
// lookup APIs, this one THROWS on non-OK — the caller falls back to prose.
describe('weatherApi contract — GET /weather', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            WeatherWireContract.parse(weatherResponseFixture)
        ).not.toThrow();
        expect(() =>
            WeatherWireContract.parse(weatherNullsFixture)
        ).not.toThrow();
    });

    it('maps the wire payload → camelCase WeatherLive', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(weatherResponseFixture))
        );
        expect(await fetchWeather(35.68, 139.69)).toEqual({
            temperatureC: 21.4,
            apparentTemperatureC: 20.1,
            highC: 24,
            lowC: 15.5,
            windKph: 12.3,
            isDay: true,
            weatherCode: 2,
            condition: 'Partly cloudy',
            flavor: 'cloudy',
            observedAt: '2026-07-10T14:00:00Z',
        });
    });

    it('passes lat + lng as query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(weatherResponseFixture);
            })
        );
        await fetchWeather(35.68, 139.69);
        const params = new URL(requestUrl).searchParams;
        expect(params.get('lat')).toBe('35.68');
        expect(params.get('lng')).toBe('139.69');
    });

    it('maps the nullable fields through as null', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(weatherNullsFixture))
        );
        const res = await fetchWeather(0, 0);
        expect(res.apparentTemperatureC).toBeNull();
        expect(res.highC).toBeNull();
        expect(res.lowC).toBeNull();
        expect(res.windKph).toBeNull();
        expect(res.observedAt).toBeNull();
        expect(res.flavor).toBe('cold');
    });

    it('throws on a non-OK response', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 502 }))
        );
        await expect(fetchWeather(1, 2)).rejects.toThrow(
            'Weather lookup failed (502)'
        );
    });

    it('contract catches drift (missing fields / extra field / invalid flavor enum)', () => {
        expect(() => WeatherWireContract.parse({})).toThrow();
        expect(() =>
            WeatherWireContract.parse({ ...weatherResponseFixture, extra: 1 })
        ).toThrow();
        expect(() =>
            WeatherWireContract.parse({
                ...weatherResponseFixture,
                flavor: 'stormy',
            })
        ).toThrow();
    });
});
