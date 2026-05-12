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
    ActivityInput,
    FlightInfoInput,
    ItineraryDayInput,
    SaveItineraryInput,
} from 'api/hooks/useItineraries';
import { TRIP_BASIC } from 'constants';

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
    // Frontend `budget` is an array of items; backend `budget` is a single
    // total. We leave it null; budget summaries stay client-side for now.
    budget: null,
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
    const wantName = wantMulti
        ? 'Multi Destination Trip'
        : 'Single Destination Trip';
    return types.find((t) => t.name === wantName)?.id ?? null;
};
