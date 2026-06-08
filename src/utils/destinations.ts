/**
 * Multi-destination range derivation.
 *
 * Implements the "the flight is the boundary" model: a destination runs from
 * its arrival (`startDate`) until the day before the NEXT destination begins,
 * and the final destination runs to the trip's end date. This is what lets the
 * timeline show one destination spanning several days without the user setting
 * an explicit end date per stop — the next destination's arrival defines it.
 */
import type { Destination } from 'types';
import { addDays, isBefore } from './date';

/**
 * Return `destinations` with each `endDate` filled from its successor's start
 * (last → trip end). The input array's ORDER is preserved so `destinationIndx`
 * routing (which keys on array position) stays valid — chronological neighbors
 * are resolved via a sorted copy. Destinations without a `startDate` are left
 * untouched.
 */
export const deriveDestinationRanges = (
    destinations: Destination[],
    tripEndDate?: string,
): Destination[] => {
    const order = destinations
        .filter((d) => d.startDate)
        .slice()
        .sort((a, b) => (isBefore(a.startDate, b.startDate) ? -1 : 1));

    const endById = new Map<number, string>();
    order.forEach((dest, i) => {
        const start = dest.startDate as string;
        const next = order[i + 1];
        let end: string;
        if (next?.startDate) {
            const dayBefore = addDays(next.startDate, -1);
            // Guard against a successor that starts on/before this one
            // (same-day or out-of-order) — never produce end < start.
            end = isBefore(dayBefore, start) ? start : dayBefore;
        } else if (tripEndDate && !isBefore(tripEndDate, start)) {
            end = tripEndDate;
        } else {
            end = dest.endDate ?? start;
        }
        endById.set(dest.id, end);
    });

    return destinations.map((d) =>
        endById.has(d.id) ? { ...d, endDate: endById.get(d.id) } : d,
    );
};
