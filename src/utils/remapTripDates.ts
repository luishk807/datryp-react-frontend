/**
 * Re-align a single-destination trip's itinerary days to its (possibly
 * changed) startDate / endDate so activities are never orphaned when the
 * user shifts the trip's dates in the basic-info editor.
 *
 * The day list is treated as an ordered sequence: the Nth existing day maps
 * to the Nth date in [startDate .. endDate], carrying its id + activities.
 * Extra dates become empty days; if the new range is shorter than the old
 * one, surplus trailing days (and their activities) are dropped — but that's
 * an explicit range shrink, not the silent loss this guards against when the
 * whole trip is simply moved to later dates.
 *
 * Multi-destination trips are returned unchanged: their days carry per-day
 * country / flight data and sub-ranges that a flat positional remap would
 * corrupt. The basic-info modal can't edit a multi trip's destinations, so
 * date-only edits there are the single-destination case in practice.
 */
import type { ItineraryDay, TripState } from 'types';
import { addDays, formatDate } from './date';
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

export const remapTripDatesToRange = (trip: TripState): TripState => {
    const { startDate, endDate } = trip;
    if (!startDate || !endDate) return trip;

    // Multi-destination days are country/sub-range bound — don't touch them.
    if (trip.type?.id === TRIP_BASIC.MULTIPLE.id) return trip;

    const dest = trip.destinations?.[0];
    if (!dest) return trip;

    const dateList = enumerateDates(startDate, endDate);
    if (!dateList.length) return trip;

    // Existing days in chronological order so position N is the Nth day.
    const oldDays = [...(dest.itinerary ?? [])].sort((a, b) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    );

    const newItinerary: ItineraryDay[] = dateList.map((date, i) => {
        const src = oldDays[i];
        // Reuse the existing day (keeping its id + activities) on the new
        // date; pad with an empty day when the range grew.
        return src
            ? { ...src, date }
            : { id: Date.now() + i, date, activities: [] };
    });

    return {
        ...trip,
        destinations: [{ ...dest, itinerary: newItinerary }],
    };
};
