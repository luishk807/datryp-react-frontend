import { diffDays, isValidDate } from "./date";
import { ACTIVITY_KIND } from "constants";
import type { MultipleDestinations, SingleDestination } from "types";

type CardData = SingleDestination | MultipleDestinations;

const days = (data: CardData) => data.intenaryDates ?? [];

/** Trip length — the real date span (start→end inclusive), falling back to
 *  the number of itinerary days when dates are missing. */
export const tripCardDays = (data: CardData): number => {
    if (isValidDate(data.startDate) && isValidDate(data.endDate)) {
        const span = diffDays(data.startDate, data.endDate) + 1;
        if (span >= 1) return span;
    }
    return days(data).length;
};

/** How many real places are on the itinerary (PLACE-kind activities; a
 *  missing kind reads as PLACE for legacy rows). Excludes notes / flights /
 *  ground transport / hotel rows. */
export const tripCardPlaces = (data: CardData): number => {
    let n = 0;
    for (const d of days(data)) {
        for (const a of d.activities ?? []) {
            if ((a.kind ?? ACTIVITY_KIND.PLACE) === ACTIVITY_KIND.PLACE) n += 1;
        }
    }
    return n;
};

/** Planning completeness for the card badge: the share of itinerary days
 *  that have at least one real (non-note) activity. A simple, honest "how
 *  filled in is this trip" signal computed straight from the card data. */
export const tripCardPlannedPercent = (data: CardData): number => {
    const ds = days(data);
    if (ds.length === 0) return 0;
    const filled = ds.filter((d) =>
        (d.activities ?? []).some((a) => a.kind !== ACTIVITY_KIND.NOTE),
    ).length;
    return Math.round((filled / ds.length) * 100);
};
