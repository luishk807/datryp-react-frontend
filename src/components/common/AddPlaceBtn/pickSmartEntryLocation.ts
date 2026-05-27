/**
 * Pick the best "starting point" for the place smart-entry search,
 * based on what the trip already contains around the current
 * date-block. Tightening the bias from "the trip's country" down to
 * "near where the user actually is on this day" gives the search
 * back relevant matches (a Google Places lookup with the user's
 * hotel as context beats a country-wide search 9 times out of 10).
 *
 * Priority chain (first hit wins):
 *   1. Last activity ON the current date that has an address
 *      (whether it's a place, hotel, restaurant — most recent
 *      anchor wins).
 *   2. Hotel ON the current date (if rule 1 missed but a hotel
 *      exists without a textual address).
 *   3. Hotel on the most recent PRIOR date block — the user is
 *      likely still staying there. Walks backwards from today.
 *      Deliberately ignores non-hotel activities here: a museum on
 *      day 3 isn't where the user wakes up on day 4.
 *   4. Arrival airport of the most recent flight — gives a rough
 *      city anchor when no hotel has been added yet.
 *   5. Fallback: the trip's country (existing behavior).
 *
 * Returns a free-text location string the smart-entry search can
 * append to its query, or `undefined` when nothing better than
 * `fallbackCountry` is available.
 */
import { ACTIVITY_KIND } from 'constants';
import type { Activity, ItineraryDay } from 'types';
import type { Destination } from 'types';

const isHotel = (a: Activity): boolean =>
    a.kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
    a.kind === ACTIVITY_KIND.HOTEL_CHECKOUT;

const isFlight = (a: Activity): boolean => a.kind === ACTIVITY_KIND.FLIGHT;

const addressOf = (a: Activity): string | undefined => {
    const loc = a.location?.trim();
    if (loc) return loc;
    // Fall back to structured city/country if the free-text location
    // is blank (smart-entry-picked places land here when no street
    // address is known yet).
    const parts = [a.placeCity, a.placeCountry]
        .map((p) => p?.trim())
        .filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
};

interface PickArgs {
    destinations: Destination[];
    /** ISO YYYY-MM-DD or MM/DD/YYYY date string of the day-block the
     *  user opened "+ Add activity" from. */
    currentDate: string | undefined;
    /** Country fallback when nothing tighter is available. */
    fallbackCountry?: string;
    /** Activity id to skip when scanning the current day — used by the
     *  directions link so the origin doesn't end up being the same
     *  activity the user just clicked. */
    excludeActivityId?: number;
}

export const pickSmartEntryLocation = ({
    destinations,
    currentDate,
    fallbackCountry,
    excludeActivityId,
}: PickArgs): string | undefined => {
    // Flatten all itinerary days across destinations into a single
    // chronological list — multi-destination trips still want the
    // walk to consider hotels / flights from any leg.
    const allDays: ItineraryDay[] = [];
    for (const dest of destinations) {
        for (const day of dest.itinerary ?? []) {
            if (day?.date) allDays.push(day);
        }
    }
    allDays.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const fallback = fallbackCountry?.trim() || undefined;
    if (!currentDate || !allDays.length) return fallback;

    const currentIdx = allDays.findIndex((d) => d.date === currentDate);
    if (currentIdx === -1) return fallback;

    const currentDay = allDays[currentIdx];

    // Rule 1: most recent activity on the current day with an address.
    // Skip the calling activity itself (set via excludeActivityId)
    // so the directions origin never resolves to the destination.
    const todays = currentDay.activities ?? [];
    for (let i = todays.length - 1; i >= 0; i--) {
        if (
            excludeActivityId !== undefined &&
            todays[i].id === excludeActivityId
        ) {
            continue;
        }
        const addr = addressOf(todays[i]);
        if (addr) return addr;
    }

    // Rule 2: any hotel on the current day (defensive — addressOf
    // above will usually have caught hotels, but a hotel saved
    // without a location string would fall through to here).
    const todaysHotel = todays.find(
        (a) =>
            isHotel(a) &&
            (excludeActivityId === undefined || a.id !== excludeActivityId),
    );
    if (todaysHotel?.name?.trim()) {
        return todaysHotel.name.trim();
    }

    // Rule 3: walk PRIOR days backwards for the most recent hotel.
    // Deliberately scoped to hotels — a museum on day 3 isn't the
    // anchor for day 4. Hotel CHECK-IN is preferred since CHECK-OUT
    // means the user moved on.
    for (let d = currentIdx - 1; d >= 0; d--) {
        const acts = allDays[d].activities ?? [];
        for (let i = acts.length - 1; i >= 0; i--) {
            const a = acts[i];
            if (a.kind === ACTIVITY_KIND.HOTEL_CHECKIN) {
                const addr = addressOf(a) ?? a.name?.trim();
                if (addr) return addr;
            }
        }
    }

    // Rule 4: most recent flight's arrival airport (today or prior).
    for (let d = currentIdx; d >= 0; d--) {
        const acts = allDays[d].activities ?? [];
        for (let i = acts.length - 1; i >= 0; i--) {
            const a = acts[i];
            if (isFlight(a) && a.flightSegments?.length) {
                const lastSeg = a.flightSegments[a.flightSegments.length - 1];
                const arr = lastSeg?.arrivalAirport?.trim();
                if (arr) return arr;
            }
        }
    }

    // Rule 5: trip country fallback.
    return fallback;
};
