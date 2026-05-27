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
import { isSameDay } from 'utils';
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
    /** `HH:mm` start time of the activity being routed TO. When set,
     *  the helper only considers same-day activities that start
     *  BEFORE this time — directions to "Mount Fuji at 11:40" should
     *  start from the hotel checked in at 11:15, not from the ramen
     *  shop the user plans to hit at 12:00. */
    currentActivityTime?: string;
}

export const pickSmartEntryLocation = ({
    destinations,
    currentDate,
    fallbackCountry,
    excludeActivityId,
    currentActivityTime,
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

    // Day-equality via moment so we tolerate format drift between
    // ItineraryDay.date (YYYY-MM-DD from the reducer) and the
    // caller's date prop (sometimes MM/DD/YYYY from DateBlock or
    // an ISO timestamp on edit-mode hydrate). Strict `===` was the
    // bug — a mismatched format made the lookup return -1, the
    // helper returned the country fallback, and the directions
    // origin missed the obvious "hotel on this day" anchor.
    const currentIdx = allDays.findIndex((d) =>
        isSameDay(d.date, currentDate),
    );
    if (currentIdx === -1) return fallback;

    const currentDay = allDays[currentIdx];

    // Rule 1: closest preceding activity on the current day with an
    // address. When the caller passes currentActivityTime, we sort by
    // startTime and only consider activities that start BEFORE that
    // — so directions to Mount Fuji at 11:40 start from the hotel
    // check-in at 11:15, NOT from the ramen lunch at 12:00. Skip the
    // calling activity itself so the origin never resolves to the
    // destination.
    const todays = currentDay.activities ?? [];
    const isBefore = (a: Activity): boolean => {
        if (!currentActivityTime) return true;
        const t = a.startTime?.trim();
        if (!t) return false; // No time → unsortable → ignore.
        return t < currentActivityTime;
    };
    // Build a list of valid candidates (with address, not excluded,
    // before current time). Sort by startTime DESCENDING so the
    // closest-preceding activity wins.
    const candidates: Array<{ activity: Activity; addr: string }> = [];
    for (const a of todays) {
        if (excludeActivityId !== undefined && a.id === excludeActivityId) {
            continue;
        }
        if (!isBefore(a)) continue;
        const addr = addressOf(a);
        if (addr) candidates.push({ activity: a, addr });
    }
    candidates.sort((a, b) => {
        // Activities without a time sort last (oldest), so timed
        // activities win the closest-preceding contest.
        const ta = a.activity.startTime?.trim() ?? '';
        const tb = b.activity.startTime?.trim() ?? '';
        return tb.localeCompare(ta);
    });
    if (candidates.length) return candidates[0].addr;

    // Rule 2: any hotel on the current day BEFORE current time
    // (defensive — addressOf above usually catches hotels, but a
    // hotel saved without a location string would fall through to
    // here).
    const todaysHotel = todays.find(
        (a) =>
            isHotel(a) &&
            (excludeActivityId === undefined || a.id !== excludeActivityId) &&
            isBefore(a),
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
