import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { notifyActivityRawFixture } from 'test/fixtures/tripAlerts';
import { NotifyActivityResultWireContract } from 'test/contracts/tripAlerts.contract';
import { notifyActivityParticipants } from './tripAlertsApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = (tripId: string, activityId: string) =>
    `${API_BASE}/trips/${tripId}/activities/${activityId}/notify`;

describe('tripAlertsApi contract — POST /trips/{tripId}/activities/{activityId}/notify', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('raw wire fixture satisfies the contract', () => {
        expect(() =>
            NotifyActivityResultWireContract.parse(notifyActivityRawFixture)
        ).not.toThrow();
    });

    it('reshapes in_app → inApp, sends the bearer, and posts an empty body by default', async () => {
        let authHeader: string | null = null;
        let method: string | undefined;
        let body: unknown;
        server.use(
            http.post(url('trip-1', 'act-1'), async ({ request }) => {
                authHeader = request.headers.get('authorization');
                method = request.method;
                body = await request.json();
                return HttpResponse.json(notifyActivityRawFixture);
            })
        );
        const res = await notifyActivityParticipants('trip-1', 'act-1');
        expect(res).toEqual({ recipients: 4, inApp: 4, emails: 2, sms: 1 });
        expect(authHeader).toBe('Bearer test-token');
        expect(method).toBe('POST');
        // No message / recipientIds → the client omits both keys.
        expect(body).toEqual({});
    });

    it('includes message when provided', async () => {
        let body: unknown;
        server.use(
            http.post(url('trip-1', 'act-1'), async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(notifyActivityRawFixture);
            })
        );
        await notifyActivityParticipants('trip-1', 'act-1', 'Meet at 9am');
        expect(body).toEqual({ message: 'Meet at 9am' });
    });

    it('includes recipient_ids (snake_case) when the organizer narrows the list', async () => {
        let body: unknown;
        server.use(
            http.post(url('trip-1', 'act-1'), async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(notifyActivityRawFixture);
            })
        );
        await notifyActivityParticipants('trip-1', 'act-1', 'Hi', [
            'u1',
            'u2',
        ]);
        expect(body).toEqual({
            message: 'Hi',
            recipient_ids: ['u1', 'u2'],
        });
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.post(url('trip-1', 'act-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(notifyActivityRawFixture);
            })
        );
        await notifyActivityParticipants('trip-1', 'act-1');
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.post(url('trip-1', 'act-1'), () =>
                HttpResponse.json(
                    { detail: 'Only the organizer can notify' },
                    { status: 403, statusText: 'Forbidden' }
                )
            )
        );
        await expect(
            notifyActivityParticipants('trip-1', 'act-1')
        ).rejects.toThrow(
            'notify activity participants 403 Forbidden — Only the organizer can notify'
        );
    });

    it('throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.post(
                url('trip-1', 'act-1'),
                () => new HttpResponse('boom', { status: 404 })
            )
        );
        await expect(
            notifyActivityParticipants('trip-1', 'act-1')
        ).rejects.toThrow('notify activity participants 404');
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = { ...notifyActivityRawFixture } as Record<
            string,
            unknown
        >;
        delete missing.in_app;
        expect(() =>
            NotifyActivityResultWireContract.parse(missing)
        ).toThrow();
        expect(() =>
            NotifyActivityResultWireContract.parse({
                ...notifyActivityRawFixture,
                inApp: 4,
            })
        ).toThrow();
        expect(() =>
            NotifyActivityResultWireContract.parse({
                ...notifyActivityRawFixture,
                sms: '1',
            })
        ).toThrow();
    });
});
