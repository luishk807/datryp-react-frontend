/**
 * Re-align a single-destination trip's itinerary days when the user edits
 * the trip's dates, so activities are never orphaned.
 *
 * Two motions, composed:
 *  1. SHIFT — every existing day moves by the same delta as the start date
 *     (newStart − oldStart). Moving the trip to later dates carries all its
 *     activities along, preserving the day structure (and any gaps).
 *  2. FIT — the shifted days are then matched, by date, onto the new
 *     [startDate .. endDate] range. Dates with no shifted day become empty
 *     days (the range was extended via the end date); shifted days that fall
 *     outside the new range are dropped (the range was shortened via the end
 *     date — an explicit shrink, not silent loss).
 *
 * When only the start moved and the end was shifted with it (duration
 * unchanged), every shifted day lands exactly on a new date — nothing is
 * added or lost. Multi-destination trips are returned unchanged: their days
 * carry per-day country / flight data a flat remap would corrupt, and the
 * basic-info modal can't edit a multi trip's destinations anyway.
 */
import type { ItineraryDay, TripState } from 'types';
import { addDays, diffDays, formatDate } from './date';
import { TRIP_BASIC } from 'constants';

/** Inclusive list of `YYYY-MM-DD` dates from start to end. Guarded at one
 *  year so a malformed/inverted range can't spin. */
const enumerateDates = (start: string, end: string): string[] => {
    const out: string[] = [];
    let cur = formatDate(start);
    const last = formatDate(end);
    if (cur > last) return [cur]; // inverted — treat as a single day
    for (let guard = 0; guard < 366; guard++) {
        out.push(cur);
        if (cur === last) break;
        cur = addDays(cur, 1);
    }
    return out;
};

export const remapTripDatesToRange = (
    trip: TripState,
    oldStartDate: string | undefined
): TripState => {
    const { startDate, endDate } = trip;
    if (!startDate || !endDate) return trip;

    // Multi-destination days are country/sub-range bound — don't touch them.
    if (trip.type?.id === TRIP_BASIC.MULTIPLE.id) return trip;

    const dest = trip.destinations?.[0];
    if (!dest) return trip;

    const dateList = enumerateDates(startDate, endDate);
    if (!dateList.length) return trip;

    // 1) SHIFT every existing day by the start delta so the trip moves as a
    //    whole (no-op when the start didn't change / there's no prior start).
    const delta = oldStartDate ? diffDays(oldStartDate, startDate) : 0;
    const shifted = (dest.itinerary ?? []).map((day) => ({
        ...day,
        date: delta ? addDays(day.date, delta) : formatDate(day.date),
    }));
    const byDate = new Map(shifted.map((day) => [day.date, day]));

    // 2) FIT the shifted days onto the new range, matching by date. Missing
    //    dates pad as empty days; days outside the range fall away.
    const newItinerary: ItineraryDay[] = dateList.map((date, i) => {
        const src = byDate.get(date);
        return src ?? { id: Date.now() + i, date, activities: [] };
    });

    return {
        ...trip,
        destinations: [{ ...dest, itinerary: newItinerary }],
    };
};
