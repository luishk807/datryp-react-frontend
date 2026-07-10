import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { notifyActivityRawFixture } from '../../test/fixtures/tripAlerts';
import { useNotifyActivity } from './useNotifyActivity';

const BASE = 'http://localhost:8000';
const TRIP = 'trip-2';
const ACTIVITY = 'act-7';

describe('useNotifyActivity', () => {
    it('POSTs message + recipient_ids and reshapes the reach summary', async () => {
        let method = '';
        let path = '';
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(
                `${BASE}/trips/:tripId/activities/:activityId/notify`,
                async ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    body = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(notifyActivityRawFixture);
                }
            )
        );
        const { result } = renderHookWithProviders(() => useNotifyActivity());

        await act(async () => {
            await result.current.mutateAsync({
                tripId: TRIP,
                activityId: ACTIVITY,
                message: 'See you there!',
                recipientIds: ['u1', 'u2'],
            });
        });

        await waitFor(() =>
            expect(result.current.data).toEqual({
                recipients: 4,
                inApp: 4,
                emails: 2,
                sms: 1,
            })
        );
        expect(method).toBe('POST');
        expect(path).toBe('/trips/trip-2/activities/act-7/notify');
        expect(body).toEqual({
            message: 'See you there!',
            recipient_ids: ['u1', 'u2'],
        });
    });

    it('omits message + recipient_ids for the default everyone fan-out', async () => {
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(
                `${BASE}/trips/:tripId/activities/:activityId/notify`,
                async ({ request }) => {
                    body = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(notifyActivityRawFixture);
                }
            )
        );
        const { result } = renderHookWithProviders(() => useNotifyActivity());

        await act(async () => {
            await result.current.mutateAsync({
                tripId: TRIP,
                activityId: ACTIVITY,
            });
        });

        await waitFor(() => expect(result.current.data).toBeDefined());
        expect(body).toEqual({});
    });

    it('surfaces a backend error', async () => {
        server.use(
            http.post(
                `${BASE}/trips/:tripId/activities/:activityId/notify`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useNotifyActivity());

        await act(async () => {
            await result.current
                .mutateAsync({ tripId: TRIP, activityId: ACTIVITY })
                .catch(() => undefined);
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
