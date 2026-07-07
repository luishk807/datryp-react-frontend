/**
 * "Past Due" is a DERIVED, read-time state — a Planning trip whose end date has
 * already passed. It is never persisted: the trip stays `Planning` in the DB
 * and these helpers recompute the state on every read (so shifting the dates
 * into the future silently clears it, and "Continue planning" is a true no-op).
 *
 * This deliberately mirrors the backend's auto-complete-on-time-passed pattern
 * (see itineraries.py), which derives `Completed` for CONFIRMED trips the same
 * way. Confirmed trips auto-complete, so they're never "past due" — only
 * Planning trips, which were never confirmed and so shouldn't be silently
 * transitioned, surface this nudge instead.
 */
import { TRIP_STATUS } from "constants";
import type { TripState } from "types";
import { diffDays, isValidDate } from "./date";

const statusNameOf = (status: TripState["status"]): string => {
    if (status && typeof status === "object" && status.name) return status.name;
    return TRIP_STATUS.PLANNING;
};

/** Whole days since the trip's end date passed. `0` or negative = not over yet
 *  (or no valid end date). Positive = the trip ended N days ago. */
export const tripEndedDaysAgo = (
    trip: Pick<TripState, "endDate">,
): number => (isValidDate(trip.endDate) ? diffDays(trip.endDate, new Date()) : 0);

/** A still-Planning trip whose end date has already passed. Drives the
 *  ⚠ Past due activity chip + the "Trip ended" planning-box header. */
export const isTripPastDue = (
    trip: Pick<TripState, "status" | "endDate">,
): boolean =>
    statusNameOf(trip.status) === TRIP_STATUS.PLANNING &&
    tripEndedDaysAgo(trip) > 0;
