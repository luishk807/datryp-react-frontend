import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { tripCheckupWireFixture } from '../../test/fixtures/tripCheckup';
import { useTripCheckup, tripCheckupKey } from './useTripCheckup';

const BASE = 'http://localhost:8000';
const TRIP = 'trip-9';

describe('tripCheckupKey', () => {
    it('namespaces the cache key by trip id', () => {
        expect(tripCheckupKey(TRIP)).toEqual(['me', 'trip-checkup', TRIP]);
    });
});

describe('useTripCheckup', () => {
    it('is disabled (no request) when the gate is closed', () => {
        const { result } = renderHookWithProviders(() =>
            useTripCheckup({ tripId: TRIP, enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('POSTs and reshapes the nested assessments when enabled', async () => {
        let method = '';
        let path = '';
        server.use(
            http.post(`${BASE}/me/trip-checkup/:id`, ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                return HttpResponse.json(tripCheckupWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useTripCheckup({ tripId: TRIP, enabled: true })
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(method).toBe('POST');
        expect(path).toBe('/me/trip-checkup/trip-9');
        expect(result.current.data).toMatchObject({
            score: 78,
            verdict: 'Solid',
            budgetAssessment: { verdict: 'On track', score: 82 },
            timeAssessment: { verdict: 'Strong', score: 88 },
            activityAssessment: { verdict: 'Needs work', score: 61 },
            quota: { resetsAt: '2026-07-11T00:00:00Z', window: 'day' },
        });
    });

    it('surfaces a backend error', async () => {
        server.use(
            http.post(
                `${BASE}/me/trip-checkup/:id`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useTripCheckup({ tripId: TRIP, enabled: true })
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
