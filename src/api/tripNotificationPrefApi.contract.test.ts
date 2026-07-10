import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    tripNotificationPrefFixture,
    tripNotificationPrefNullFixture,
} from 'test/fixtures/tripNotificationPref';
import { TripNotificationPrefContract } from 'test/contracts/tripNotificationPref.contract';
import {
    getTripNotificationPref,
    setTripNotificationPref,
} from './tripNotificationPrefApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = (tripId: string) =>
    `${API_BASE}/trips/${tripId}/notification-pref`;

describe('tripNotificationPrefApi contract — /trips/{tripId}/notification-pref', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            TripNotificationPrefContract.parse(tripNotificationPrefFixture)
        ).not.toThrow();
        expect(() =>
            TripNotificationPrefContract.parse(tripNotificationPrefNullFixture)
        ).not.toThrow();
    });

    it('getTripNotificationPref GETs the pref, parses the contract, and sends the bearer', async () => {
        let authHeader: string | null = null;
        let method: string | undefined;
        server.use(
            http.get(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                method = request.method;
                return HttpResponse.json(tripNotificationPrefFixture);
            })
        );
        const res = await getTripNotificationPref('trip-1');
        expect(() => TripNotificationPrefContract.parse(res)).not.toThrow();
        expect(res.channel).toBe('both');
        expect(authHeader).toBe('Bearer test-token');
        expect(method).toBe('GET');
    });

    it('setTripNotificationPref PUTs the channel and returns the parsed contract', async () => {
        let method: string | undefined;
        let body: unknown;
        server.use(
            http.put(url('trip-1'), async ({ request }) => {
                method = request.method;
                body = await request.json();
                return HttpResponse.json(tripNotificationPrefFixture);
            })
        );
        const res = await setTripNotificationPref('trip-1', 'both');
        expect(() => TripNotificationPrefContract.parse(res)).not.toThrow();
        expect(method).toBe('PUT');
        expect(body).toEqual({ channel: 'both' });
    });

    it('sends { channel: null } when clearing the override', async () => {
        let body: unknown;
        server.use(
            http.put(url('trip-1'), async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(tripNotificationPrefNullFixture);
            })
        );
        const res = await setTripNotificationPref('trip-1', null);
        expect(body).toEqual({ channel: null });
        expect(res.channel).toBeNull();
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(tripNotificationPrefNullFixture);
            })
        );
        await getTripNotificationPref('trip-1');
        expect(authHeader).toBeNull();
    });

    it('getTripNotificationPref throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(url('trip-1'), () =>
                HttpResponse.json(
                    { detail: 'Not a trip member' },
                    { status: 403, statusText: 'Forbidden' }
                )
            )
        );
        await expect(getTripNotificationPref('trip-1')).rejects.toThrow(
            'get trip notification pref 403 Forbidden — Not a trip member'
        );
    });

    it('setTripNotificationPref throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.put(
                url('trip-1'),
                () => new HttpResponse('boom', { status: 402 })
            )
        );
        await expect(
            setTripNotificationPref('trip-1', 'sms')
        ).rejects.toThrow('set trip notification pref 402');
    });

    it('contract catches drift (extra / wrong enum value / wrong type)', () => {
        expect(() =>
            TripNotificationPrefContract.parse({ channel: 'both', extra: 1 })
        ).toThrow();
        expect(() =>
            TripNotificationPrefContract.parse({ channel: 'telegram' })
        ).toThrow();
        expect(() =>
            TripNotificationPrefContract.parse({ channel: 5 })
        ).toThrow();
    });
});
