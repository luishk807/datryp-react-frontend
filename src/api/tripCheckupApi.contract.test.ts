import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { tripCheckupWireFixture } from 'test/fixtures/tripCheckup';
import { TripCheckupWireContract } from 'test/contracts/tripCheckup.contract';
import { fetchTripCheckup, TripCheckupBackendError } from './tripCheckupApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = (id: string) =>
    `${API_BASE}/me/trip-checkup/${encodeURIComponent(id)}`;

// Contract tests for the trip-checkup boundary: drive the REAL client through
// MSW so the bearer token, POST + empty-object body, the nested assessment +
// quota reshape, and every TripCheckupBackendError branch are exercised.
describe('tripCheckupApi contract — POST /me/trip-checkup/{tripId}', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('wire fixture satisfies the contract', () => {
        expect(() =>
            TripCheckupWireContract.parse(tripCheckupWireFixture)
        ).not.toThrow();
    });

    it('reshapes nested assessments + quota, sends bearer + POST + empty-object body', async () => {
        let authHeader: string | null = null;
        let contentType: string | null = null;
        let method: string | undefined;
        let body: string | undefined;
        server.use(
            http.post(url('trip-1'), async ({ request }) => {
                authHeader = request.headers.get('authorization');
                contentType = request.headers.get('content-type');
                method = request.method;
                body = await request.text();
                return HttpResponse.json(tripCheckupWireFixture);
            })
        );
        const result = await fetchTripCheckup('trip-1');
        expect(authHeader).toBe('Bearer test-token');
        expect(method).toBe('POST');
        expect(contentType).toContain('application/json');
        expect(body).toBe('{}');
        expect(result).toEqual({
            score: 78,
            verdict: 'Solid',
            summary: 'A well-rounded plan with a couple of gaps to close.',
            strengths: ['Good budget headroom', 'Balanced daily pace'],
            gaps: ['No airport transfer booked', 'Day 3 is unplanned'],
            budgetAssessment: {
                verdict: 'On track',
                why: 'Spend is 12% under your stated budget.',
                score: 82,
            },
            timeAssessment: {
                verdict: 'Strong',
                why: 'Each day has a realistic number of activities.',
                score: 88,
            },
            activityAssessment: {
                verdict: 'Needs work',
                why: 'Two days lack any confirmed activity.',
                score: 61,
            },
            quota: {
                used: 2,
                cap: 5,
                remaining: 3,
                resetsAt: '2026-07-11T00:00:00Z',
                window: 'day',
            },
        });
    });

    it('maps a null quota.resets_at → resetsAt null', async () => {
        server.use(
            http.post(url('trip-1'), () =>
                HttpResponse.json({
                    ...tripCheckupWireFixture,
                    quota: { ...tripCheckupWireFixture.quota, resets_at: null },
                })
            )
        );
        const result = await fetchTripCheckup('trip-1');
        expect(result.quota.resetsAt).toBeNull();
    });

    it('URL-encodes the trip id in the path', async () => {
        let path: string | undefined;
        server.use(
            http.post(url('a/b c'), ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json(tripCheckupWireFixture);
            })
        );
        await fetchTripCheckup('a/b c');
        expect(path).toBe('/me/trip-checkup/a%2Fb%20c');
    });

    it('throws TripCheckupBackendError with a string detail (kind null)', async () => {
        server.use(
            http.post(url('trip-1'), () =>
                HttpResponse.json({ detail: 'Trip not found' }, { status: 404 })
            )
        );
        await expect(fetchTripCheckup('trip-1')).rejects.toMatchObject({
            name: 'TripCheckupBackendError',
            message: 'Trip not found',
            status: 404,
            kind: null,
        });
    });

    it('extracts kind + message from a structured detail object', async () => {
        server.use(
            http.post(url('trip-1'), () =>
                HttpResponse.json(
                    {
                        detail: {
                            kind: 'trip_checkup_pro',
                            message: 'Upgrade to Pro',
                        },
                    },
                    { status: 402 }
                )
            )
        );
        let err: unknown;
        try {
            await fetchTripCheckup('trip-1');
        } catch (e) {
            err = e;
        }
        expect(err).toBeInstanceOf(TripCheckupBackendError);
        const be = err as TripCheckupBackendError;
        expect(be.kind).toBe('trip_checkup_pro');
        expect(be.message).toBe('Upgrade to Pro');
        expect(be.status).toBe(402);
    });

    it('keeps kind but falls back to the default message when detail has kind only', async () => {
        server.use(
            http.post(url('trip-1'), () =>
                HttpResponse.json(
                    { detail: { kind: 'trip_checkup_pro' } },
                    { status: 402 }
                )
            )
        );
        await expect(fetchTripCheckup('trip-1')).rejects.toMatchObject({
            message: 'Trip checkup failed (402)',
            status: 402,
            kind: 'trip_checkup_pro',
        });
    });

    it('falls back to a generic message + null kind on a non-object detail', async () => {
        server.use(
            http.post(url('trip-1'), () =>
                HttpResponse.json({ detail: 123 }, { status: 409 })
            )
        );
        await expect(fetchTripCheckup('trip-1')).rejects.toMatchObject({
            message: 'Trip checkup failed (409)',
            status: 409,
            kind: null,
        });
    });

    it('falls back to a generic message + null kind on a non-JSON error body', async () => {
        server.use(
            http.post(
                url('trip-1'),
                () => new HttpResponse('gateway down', { status: 502 })
            )
        );
        await expect(fetchTripCheckup('trip-1')).rejects.toMatchObject({
            message: 'Trip checkup failed (502)',
            status: 502,
            kind: null,
        });
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        expect(() => TripCheckupWireContract.parse({})).toThrow();
        expect(() =>
            TripCheckupWireContract.parse({
                ...tripCheckupWireFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            TripCheckupWireContract.parse({
                ...tripCheckupWireFixture,
                budget_assessment: {
                    ...tripCheckupWireFixture.budget_assessment,
                    score: 'high',
                },
            })
        ).toThrow();
    });
});
