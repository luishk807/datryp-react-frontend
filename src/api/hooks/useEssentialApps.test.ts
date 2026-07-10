import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    essentialAppsFixture,
    essentialAppsAiFixture,
} from '../../test/fixtures/essentialApps';
import { useEssentialApps } from './useEssentialApps';

const ENDPOINT = 'http://localhost:8000/essential-apps';

describe('useEssentialApps', () => {
    it('stays idle (no request) for a blank / too-short code', () => {
        const { result } = renderHookWithProviders(() => useEssentialApps('J'));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fetches + reshapes the curated apps, normalising unknown statuses', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(essentialAppsFixture))
        );
        const { result } = renderHookWithProviders(() =>
            useEssentialApps('JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.countryCode).toBe('JP');
        expect(result.current.data?.source).toBe('curated');
        expect(result.current.data?.intro).toBeTruthy();
        const rideHailing = result.current.data?.categories[0];
        expect(rideHailing?.apps).toEqual([
            { name: 'GO', note: 'Taxi hailing', status: 'essential' },
            { name: 'Uber', note: 'Limited coverage', status: 'caution' },
            { name: 'DiDi', note: null, status: null },
            // 'unknown-value' is not in the allow-list → coerced to null.
            { name: 'Legacy', note: null, status: null },
        ]);
    });

    it('defaults intro to null for an AI-sourced payload', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(essentialAppsAiFixture))
        );
        const { result } = renderHookWithProviders(() =>
            useEssentialApps('FR')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.source).toBe('ai');
        expect(result.current.data?.intro).toBeNull();
    });

    it('resolves to null when the country is not curated (204)', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 204 }))
        );
        const { result } = renderHookWithProviders(() =>
            useEssentialApps('ZZ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('uppercases + trims the code into the query param', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(essentialAppsFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useEssentialApps('  jp  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('code')).toBe('JP');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useEssentialApps('JP')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
