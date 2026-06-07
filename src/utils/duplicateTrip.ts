/**
 * Build a fresh "Planning" copy of an existing trip, shifted to a new start
 * date. Used by the "Duplicate this trip" flow on /trip-detail (Completed /
 * Cancelled trips → a new editable draft re-seeded into TripContext).
 *
 * The shift is offset-based: every date moves by `newStart − originalStart`
 * whole days. Times (`HH:mm`) are deliberately NOT shifted, so a 10:00 flight
 * stays 10:00 and multi-day spans (a 3-night hotel, an overnight flight) keep
 * their duration. The copy is stripped of its backend identity (`apiId`) and
 * all payment attestation, and every status is reset to Planning so the new
 * trip starts clean.
 */
import { addDays, diffDays, now } from './date';
import { TRIP_STATUS } from 'constants';
import type {
    Activity,
    Destination,
    FlightInfo,
    TransitInfo,
    TripState,
    TripStatus,
} from 'types';

/** A minimal date range used for the overlap-conflict warning. */
export interface DuplicateTripRange {
    name: string;
    startDate: string;
    endDate: string;
}

export interface DuplicatePreviewDay {
    oldDate: string;
    newDate: string;
    activityCount: number;
}

export interface DuplicatePreview {
    newStartDate: string;
    newEndDate: string;
    days: DuplicatePreviewDay[];
}

/** Whole-day offset between the source start and the chosen new start. Zero
 *  when the source has no start date (nothing to anchor on — dates pass
 *  through unchanged). */
const offsetDays = (source: TripState, newStartDate: string): number =>
    source.startDate ? diffDays(source.startDate, newStartDate) : 0;

/** Shift a `YYYY-MM-DD` date by `offset` days, leaving blanks untouched. */
const shift = (value: string | undefined, offset: number): string | undefined =>
    value ? addDays(value, offset) : value;

const shiftFlightInfo = (
    f: FlightInfo | undefined,
    offset: number
): FlightInfo | undefined => {
    if (!f) return f;
    return {
        ...f,
        departDate: shift(f.departDate, offset),
        arrivalDate: shift(f.arrivalDate, offset),
        // A duplicated trip hasn't been paid for yet.
        paidAt: null,
        paidBy: null,
        segments: f.segments?.map((s) => ({
            ...s,
            departDate: shift(s.departDate, offset),
            arrivalDate: shift(s.arrivalDate, offset),
        })),
    };
};

const shiftTransit = (s: TransitInfo, offset: number): TransitInfo => ({
    ...s,
    departDate: shift(s.departDate, offset),
    arrivalDate: shift(s.arrivalDate, offset),
});

const resetActivity = (
    a: Activity,
    offset: number,
    planning: TripStatus
): Activity => ({
    ...a,
    status: { ...planning },
    paidAt: null,
    paidBy: null,
    flightSegments: a.flightSegments?.map((s) => ({
        ...s,
        departDate: shift(s.departDate, offset),
        arrivalDate: shift(s.arrivalDate, offset),
    })),
    transitSegments: a.transitSegments?.map((s) => shiftTransit(s, offset)),
});

const resetDestination = (
    dest: Destination,
    offset: number,
    planning: TripStatus
): Destination => ({
    ...dest,
    startDate: shift(dest.startDate, offset),
    endDate: shift(dest.endDate, offset),
    date: shift(dest.date, offset),
    flightInfo: shiftFlightInfo(dest.flightInfo, offset),
    itinerary: (dest.itinerary ?? []).map((day) => ({
        ...day,
        date: shift(day.date, offset) ?? day.date,
        activities: (day.activities ?? []).map((a) =>
            resetActivity(a, offset, planning)
        ),
    })),
});

/**
 * Produce a fresh, Planning-status copy of `source` anchored on `newStartDate`.
 * `planningStatus` should carry the real backend UUID (from `useTripStatuses`)
 * so the copy persists with a resolvable status; falls back to a name-only
 * status that the create-flow save resolves by name.
 */
export const duplicateTripState = (
    source: TripState,
    newStartDate: string,
    planningStatus?: TripStatus
): TripState => {
    const offset = offsetDays(source, newStartDate);
    const planning: TripStatus = planningStatus ?? {
        id: 0,
        name: TRIP_STATUS.PLANNING,
    };
    return {
        ...source,
        // Drop the backend identity so the save CREATEs a new trip instead of
        // UPDATEing the original. The /single|/multiple editor also clears a
        // stale apiId when the URL has no ?id=, but setting it here keeps the
        // seeded draft correct from the first render.
        apiId: undefined,
        name: `${(source.name ?? 'Trip').trim()} (Copy)`,
        startDate: shift(source.startDate, offset),
        endDate: shift(source.endDate, offset),
        status: { ...planning },
        destinations: (source.destinations ?? []).map((d) =>
            resetDestination(d, offset, planning)
        ),
    };
};

/** Flattened day-by-day preview of the shift, for the confirm modal's table. */
export const previewDuplicate = (
    source: TripState,
    newStartDate: string
): DuplicatePreview => {
    const offset = offsetDays(source, newStartDate);
    const days: DuplicatePreviewDay[] = [];
    for (const dest of source.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            days.push({
                oldDate: day.date,
                newDate: shift(day.date, offset) ?? day.date,
                activityCount: (day.activities ?? []).length,
            });
        }
    }
    days.sort((a, b) => (a.newDate < b.newDate ? -1 : a.newDate > b.newDate ? 1 : 0));
    return {
        newStartDate: shift(source.startDate, offset) ?? newStartDate,
        newEndDate: shift(source.endDate, offset) ?? newStartDate,
        days,
    };
};

/** True when the chosen copy starts before today (lexical ISO compare). */
export const startsInPast = (newStartDate: string): boolean =>
    !!newStartDate && newStartDate < now();

/** Active trips whose dates overlap the copy's [start, end] range. Overlap is
 *  inclusive: two ranges touch when each starts on or before the other ends. */
export const findTripConflicts = (
    newStart: string,
    newEnd: string,
    others: DuplicateTripRange[]
): DuplicateTripRange[] => {
    if (!newStart || !newEnd) return [];
    return others.filter(
        (o) =>
            o.startDate &&
            o.endDate &&
            newStart <= o.endDate &&
            o.startDate <= newEnd
    );
};
