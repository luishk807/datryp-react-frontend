import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { AirQualityWireContract } from '../test/contracts/airQuality.contract';
import {
    airQualityResponseFixture,
    airQualityNullsFixture,
} from '../test/fixtures/airQuality';
import { fetchAirQuality } from './airQualityApi';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/air-quality`;

// Contract tests for the live air-quality boundary: pin the wire shape and the
// tolerant band-mapping (unknown band → 'moderate'). Throws on non-OK; the
// caller hides the card.
describe('airQualityApi contract — GET /air-quality', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            AirQualityWireContract.parse(airQualityResponseFixture)
        ).not.toThrow();
        expect(() =>
            AirQualityWireContract.parse(airQualityNullsFixture)
        ).not.toThrow();
    });

    it('maps the wire payload → camelCase AirQualityLive', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(airQualityResponseFixture)
            )
        );
        expect(await fetchAirQuality(35.68, 139.69)).toEqual({
            aqi: 42,
            categoryKey: 'good',
            pm25: 9.7,
            observedAt: '2026-07-10T14:00:00Z',
        });
    });

    it('keeps a recognized band and maps a null pm2_5 through', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(airQualityNullsFixture))
        );
        const res = await fetchAirQuality(1, 2);
        expect(res.categoryKey).toBe('unhealthy');
        expect(res.pm25).toBeNull();
        expect(res.observedAt).toBeNull();
    });

    it('falls back to "moderate" for an unrecognized category_key', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json({
                    ...airQualityResponseFixture,
                    category_key: 'not-a-real-band',
                })
            )
        );
        expect((await fetchAirQuality(1, 2)).categoryKey).toBe('moderate');
    });

    it('passes lat + lng as query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(airQualityResponseFixture);
            })
        );
        await fetchAirQuality(35.68, 139.69);
        const params = new URL(requestUrl).searchParams;
        expect(params.get('lat')).toBe('35.68');
        expect(params.get('lng')).toBe('139.69');
    });

    it('throws on a non-OK response', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        await expect(fetchAirQuality(1, 2)).rejects.toThrow(
            'Air quality lookup failed (500)'
        );
    });

    it('contract catches drift (missing envelope / extra field / wrong-typed)', () => {
        expect(() => AirQualityWireContract.parse({})).toThrow();
        expect(() =>
            AirQualityWireContract.parse({
                ...airQualityResponseFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            AirQualityWireContract.parse({
                ...airQualityResponseFixture,
                aqi: 'high',
            })
        ).toThrow();
    });
});
