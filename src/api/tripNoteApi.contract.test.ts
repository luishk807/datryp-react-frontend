import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { tripNoteFixture, tripNoteNullFixture } from 'test/fixtures/tripNote';
import { TripNoteContract } from 'test/contracts/tripNote.contract';
import { setTripNote } from './tripNoteApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = (tripId: string) => `${API_BASE}/me/trip-note/${tripId}`;

describe('tripNoteApi contract — PUT /me/trip-note/{tripId}', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixtures satisfy the wire contract', () => {
        expect(() => TripNoteContract.parse(tripNoteFixture)).not.toThrow();
        expect(() => TripNoteContract.parse(tripNoteNullFixture)).not.toThrow();
    });

    it('setTripNote returns a payload that satisfies the contract + sends bearer + body', async () => {
        let authHeader: string | null = null;
        let method: string | undefined;
        let body: unknown;
        server.use(
            http.put(url('trip-1'), async ({ request }) => {
                authHeader = request.headers.get('authorization');
                method = request.method;
                body = await request.json();
                return HttpResponse.json(tripNoteFixture);
            })
        );
        const res = await setTripNote('trip-1', 'We had a blast in Tokyo.');
        expect(() => TripNoteContract.parse(res)).not.toThrow();
        expect(res.note).toBe(tripNoteFixture.note);
        expect(authHeader).toBe('Bearer test-token');
        expect(method).toBe('PUT');
        expect(body).toEqual({ note: 'We had a blast in Tokyo.' });
    });

    it('sends { note: null } when clearing the note', async () => {
        let body: unknown;
        server.use(
            http.put(url('trip-1'), async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(tripNoteNullFixture);
            })
        );
        const res = await setTripNote('trip-1', null);
        expect(body).toEqual({ note: null });
        expect(res.note).toBeNull();
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.put(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(tripNoteFixture);
            })
        );
        await setTripNote('trip-1', 'hi');
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.put(url('trip-1'), () =>
                HttpResponse.json(
                    { detail: 'Only the organizer can edit the note' },
                    { status: 403, statusText: 'Forbidden' }
                )
            )
        );
        await expect(setTripNote('trip-1', 'x')).rejects.toThrow(
            'set trip note 403 Forbidden — Only the organizer can edit the note'
        );
    });

    it('throws without a detail suffix when the error body is not JSON', async () => {
        server.use(
            http.put(
                url('trip-1'),
                () => new HttpResponse('nope', { status: 500 })
            )
        );
        await expect(setTripNote('trip-1', 'x')).rejects.toThrow(
            'set trip note 500'
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        expect(() => TripNoteContract.parse({})).toThrow();
        expect(() =>
            TripNoteContract.parse({ ...tripNoteFixture, extra: 1 })
        ).toThrow();
        expect(() => TripNoteContract.parse({ note: 42 })).toThrow();
    });
});
