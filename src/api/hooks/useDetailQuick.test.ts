import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { destinationProseWireFixture } from '../../test/fixtures/quickDetails';
import { useCityQuick, useCountryQuick } from './useDetailQuick';

const BASE = 'http://localhost:8000';

describe('useCityQuick', () => {
    it('stays idle while the `enabled` flag is false', () => {
        const { result } = renderHookWithProviders(() =>
            useCityQuick('Kyoto', 'Japan', 'JP', false)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when the params are blank even if enabled', () => {
        const { result } = renderHookWithProviders(() =>
            useCityQuick('', '', '', true)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the narrative prose', async () => {
        server.use(
            http.get(`${BASE}/city-details/quick`, () =>
                HttpResponse.json(destinationProseWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCityQuick('Kyoto', 'Japan', 'JP', true)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.longDescription).toBe(
            destinationProseWireFixture.long_description
        );
        expect(result.current.data?.budgetDescription).toBeTruthy();
    });

    it('coerces missing prose paragraphs to null', async () => {
        server.use(
            http.get(`${BASE}/city-details/quick`, () => HttpResponse.json({}))
        );
        const { result } = renderHookWithProviders(() =>
            useCityQuick('Kyoto', 'Japan', 'JP', true)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            longDescription: null,
            countryDescription: null,
            budgetDescription: null,
        });
    });

    it('forwards name / country / code query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(`${BASE}/city-details/quick`, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(destinationProseWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useCityQuick('Kyoto', 'Japan', 'JP', true)
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
                `${BASE}/city-details/quick`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCityQuick('Kyoto', 'Japan', 'JP', true)
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useCountryQuick', () => {
    it('stays idle while the `enabled` flag is false', () => {
        const { result } = renderHookWithProviders(() =>
            useCountryQuick('JP', false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('stays idle on a too-short code even if enabled', () => {
        const { result } = renderHookWithProviders(() =>
            useCountryQuick('J', true)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the narrative prose and forwards the code', async () => {
        let requestUrl = '';
        server.use(
            http.get(`${BASE}/country-details/quick`, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(destinationProseWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useCountryQuick('jp', true)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.longDescription).toBeTruthy();
        expect(new URL(requestUrl).searchParams.get('code')).toBe('JP');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(
                `${BASE}/country-details/quick`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryQuick('JP', true)
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
