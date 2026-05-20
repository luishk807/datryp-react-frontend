/**
 * TripState (frontend, free-form) → SaveItineraryInput (backend, normalized).
 *
 * The save mutation expects:
 * - `interaryTypeId` looked up via useItineraryTypes (UUID)
 * - `tripStatusId` looked up via useTripStatuses (UUID)
 * - For single-destination: root `countryId` + `flightInfo`, days carry only activities.
 * - For multi-destination: each day carries its own `countryId` + `flightInfo`.
 *
 * Friends/organizer IDs are left empty for now — the local Friend list isn't
 * tied to real backend User UUIDs yet. Wire those when friends-API integration lands.
 */

import type { Activity, Country, FlightInfo, TripState } from 'types';
import type {
    ActivityBudgetInput,
    ActivityInput,
    FlightInfoInput,
    ItineraryDayInput,
    SaveItineraryInput,
} from 'api/hooks/useItineraries';
import { ITINERARY_TYPE, TRIP_BASIC } from 'constants';

const isFiniteNumber = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);

const toNumber = (v: unknown): number | null => {
    if (isFiniteNumber(v)) return v;
    if (typeof v === 'string' && v.trim()) {
        const parsed = parseFloat(v);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

/** Combine "YYYY-MM-DD" + "HH:mm" into an ISO datetime. Returns the date alone if no time. */
const combineDateTime = (
    date?: string | null,
    time?: string | null
): string | null => {
    if (!date) return null;
    if (!time) return date.length === 10 ? `${date}T00:00:00` : date;
    const padded = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
    return `${date}T${padded}`;
};

/** Returns the country UUID only if `country.id` looks like a real backend
 * UUID. Placeholder values (numeric 0 / sample numeric IDs) are dropped so
 * the save mutation surfaces a useful "country required" error instead of
 * a cryptic "badly formed hexadecimal UUID". */
const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const countryIdOf = (country: Country | undefined): string | null => {
    const id = country?.id;
    if (id == null) return null;
    const str = String(id);
    return UUID_RE.test(str) ? str : null;
};

const flightToInput = (
    flight: FlightInfo | undefined,
    defaultDate?: string
): FlightInfoInput | null => {
    if (!flight) return null;
    return {
        departDate: combineDateTime(flight.departDate ?? defaultDate, flight.departTime),
        arrivalDate: combineDateTime(flight.arrivalDate ?? defaultDate, flight.arrivalTime),
        flightNumber: flight.flightNumber ?? null,
        departAirport: flight.departAirport ?? null,
        arrivalAirport: flight.arrivalAirport ?? null,
    };
};

/** Sum the per-friend budget breakdown into a single total for the
 * denormalized `activity.budget` column on the backend. The per-friend split
 * persists in `activity_budgets` (sent below as `budgets`); this float is
 * kept as a list-view shortcut.
 */
const sumBudget = (items: Activity['budget']): number | null => {
    if (!items || !items.length) return null;
    const total = items.reduce((acc, item) => acc + (toNumber(item.budget) ?? 0), 0);
    return Number.isFinite(total) && total > 0 ? total : null;
};

/** Map the frontend per-friend entries to backend ActivityBudgetInput rows.
 * Drops entries with no backend user id (legacy mock friends) or non-positive
 * amounts, both of which can't be saved.
 */
const budgetEntriesToInput = (
    items: Activity['budget']
): ActivityBudgetInput[] => {
    if (!items || !items.length) return [];
    const out: ActivityBudgetInput[] = [];
    for (const item of items) {
        const userId = item.user?.userId;
        const amount = toNumber(item.budget);
        if (!userId || amount == null || amount <= 0) continue;
        out.push({ userId, amount });
    }
    return out;
};

/** Extract the backend `trip_statuses.id` UUID off an activity's local status,
 *  if it's actually a UUID. Legacy sample-data ids (numbers, or strings that
 *  don't match the UUID shape) are dropped so the backend doesn't 400 on a
 *  bad cast — those activities will just save with `trip_status_id = null`.
 */
const activityStatusIdOf = (
    status: Activity['status']
): string | null => {
    if (!status || typeof status !== 'object') return null;
    const id = status.id;
    if (typeof id !== 'string') return null;
    return UUID_RE.test(id) ? id : null;
};

const flightSegmentsToInput = (
    segments: Activity['flightSegments']
): FlightInfoInput[] => {
    if (!segments?.length) return [];
    return segments.map((seg) => ({
        departDate: combineDateTime(seg.departDate, seg.departTime),
        arrivalDate: combineDateTime(seg.arrivalDate, seg.arrivalTime),
        flightNumber: seg.flightNumber ?? null,
        departAirport: seg.departAirport ?? null,
        arrivalAirport: seg.arrivalAirport ?? null,
    }));
};

const activityToInput = (
    activity: Activity,
    dayDate?: string
): ActivityInput => ({
    name: activity.name?.trim() || 'Untitled activity',
    place: activity.place ?? null,
    location: activity.location ?? null,
    startTime: combineDateTime(dayDate, activity.startTime),
    endTime: combineDateTime(dayDate, activity.endTime),
    cost: toNumber(activity.cost),
    notes: activity.note ?? null,
    image: activity.image?.url ?? null,
    budget: sumBudget(activity.budget),
    tripStatusId: activityStatusIdOf(activity.status),
    budgets: budgetEntriesToInput(activity.budget),
    kind: activity.kind ?? null,
    flightSegments: flightSegmentsToInput(activity.flightSegments),
});

export interface MapTripOptions {
    /** UUID from useItineraryTypes (Single Destination Trip / Multi Destination Trip). */
    interaryTypeId: string;
    /** Optional UUID from useTripStatuses. */
    tripStatusId?: string | null;
    /** Existing itinerary id when updating, omit when creating. */
    id?: string | null;
}

export const tripStateToSaveInput = (
    tripState: TripState,
    options: MapTripOptions
): SaveItineraryInput => {
    const isMulti = tripState.type?.id === TRIP_BASIC.MULTIPLE.id;
    const destinations = tripState.destinations ?? [];

    const days: ItineraryDayInput[] = [];
    if (isMulti) {
        for (const dest of destinations) {
            for (const day of dest.itinerary ?? []) {
                days.push({
                    date: day.date,
                    countryId: countryIdOf(dest.country),
                    flightInfo: flightToInput(dest.flightInfo, day.date),
                    activities: (day.activities ?? []).map((a) =>
                        activityToInput(a, day.date)
                    ),
                });
            }
        }
    } else {
        const dest = destinations[0];
        for (const day of dest?.itinerary ?? []) {
            days.push({
                date: day.date,
                countryId: null,
                flightInfo: null,
                activities: (day.activities ?? []).map((a) =>
                    activityToInput(a, day.date)
                ),
            });
        }
    }

    const rootDest = destinations[0];
    const organizerIds = (tripState.organizer ?? [])
        .map((f) => f.userId)
        .filter((id): id is string => Boolean(id));
    const participantIds = (tripState.friends ?? [])
        .map((f) => f.userId)
        .filter((id): id is string => Boolean(id));

    return {
        id: options.id ?? undefined,
        interaryTypeId: options.interaryTypeId,
        name: tripState.name ?? null,
        startDate: tripState.startDate ?? null,
        endDate: tripState.endDate ?? null,
        budget: toNumber(tripState.budget),
        image: null,
        tripStatusId: options.tripStatusId ?? null,
        // Picked friends/organizers carry their backend UUID via Friend.userId;
        // legacy mock entries without userId are silently dropped.
        organizerIds,
        participantIds,
        countryId: isMulti ? null : countryIdOf(rootDest?.country),
        flightInfo: isMulti
            ? null
            : flightToInput(rootDest?.flightInfo, tripState.startDate),
        days,
    };
};

/** Resolve "Single Destination Trip" / "Multi Destination Trip" id from a lookup list. */
export const resolveInteraryTypeId = (
    tripState: TripState,
    types: { id: string; name: string }[]
): string | null => {
    const wantMulti = tripState.type?.id === TRIP_BASIC.MULTIPLE.id;
    const wantName = wantMulti ? ITINERARY_TYPE.MULTI : ITINERARY_TYPE.SINGLE;
    return types.find((t) => t.name === wantName)?.id ?? null;
};
