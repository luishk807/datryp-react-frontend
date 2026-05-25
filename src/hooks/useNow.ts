import { useEffect, useState } from 'react';

/**
 * Returns a live "now" Date that re-renders the consumer every
 * `intervalMs` (default 30s). Used by activity cards to compute
 * "happening now / past / upcoming" state without pulling a full
 * date library — `Date.now()` is fine, we just need a render trigger
 * on a regular cadence.
 *
 * 30s is the cheap default: enough granularity for an itinerary view
 * (where activities span hours) without thrashing render. Pass a
 * shorter interval (e.g. 5000) for surfaces that need finer-grained
 * progress (a stopwatch-style bar).
 */
export const useNow = (intervalMs = 30_000): Date => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const handle = window.setInterval(() => {
            setNow(new Date());
        }, intervalMs);
        return () => window.clearInterval(handle);
    }, [intervalMs]);

    return now;
};
