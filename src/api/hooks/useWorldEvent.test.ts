import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { worldEventWireFixture } from '../../test/fixtures/worldEvent';
import { useWorldEvent } from './useWorldEvent';

const ENDPOINT = 'http://localhost:8000/me/world-event';

describe('useWorldEvent', () => {
    it('fetches + reshapes the event and its host places', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(worldEventWireFixture))
        );
        const { result } = renderHookWithProviders(() => useWorldEvent());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.event).toMatchObject({
            name: 'FIFA World Cup 2026',
            startDate: '2026-06-11',
            hostCountry: 'United States',
        });
        expect(result.current.data?.places).toHaveLength(1);
        expect(result.current.data?.places[0]).toMatchObject({
            name: 'New York',
            countryCode: 'US',
        });
    });

    it('resolves to null when the backend returns 204 (no major event)', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 204 }))
        );
        const { result } = renderHookWithProviders(() => useWorldEvent());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('sends the active UI language as a query param', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(worldEventWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() => useWorldEvent());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        // The event is generated + cached per language, so the request is keyed
        // on the active UI language.
        expect(new URL(requestUrl).searchParams.get('lang')).toBeTruthy();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useWorldEvent());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
