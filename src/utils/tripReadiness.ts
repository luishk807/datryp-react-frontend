import { ACTIVITY_KIND } from "constants";
import type { FlightInfo, TripState } from "types";

const TRANSPORT_ACTIVITY_KINDS: string[] = [
    ACTIVITY_KIND.FLIGHT,
    ACTIVITY_KIND.TRAIN,
    ACTIVITY_KIND.BUS,
    ACTIVITY_KIND.RENTAL_CAR,
];

/** A destination's `flightInfo` band is only "filled" once it carries real
 *  transport detail — an empty object shouldn't pass for "transport added". */
const hasFlightContent = (f?: FlightInfo): boolean =>
    !!f &&
    Boolean(
        f.flightNumber ||
            f.carrier ||
            f.departAirport ||
            f.arrivalAirport ||
            f.departDate,
    );

const toNumber = (v?: string | number): number => {
    if (v == null) return 0;
    const n = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

export interface ReadinessCheck {
    key: string;
    label: string;
    ok: boolean;
}

export interface TripReadiness {
    /** 0–100 "ready to confirm" score, derived deterministically from the
     *  trip data (no AI) so it always agrees with the checklist below it. */
    percent: number;
    /** The four headline requirements, each pass/fail. */
    checks: ReadinessCheck[];
    /** 1-based global day numbers (counted across every destination's
     *  itinerary, in order) that have no real activity — surfaced as
     *  "Day N has free time". */
    freeDays: number[];
}

// Headline-requirement weights. The remaining slice is earned by how many
// itinerary days are actually filled (graded, not pass/fail) so a single
// empty day dents the score without tanking it.
const W_LODGING = 25;
const W_ACTIVITIES = 25;
const W_BUDGET = 20;
const W_TRANSPORT = 20;
const W_FREEDAYS = 10;

export const deriveTripReadiness = (data: TripState): TripReadiness => {
    const destinations = data.destinations ?? [];

    let hasLodging = false;
    let hasTransport = false;
    let realActivityCount = 0;
    let dayCount = 0;
    const freeDays: number[] = [];

    destinations.forEach((dest) => {
        if (hasFlightContent(dest.flightInfo)) hasTransport = true;
        dest.itinerary?.forEach((day) => {
            dayCount += 1;
            let dayReal = 0;
            day.activities?.forEach((a) => {
                if (a.kind === ACTIVITY_KIND.NOTE) return;
                dayReal += 1;
                realActivityCount += 1;
                if (a.kind === ACTIVITY_KIND.HOTEL_CHECKIN) hasLodging = true;
                if (a.kind && TRANSPORT_ACTIVITY_KINDS.includes(a.kind)) {
                    hasTransport = true;
                }
            });
            if (dayReal === 0) freeDays.push(dayCount);
        });
    });

    const budgetSet = toNumber(data.budget) > 0;
    const hasActivities = realActivityCount > 0;

    const checks: ReadinessCheck[] = [
        {
            key: "lodging",
            label: hasLodging ? "Lodging added" : "Lodging missing",
            ok: hasLodging,
        },
        {
            key: "activities",
            label: hasActivities
                ? "Daily activities added"
                : "No activities added yet",
            ok: hasActivities,
        },
        {
            key: "budget",
            label: budgetSet ? "Budget set" : "Budget not set",
            ok: budgetSet,
        },
        {
            key: "transport",
            label: hasTransport ? "Transportation added" : "Transportation missing",
            ok: hasTransport,
        },
    ];

    const filledFraction =
        dayCount > 0 ? (dayCount - freeDays.length) / dayCount : 0;
    const earned =
        (hasLodging ? W_LODGING : 0) +
        (hasActivities ? W_ACTIVITIES : 0) +
        (budgetSet ? W_BUDGET : 0) +
        (hasTransport ? W_TRANSPORT : 0) +
        W_FREEDAYS * filledFraction;
    const percent = Math.max(0, Math.min(100, Math.round(earned)));

    return { percent, checks, freeDays };
};
