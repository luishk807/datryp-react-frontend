/** Wire-shape fixture for `POST /me/trip-checkup/{tripId}`. The raw interfaces
 *  are private, so the shape is pinned locally. Exercises the three nested
 *  assessment reshapes plus the `quota.resets_at` → `resetsAt` rename. */
export const tripCheckupWireFixture = {
    score: 78,
    verdict: 'Solid',
    summary: 'A well-rounded plan with a couple of gaps to close.',
    strengths: ['Good budget headroom', 'Balanced daily pace'],
    gaps: ['No airport transfer booked', 'Day 3 is unplanned'],
    budget_assessment: {
        verdict: 'On track',
        why: 'Spend is 12% under your stated budget.',
        score: 82,
    },
    time_assessment: {
        verdict: 'Strong',
        why: 'Each day has a realistic number of activities.',
        score: 88,
    },
    activity_assessment: {
        verdict: 'Needs work',
        why: 'Two days lack any confirmed activity.',
        score: 61,
    },
    quota: {
        used: 2,
        cap: 5,
        remaining: 3,
        resets_at: '2026-07-11T00:00:00Z',
        window: 'day',
    },
} as const;
