/**
 * "Shift dates" engine — move a whole trip to new dates without recreating it.
 *
 * Two categories of itinerary item behave differently, deliberately:
 *
 *  - FLEXIBLE (place / note / generic ride): things the traveller *plans* to
 *    do. They carry only day-relative `HH:mm` times, so moving their day moves
 *    them for free — nothing to rewrite.
 *
 *  - RESERVATION (flight / hotel / train / bus / rental car): real-world
 *    bookings with confirmation numbers, tied to a specific date. We do NOT
 *    blindly rewrite their booked date — a flight isn't rebooked by dragging a
 *    slider. Instead the trip's structural dates move around them, leaving the
 *    booking on its original date so it surfaces as "needs rescheduling"
 *    (`reservationNeedsReschedule`) until the traveller rebooks for real.
 *
 * The mismatch persists through a save: day-level flight/transit legs store
 * their own `departDate` independent of the day (see tripMapper
 * `activityToInput`), so a flight booked Jul 4 stays Jul 4 even after its day
 * moves to Jul 20 — and the derived flag needs no persisted column.
 */
import { ACTIVITY_KIND } from "constants";
import type { Activity, TripState } from "types";
import { addDays, formatDate } from "./date";

/** Bookings tied to a real date/confirmation that a blind shift would
 *  invalidate. Everything else is "flexible" and just follows its day. */
export const RESERVATION_KINDS: readonly string[] = [
    ACTIVITY_KIND.FLIGHT,
    ACTIVITY_KIND.HOTEL_CHECKIN,
    ACTIVITY_KIND.HOTEL_CHECKOUT,
    ACTIVITY_KIND.TRAIN,
    ACTIVITY_KIND.BUS,
    ACTIVITY_KIND.RENTAL_CAR,
];

export const isReservationKind = (kind?: string): boolean =>
    !!kind && RESERVATION_KINDS.includes(kind);

/** The absolute departure date a reservation is *booked* for, if it carries
 *  one. Flights/transit hold it on their first segment; hotels have none —
 *  their date IS the day they sit on, so they move cleanly with no stale
 *  booking to flag. Returns undefined when there's nothing to compare. */
export const reservationBookedDate = (a: Activity): string | undefined => {
    if (a.kind === ACTIVITY_KIND.FLIGHT) {
        return a.flightSegments?.[0]?.departDate || undefined;
    }
    if (
        a.kind === ACTIVITY_KIND.TRAIN ||
        a.kind === ACTIVITY_KIND.BUS ||
        a.kind === ACTIVITY_KIND.RENTAL_CAR
    ) {
        return a.transitSegments?.[0]?.departDate || undefined;
    }
    return undefined;
};

/** A reservation reads as "needs rescheduling" once the trip has been shifted
 *  away from its booked date — its segment `departDate` no longer matches the
 *  day it now sits on. Derived at read time (no persisted flag), like
 *  `isTripPastDue`; self-clears once the traveller rebooks onto the new date. */
export const reservationNeedsReschedule = (
    a: Activity,
    dayDate: string | undefined,
): boolean => {
    const booked = reservationBookedDate(a);
    return !!booked && !!dayDate && formatDate(booked) !== formatDate(dayDate);
};

export interface ShiftImpactItem {
    name: string;
    kind: string;
}

export interface ShiftImpact {
    /** Count of flexible activities that move automatically (place/note/ride). */
    flexibleCount: number;
    /** Reservations the traveller will need to re-verify / rebook. */
    reservations: ShiftImpactItem[];
}

/** Summarise what a shift does to a trip: how many items move cleanly vs which
 *  reservations need the traveller's attention. Drives the modal preview. */
export const classifyShiftImpact = (trip: TripState): ShiftImpact => {
    let flexibleCount = 0;
    const reservations: ShiftImpactItem[] = [];
    for (const dest of trip.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            for (const a of day.activities ?? []) {
                const kind = a.kind ?? ACTIVITY_KIND.PLACE;
                if (isReservationKind(kind)) {
                    reservations.push({
                        name: a.name?.trim() || kind,
                        kind,
                    });
                } else if (kind !== ACTIVITY_KIND.NOTE) {
                    flexibleCount += 1;
                }
            }
        }
    }
    return { flexibleCount, reservations };
};

/**
 * Shift an entire trip by `deltaDays`, preserving every relative gap. Moves the
 * trip range, each destination's range, and every itinerary day. Flexible
 * activities ride along on their day. Reservation BOOKING dates
 * (flight/transit `departDate`/`arrivalDate`, `dest.flightInfo`) are left
 * untouched on purpose — see the module comment. A uniform delta has none of
 * the re-fit ambiguity `remapTripDatesToRange` guards against, so this handles
 * single- AND multi-destination trips.
 */
export const shiftTripDates = (
    trip: TripState,
    deltaDays: number,
): TripState => {
    if (!deltaDays) return trip;
    const bump = (d?: string): string | undefined =>
        d ? addDays(d, deltaDays) : d;
    return {
        ...trip,
        startDate: bump(trip.startDate),
        endDate: bump(trip.endDate),
        destinations: (trip.destinations ?? []).map((dest) => ({
            ...dest,
            startDate: bump(dest.startDate),
            endDate: bump(dest.endDate),
            date: bump(dest.date),
            itinerary: (dest.itinerary ?? []).map((day) => ({
                ...day,
                date: addDays(day.date, deltaDays),
            })),
        })),
    };
};
