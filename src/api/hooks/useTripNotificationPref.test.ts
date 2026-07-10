import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    tripNotificationPrefFixture,
    tripNotificationPrefNullFixture,
} from '../../test/fixtures/tripNotificationPref';
import {
    useTripNotificationPref,
    useSetTripNotificationPref,
} from './useTripNotificationPref';

const BASE = 'http://localhost:8000';
const TRIP = 'trip-3';
const prefKey = ['tripNotificationPref', TRIP];

describe('useTripNotificationPref', () => {
    it('is disabled (no request) when no trip id is given', () => {
        const { result } = renderHookWithProviders(() =>
            useTripNotificationPref(null)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fetches the current override for a trip', async () => {
        server.use(
            http.get(`${BASE}/trips/:id/notification-pref`, () =>
                HttpResponse.json(tripNotificationPrefFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useTripNotificationPref(TRIP)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(tripNotificationPrefFixture);
    });
});

describe('useSetTripNotificationPref', () => {
    it('PUTs the chosen channel and seeds the query cache', async () => {
        let method = '';
        let path = '';
        let body: unknown = null;
        server.use(
            http.put(
                `${BASE}/trips/:id/notification-pref`,
                async ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    body = await request.json();
                    return HttpResponse.json(tripNotificationPrefFixture);
                }
            )
        );
        const client = makeTestQueryClient();
        const { result } = renderHookWithProviders(
            () => useSetTripNotificationPref(TRIP),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('both');
        });

        // Read the cache synchronously right after `act` — with gcTime: 0 an
        // un-observed setQueryData entry is collected on the next tick, so a
        // `waitFor` here would race it away.
        expect(client.getQueryData(prefKey)).toEqual(
            tripNotificationPrefFixture
        );
        expect(method).toBe('PUT');
        expect(path).toBe('/trips/trip-3/notification-pref');
        expect(body).toEqual({ channel: 'both' });
    });

    it('clears the override with a null channel', async () => {
        let body: unknown = null;
        server.use(
            http.put(
                `${BASE}/trips/:id/notification-pref`,
                async ({ request }) => {
                    body = await request.json();
                    return HttpResponse.json(tripNotificationPrefNullFixture);
                }
            )
        );
        const { result } = renderHookWithProviders(() =>
            useSetTripNotificationPref(TRIP)
        );

        await act(async () => {
            await result.current.mutateAsync(null);
        });

        await waitFor(() => expect(result.current.data).toBeDefined());
        expect(body).toEqual({ channel: null });
    });

    it('surfaces a backend error', async () => {
        server.use(
            http.put(
                `${BASE}/trips/:id/notification-pref`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useSetTripNotificationPref(TRIP)
        );

        await act(async () => {
            await result.current
                .mutateAsync('email')
                .catch(() => undefined);
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
