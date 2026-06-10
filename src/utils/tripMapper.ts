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
    DestinationInput,
    ItineraryDayInput,
    SaveItineraryInput,
    TransportInput,
    TransportLegInput,
} from 'api/hooks/useItineraries';
import { ITINERARY_TYPE, TRIP_BASIC } from 'constants';
import { deriveDestinationRanges } from 'utils/destinations';
import { formatDate } from 'utils/date';

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

/** Map one internal FlightInfo leg to a generic TransportLegInput (airport /
 *  flight-number flavored; also carries carrier/seatOrClass for non-flight
 *  modes that ride on FlightInfo, e.g. a train arrival on `dest.flightInfo`). */
const flightLegToTransportLeg = (
    seg: FlightInfo,
    defaultDate?: string
): TransportLegInput => ({
    departAt: combineDateTime(seg.departDate ?? defaultDate, seg.departTime),
    arriveAt: combineDateTime(seg.arrivalDate ?? defaultDate, seg.arrivalTime),
    departPoint: seg.departAirport ?? null,
    arrivePoint: seg.arrivalAirport ?? null,
    number: seg.flightNumber ?? null,
    carrier: seg.carrier ?? null,
    seatOrClass: seg.seatOrClass ?? null,
});

/** Map an internal destination/trip-level FlightInfo (which may carry any
 *  `mode` — flight/train/bus/rental) into a generic TransportInput. Legs come
 *  from `segments` (or a one-element list synthesized from the headline so
 *  legacy flat-field-only data still writes a leg). */
const transportToInput = (
    flight: FlightInfo | undefined,
    defaultDate?: string
): TransportInput | null => {
    if (!flight) return null;
    const segments: FlightInfo[] =
        flight.segments?.length ? flight.segments : [flight];
    const legs = segments.map((seg) => flightLegToTransportLeg(seg, defaultDate));
    const headline = legs[0];
    // `paidBy.id` carries a backend user UUID — only forward when it looks
    // like one. Legacy mock-friend ids can't be saved; drop them silently.
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
        mode: flight.mode ?? 'flight',
        // Keep the flat headline in sync with leg 0 — server uses it as a
        // cached view, and any reader that doesn't walk legs still sees it.
        departPoint: headline.departPoint,
        arrivePoint: headline.arrivePoint,
        departAt: headline.departAt,
        arriveAt: headline.arriveAt,
        number: headline.number,
        carrier: headline.carrier,
        cost: toNumber(flight.cost),
        paidByUserId,
        paidAt: flight.paidAt ?? null,
        budgets: budgetInputs,
        legs,
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

/** Build the activity-owned TransportInput from whichever leg list the
 *  activity carries: flights use `flightSegments`, ground transport
 *  (train/bus/rental) uses `transitSegments`. The cost stays on the activity
 *  row (the backend keeps activity transport cost-free), so we only forward
 *  mode + legs. Returns null for non-transport activities. This is what makes
 *  train/bus activities finally persist — transit legs had no storage before. */
const activityTransportToInput = (
    activity: Activity
): TransportInput | null => {
    if (activity.flightSegments?.length) {
        return {
            mode: 'flight',
            legs: activity.flightSegments.map((seg) =>
                flightLegToTransportLeg(seg)
            ),
        };
    }
    if (activity.transitSegments?.length) {
        return {
            mode: activity.kind ?? 'train',
            legs: activity.transitSegments.map((seg) => ({
                departAt: combineDateTime(seg.departDate, seg.departTime),
                arriveAt: combineDateTime(seg.arrivalDate, seg.arrivalTime),
                departPoint: seg.departStation ?? null,
                arrivePoint: seg.arrivalStation ?? null,
                number: seg.number ?? null,
                carrier: seg.operator ?? null,
                seatOrClass: seg.classOrSeat ?? null,
            })),
        };
    }
    return null;
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
        transport: activityTransportToInput(activity),
        placeCity: activity.placeCity ?? null,
        placeCountry: activity.placeCountry ?? null,
        countryCode: activity.countryCode ?? null,
        latitude: activity.latitude ?? null,
        longitude: activity.longitude ?? null,
        sourceUrl: activity.sourceUrl ?? null,
        googleRating: activity.googleRating ?? null,
        googleRatingCount: activity.googleRatingCount ?? null,
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
    // Multi trips persist each destination with its end derived from the next
    // destination's start (last → trip end), matching what the timeline shows.
    const destinations = isMulti
        ? deriveDestinationRanges(
              tripState.destinations ?? [],
              tripState.endDate ?? undefined,
          )
        : tripState.destinations ?? [];

    const statusLookup = options.activityStatusLookup;

    // Multi-destination trips persist as first-class destinations (country +
    // arrival flight + date range), each owning its own days. Empty days in a
    // destination's range need no rows — the backend infers them from the
    // range — so we only send the days that actually carry activities.
    const destinationInputs: DestinationInput[] = [];
    if (isMulti) {
        destinations.forEach((dest, order) => {
            const destDays = dest.itinerary ?? [];
            const dayInputs: ItineraryDayInput[] = destDays.map((day) => ({
                date: day.date,
                countryId: null,
                transport: null,
                activities: (day.activities ?? []).map((a) =>
                    activityToInput(a, day.date, statusLookup)
                ),
            }));
            const rawStart =
                dest.startDate || destDays[0]?.date || tripState.startDate || '';
            const rawEnd =
                dest.endDate ||
                destDays[destDays.length - 1]?.date ||
                rawStart;
            // DestinationInput.startDate/endDate are GraphQL `Date`
            // (YYYY-MM-DD). The derived end can be the trip end, which is stored
            // as a full datetime — strip the time so coercion doesn't reject it.
            const startDate = rawStart ? formatDate(rawStart) : '';
            const endDate = rawEnd ? formatDate(rawEnd) : startDate;
            destinationInputs.push({
                // Empty when the destination has no real country yet — the
                // backend's required-field check surfaces a clear error rather
                // than a UUID-cast 500.
                countryId: countryIdOf(dest.country) ?? '',
                startDate,
                endDate,
                transport: transportToInput(dest.flightInfo, startDate),
                note: dest.note ?? null,
                order,
                days: dayInputs,
            });
        });
    }

    // Single-destination trips keep the day-based payload (root country +
    // flight live at the top level; days carry only activities).
    const days: ItineraryDayInput[] = [];
    if (!isMulti) {
        const dest = destinations[0];
        for (const day of dest?.itinerary ?? []) {
            days.push({
                date: day.date,
                countryId: null,
                transport: null,
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
        transport: isMulti
            ? null
            : transportToInput(rootDest?.flightInfo, tripState.startDate),
        days,
        destinations: isMulti ? destinationInputs : null,
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
