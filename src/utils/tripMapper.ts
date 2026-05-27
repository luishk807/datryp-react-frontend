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
    // Forward each segment as its own input row. If the user only edited
    // the legacy flat fields (no segments list yet — possible for legacy
    // saved data that hasn't been re-opened in the AddDestination form),
    // synthesize a one-element segments list from the headline so the
    // server still writes a flight_info_segments row.
    const segments: FlightInfo[] =
        flight.segments?.length ? flight.segments : [flight];
    const segmentInputs = segments.map((seg) => ({
        departDate: combineDateTime(seg.departDate ?? defaultDate, seg.departTime),
        arrivalDate: combineDateTime(seg.arrivalDate ?? defaultDate, seg.arrivalTime),
        flightNumber: seg.flightNumber ?? null,
        departAirport: seg.departAirport ?? null,
        arrivalAirport: seg.arrivalAirport ?? null,
    }));
    const headline = segmentInputs[0];
    // `paidBy.id` carries a backend user UUID — only forward when it
    // looks like one. Legacy mock-friend ids (numeric or local-only
    // strings) can't be saved, so we drop them silently rather than
    // 500 the save.
    const payerId = flight.paidBy?.id;
    const paidByUserId =
        payerId && UUID_RE.test(payerId) ? payerId : null;
    // Per-friend budget split — only forward entries whose user has a
    // backend UUID (legacy mock-friend numeric ids can't be saved).
    const budgetInputs =
        flight.budgets
            ?.map((entry) => {
                const uid = entry.user?.userId;
                const amount = toNumber(entry.budget);
                if (!uid || !UUID_RE.test(uid) || amount == null) {
                    return null;
                }
                return { userId: uid, amount };
            })
            .filter((x): x is { userId: string; amount: number } => x !== null) ?? [];
    return {
        // Keep the flat fields in sync with segment 0 — server uses them
        // as a cached view of the headline, and any legacy reader that
        // never learns about segments still sees the right values.
        departDate: headline.departDate,
        arrivalDate: headline.arrivalDate,
        flightNumber: headline.flightNumber,
        departAirport: headline.departAirport,
        arrivalAirport: headline.arrivalAirport,
        cost: toNumber(flight.cost),
        paidByUserId,
        paidAt: flight.paidAt ?? null,
        budgets: budgetInputs,
        segments: segmentInputs,
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

/** Extract the backend `trip_statuses.id` UUID off an activity's local status.
 *
 *  Primary path: the status was set with a UUID (set by `useTripStatuses`
 *  after the lookup resolved) → return it.
 *
 *  Fallback path: the activity carries a partial status object like
 *  `{ id: 0, name: 'Confirmed' }` — happens when the user toggled the
 *  status pill *before* `useTripStatuses` resolved (cold cache, fast
 *  click). The numeric `0` is a placeholder; without the lookup we'd
 *  silently drop the field and the backend would save
 *  `trip_status_id = NULL`, which round-trips back as "Planning" and
 *  looks like the toggle never persisted. The optional `statusLookup`
 *  (name → UUID) resolves the real id by status name so the toggle
 *  always saves, no matter when the user clicked relative to the
 *  lookup query.
 *
 *  Legacy sample-data ids that aren't strings AND can't be name-resolved
 *  still drop to null — the backend would 400 on a bad UUID cast,
 *  and those activities are pre-existing test fixtures with no real
 *  status anyway.
 */
const activityStatusIdOf = (
    status: Activity['status'],
    statusLookup?: Map<string, string>
): string | null => {
    if (!status || typeof status !== 'object') return null;
    const id = status.id;
    if (typeof id === 'string' && UUID_RE.test(id)) return id;
    // Cold-cache / stale-id fallback: resolve UUID by name.
    if (statusLookup && typeof status.name === 'string') {
        return statusLookup.get(status.name) ?? null;
    }
    return null;
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
    dayDate: string | undefined,
    statusLookup: Map<string, string> | undefined
): ActivityInput => {
    // `paidBy.id` carries a backend user UUID — only forward when it
    // looks like one. Mock-friend ids (numeric or local-only strings)
    // can't be saved, so drop them silently rather than 500 the save.
    // Matches the legacy flight-side handling in `flightToInput`.
    const payerId = activity.paidBy?.id;
    const paidByUserId =
        payerId && UUID_RE.test(payerId) ? payerId : null;
    return {
        name: activity.name?.trim() || 'Untitled activity',
        place: activity.place ?? null,
        location: activity.location ?? null,
        startTime: combineDateTime(dayDate, activity.startTime),
        endTime: combineDateTime(dayDate, activity.endTime),
        cost: toNumber(activity.cost),
        notes: activity.note ?? null,
        image: activity.image?.url ?? null,
        budget: sumBudget(activity.budget),
        tripStatusId: activityStatusIdOf(activity.status, statusLookup),
        paidByUserId,
        paidAt: activity.paidAt ?? null,
        budgets: budgetEntriesToInput(activity.budget),
        kind: activity.kind ?? null,
        flightSegments: flightSegmentsToInput(activity.flightSegments),
        placeCity: activity.placeCity ?? null,
        placeCountry: activity.placeCountry ?? null,
        countryCode: activity.countryCode ?? null,
        latitude: activity.latitude ?? null,
        longitude: activity.longitude ?? null,
    };
};

export interface MapTripOptions {
    /** UUID from useItineraryTypes (Single Destination Trip / Multi Destination Trip). */
    interaryTypeId: string;
    /** Optional UUID from useTripStatuses. */
    tripStatusId?: string | null;
    /** Existing itinerary id when updating, omit when creating. */
    id?: string | null;
    /** Per-save opt-out for the notification fan-out (default true). */
    notifyParticipants?: boolean;
    /** Name → UUID lookup from `useTripStatuses`. Lets `activityStatusIdOf`
     *  resolve an activity's status when its `id` is stale (numeric `0`
     *  from the cold-cache toggle fallback) but its `name` is correct.
     *  Without this, the activity saves with `trip_status_id = NULL` and
     *  the post-save refetch shows Planning — looks like the toggle was
     *  lost. */
    activityStatusLookup?: Map<string, string>;
}

export const tripStateToSaveInput = (
    tripState: TripState,
    options: MapTripOptions
): SaveItineraryInput => {
    const isMulti = tripState.type?.id === TRIP_BASIC.MULTIPLE.id;
    const destinations = tripState.destinations ?? [];

    const statusLookup = options.activityStatusLookup;

    const days: ItineraryDayInput[] = [];
    if (isMulti) {
        for (const dest of destinations) {
            for (const day of dest.itinerary ?? []) {
                days.push({
                    date: day.date,
                    countryId: countryIdOf(dest.country),
                    flightInfo: flightToInput(dest.flightInfo, day.date),
                    activities: (day.activities ?? []).map((a) =>
                        activityToInput(a, day.date, statusLookup)
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
                    activityToInput(a, day.date, statusLookup)
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
        image: tripState.image ?? null,
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
        notifyParticipants: options.notifyParticipants ?? true,
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
