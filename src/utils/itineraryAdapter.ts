/**
 * Bridge between the API's `ApiItinerary` shape and the legacy frontend
 * types (`SingleDestination` / `MultipleDestinations` / `TripState`) that
 * the existing UI components were built against.
 *
 * Keeps the rest of the UI working without rewriting every component.
 */

import { addDays, formatDate, isValidDate } from 'utils';
import type {
    ApiActivity,
    ApiActivityBudget,
    ApiItinerary,
    ApiTransport,
    ApiTransportLeg,
} from 'api/hooks/useItineraries';
import { ITINERARY_TYPE, TRIP_BASIC, TRIP_STATUS } from 'constants';
import type {
    Activity,
    ActivityKind,
    BudgetItem,
    Destination,
    FlightInfo,
    Friend,
    MultipleDestinations,
    SingleDestination,
    TransitInfo,
    TripState,
} from 'types';
import { ACTIVITY_KIND } from 'constants';

/** Cheap stable hash so UUID strings can still be used where a numeric id is expected. */
const uuidToNumericId = (uuid: string): number => {
    let h = 0;
    for (let i = 0; i < uuid.length; i++) {
        h = (h * 31 + uuid.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
};

/** Extract `HH:mm` from a backend datetime string ("2026-05-14T12:00:00" → "12:00").
 * The frontend Activity type stores times as `HH:mm` (paired with the day's
 * `date`); tripMapper recombines them on save. If we pass the full ISO back
 * through tripMapper, `combineDateTime` would double-prepend the date.
 */
const apiTimeToHHmm = (iso: string | null | undefined): string | undefined => {
    if (!iso) return undefined;
    return isValidDate(iso) ? formatDate(iso, 'HH:mm') : undefined;
};

/** Convert backend `ActivityBudgetEntry[]` to the frontend `BudgetItem[]`
 * shape that AddBudget / Activities expect. We preserve `userId` so future
 * round-trips can match the breakdown back to the same user.
 */
const apiBudgetsToItems = (
    entries: ApiActivityBudget[] | null | undefined
): BudgetItem[] | undefined => {
    if (!entries || !entries.length) return undefined;
    return entries.map((b) => ({
        id: uuidToNumericId(b.id),
        user: {
            id: uuidToNumericId(b.user.id),
            label: b.user.name ?? b.user.email,
            name: b.user.name ?? b.user.email,
            userId: b.user.id,
        },
        budget: b.amount,
    }));
};

/** Split a backend combined ISO datetime back into the form FlightInfo
 *  expects on the frontend (date = YYYY-MM-DD, time = HH:mm). The form
 *  fields are split and tripMapper recombines them on save — passing the
 *  full ISO back through would double-prepend the date. */
const splitDateTime = (
    iso: string | null | undefined
): { date?: string; time?: string } => {
    if (!iso || !isValidDate(iso)) return {};
    return {
        date: formatDate(iso, 'YYYY-MM-DD'),
        time: formatDate(iso, 'HH:mm'),
    };
};

/** Map one generic transport leg into the frontend's FlightInfo leg shape
 *  (airport/flight-number flavored). Used for flight-mode transports and for
 *  the destination-arrival header (which renders any mode off FlightInfo). */
const apiLegToFlightInfo = (l: ApiTransportLeg): FlightInfo => {
    const dep = splitDateTime(l.departAt);
    const arr = splitDateTime(l.arriveAt);
    return {
        departDate: dep.date,
        departTime: dep.time,
        arrivalDate: arr.date,
        arrivalTime: arr.time,
        flightNumber: l.number ?? undefined,
        departAirport: l.departPoint ?? undefined,
        arrivalAirport: l.arrivePoint ?? undefined,
        carrier: l.carrier ?? undefined,
        seatOrClass: l.seatOrClass ?? undefined,
    };
};

/** Map one generic transport leg into the frontend's TransitInfo leg shape
 *  (station/operator flavored). Used for train/bus/rental activity legs. */
const apiLegToTransitInfo = (l: ApiTransportLeg): TransitInfo => {
    const dep = splitDateTime(l.departAt);
    const arr = splitDateTime(l.arriveAt);
    return {
        operator: l.carrier ?? undefined,
        number: l.number ?? undefined,
        departStation: l.departPoint ?? undefined,
        arrivalStation: l.arrivePoint ?? undefined,
        departDate: dep.date,
        departTime: dep.time,
        arrivalDate: arr.date,
        arrivalTime: arr.time,
        classOrSeat: l.seatOrClass ?? undefined,
    };
};

/** Map a destination/trip-level ApiTransport (headline + legs + cost/payer)
 *  into the frontend's FlightInfo shape, carrying `mode` so a train/bus/rental
 *  arrival renders correctly in the header band. Each leg becomes one entry in
 *  the nested `segments` list; the headline (leg 0) drives the flat fields. */
const apiTransportToFlightInfo = (t: ApiTransport | null): FlightInfo => {
    if (!t) return {};
    const legs = t.legs?.length ? t.legs : [];
    const segments = legs.map(apiLegToFlightInfo);
    const headline = segments[0] ?? {};
    const budgets = t.budgets?.length
        ? t.budgets.map((b) => ({
              // Frontend uses numeric ids for budget entries; a fresh local id
              // is fine since the UI keys on user, not entry id.
              id: Date.now() + Math.floor(Math.random() * 1000),
              user: apiUserToFriend(b.user),
              budget: b.amount,
          }))
        : undefined;
    // Backend may serialize `paidAt` as a full ISO datetime; collapse to
    // `YYYY-MM-DD` so the date picker in MarkPaidModal hydrates cleanly.
    const paidAt = t.paidAt
        ? (isValidDate(t.paidAt) ? formatDate(t.paidAt, 'YYYY-MM-DD') : t.paidAt)
        : null;
    return {
        ...headline,
        mode: normalizeKind(t.mode),
        cost: t.cost ?? undefined,
        paidBy: t.paidBy ? { id: t.paidBy.id, name: t.paidBy.name } : null,
        paidAt,
        budgets,
        segments,
    };
};

/** Split an activity's transport into the frontend's flight-vs-transit shapes.
 *  Flights populate `flightSegments`; ground transport (train/bus/rental)
 *  populates `transitSegments`. Returns both keys (one undefined) so the spread
 *  at the call site is clean. This is what now lets a saved train/bus activity
 *  round-trip — previously transit legs had no backend storage and were
 *  dropped on save. */
const apiActivityTransport = (
    t: ApiTransport | null,
): Pick<Activity, 'flightSegments' | 'transitSegments'> => {
    if (!t || !t.legs?.length) return {};
    const mode = normalizeKind(t.mode);
    if (mode === ACTIVITY_KIND.FLIGHT) {
        return { flightSegments: t.legs.map(apiLegToFlightInfo) };
    }
    return { transitSegments: t.legs.map(apiLegToTransitInfo) };
};

const normalizeKind = (k: string | null | undefined): ActivityKind | undefined => {
    if (k === ACTIVITY_KIND.FLIGHT) return ACTIVITY_KIND.FLIGHT;
    if (k === ACTIVITY_KIND.NOTE) return ACTIVITY_KIND.NOTE;
    if (k === ACTIVITY_KIND.PLACE) return ACTIVITY_KIND.PLACE;
    // Newer kinds. Without these, a saved-then-reloaded hotel / train /
    // bus activity comes back with `kind = undefined`, which the
    // AddPlaceBtn modal falls back to PLACE — making edit silently
    // open the wrong form for the kind the user originally picked.
    if (k === ACTIVITY_KIND.HOTEL_CHECKIN) return ACTIVITY_KIND.HOTEL_CHECKIN;
    if (k === ACTIVITY_KIND.HOTEL_CHECKOUT) return ACTIVITY_KIND.HOTEL_CHECKOUT;
    if (k === ACTIVITY_KIND.TRAIN) return ACTIVITY_KIND.TRAIN;
    if (k === ACTIVITY_KIND.BUS) return ACTIVITY_KIND.BUS;
    if (k === ACTIVITY_KIND.RENTAL_CAR) return ACTIVITY_KIND.RENTAL_CAR;
    if (k === ACTIVITY_KIND.OTHER) return ACTIVITY_KIND.OTHER;
    return undefined;
};

/** Single source of truth for ApiActivity → Activity mapping. Used by both
 *  `apiToTripEntry` and `apiToTripState`, and in single + multi branches.
 *  `status` is preserved as `{id (UUID), name}` so the status toggle on the
 *  card and `activityToInput` on save both have the real backend identifier. */
const apiActivityToActivity = (a: ApiActivity): Activity => ({
    id: uuidToNumericId(a.id),
    // Keep the real backend UUID so endpoints that target a specific activity
    // (e.g. the per-activity notify alert) get a valid id, not the numeric hash.
    apiId: a.id,
    kind: normalizeKind(a.kind),
    name: a.name,
    place: a.place ?? undefined,
    location: a.location ?? undefined,
    startTime: apiTimeToHHmm(a.startTime),
    endTime: apiTimeToHHmm(a.endTime),
    cost: a.cost ?? undefined,
    note: a.notes ?? undefined,
    // Backend persists `image` as a plain URL string; rehydrate into the
    // `ImageRef` shape the UI expects ({ url, name }) so saved AI-suggested
    // photos survive a reload. Without this, the activity card lost its
    // image after the trip was saved.
    image: a.image ? { url: a.image, name: a.name } : undefined,
    status: a.status ? { id: a.status.id, name: a.status.name } : undefined,
    budget: apiBudgetsToItems(a.budgets),
    ...apiActivityTransport(a.transport),
    placeKey: a.placeKey,
    placeCity: a.placeCity,
    placeCountry: a.placeCountry,
    countryCode: a.countryCode,
    latitude: a.latitude,
    longitude: a.longitude,
    sourceUrl: a.sourceUrl ?? null,
    googleRating: a.googleRating ?? null,
    googleRatingCount: a.googleRatingCount ?? null,
    // Backend may serialize `paidAt` as a full ISO datetime; collapse to
    // `YYYY-MM-DD` so the date picker in MarkPaidModal hydrates cleanly
    // and the chip renders a stable date regardless of TZ.
    paidAt: a.paidAt
        ? (isValidDate(a.paidAt) ? formatDate(a.paidAt, 'YYYY-MM-DD') : a.paidAt)
        : null,
    paidBy: a.paidBy ? { id: a.paidBy.id, name: a.paidBy.name } : null,
});

const apiUserToFriend = (u: { id: string; name: string | null; email: string }): Friend => ({
    id: uuidToNumericId(u.id),
    label: u.name ?? u.email,
    name: u.name ?? u.email,
    userId: u.id,
});

const apiUserToLegacyUser = (u: {
    id: string;
    name: string | null;
    email: string;
    profileImageUrl?: string | null;
}) =>
    ({
        id: uuidToNumericId(u.id),
        name: u.name ?? u.email,
        email: u.email,
        userId: u.id,
        profileImageUrl: u.profileImageUrl ?? null,
        // Fields demanded by the legacy User type but irrelevant to the UI:
        phone: '',
        dob: '',
        countryOfBirth: { id: 0, name: '' },
        gender: { id: 0, name: '' },
    }) as unknown as Friend; // shape mismatch is intentional — see file header

export const apiIsSingleTrip = (it: ApiItinerary): boolean =>
    it.interaryType.name === ITINERARY_TYPE.SINGLE;

/** ApiItinerary → SingleDestination | MultipleDestinations (for TripBox / TripDetail). */
export const apiToTripEntry = (
    it: ApiItinerary
): SingleDestination | MultipleDestinations => {
    const isSingle = apiIsSingleTrip(it);

    const shared = {
        id: uuidToNumericId(it.id),
        apiId: it.id, // preserved for UUID-aware lookups
        name: it.name ?? 'Untitled trip',
        startDate: it.startDate ?? '',
        endDate: it.endDate ?? '',
        status: it.status
            ? { id: it.status.id, name: it.status.name }
            : { id: 1, name: TRIP_STATUS.PLANNING },
        user: apiUserToLegacyUser(it.user) as unknown as SingleDestination['user'],
        budget: it.budget ?? 0,
        image: it.image ?? undefined,
        friends: it.friends.map(
            apiUserToLegacyUser
        ) as unknown as SingleDestination['friends'],
        organizers: it.organizers.map(
            apiUserToLegacyUser
        ) as unknown as SingleDestination['organizers'],
        interaryType: it.interaryType,
    };

    if (isSingle) {
        return {
            ...shared,
            country: it.country ?? { id: 0, name: '' },
            flightInfo: apiTransportToFlightInfo(it.transport),
            intenaryDates: it.intenaryDates.map((d) => ({
                id: uuidToNumericId(d.id),
                date: d.date,
                activities: d.activities.map(apiActivityToActivity),
            })),
        } as unknown as SingleDestination & { apiId: string };
    }

    return {
        ...shared,
        intenaryDates: it.intenaryDates.map((d) => ({
            id: uuidToNumericId(d.id),
            date: d.date,
            country: d.country ?? { id: 0, name: '' },
            flightInfo: apiTransportToFlightInfo(d.transport),
            activities: d.activities.map(apiActivityToActivity),
        })),
    } as unknown as MultipleDestinations & { apiId: string };
};

/** ApiItinerary → TripState (for the in-progress trip editor flow). */
export const apiToTripState = (it: ApiItinerary): TripState => {
    const isSingle = apiIsSingleTrip(it);
    const friends: Friend[] = it.friends.map(apiUserToFriend);
    const organizer: Friend[] = it.organizers.map(apiUserToFriend);

    let destinations: Destination[];
    if (isSingle) {
        destinations = [
            {
                id: uuidToNumericId(it.id),
                country: it.country ?? { id: 0, name: '' },
                flightInfo: it.transport
                    ? apiTransportToFlightInfo(it.transport)
                    : undefined,
                itinerary: it.intenaryDates.map((d) => ({
                    id: uuidToNumericId(d.id),
                    date: d.date,
                    activities: d.activities.map(apiActivityToActivity),
                })),
            },
        ];
    } else if (it.destinations && it.destinations.length) {
        // First-class, date-range destinations (current model): each owns its
        // country + arrival flight and spans `startDate`..`endDate`, holding
        // every day in that range. This is what lets a destination cover
        // multiple days without re-adding it per day.
        destinations = it.destinations.map((dest) => ({
            id: uuidToNumericId(dest.id),
            country: dest.country ?? { id: 0, name: '' },
            flightInfo: dest.transport
                ? apiTransportToFlightInfo(dest.transport)
                : undefined,
            startDate: dest.startDate,
            endDate: dest.endDate,
            note: dest.note ?? undefined,
            itinerary: dest.intenaryDates.map((d) => ({
                id: uuidToNumericId(d.id),
                date: d.date,
                activities: d.activities.map(apiActivityToActivity),
            })),
        }));
    } else {
        // Legacy fallback: a multi trip from an OLD backend with no
        // `destinations` field. Group each day into its own single-day
        // destination (the pre-date-range behavior) so the editor still opens.
        const dates = it.intenaryDates;
        destinations = dates.map((d, i) => {
            const nextDate = dates[i + 1]?.date;
            const endDate = nextDate ? addDays(nextDate, -1) : d.date;
            return {
                id: uuidToNumericId(d.id),
                country: d.country ?? { id: 0, name: '' },
                flightInfo: d.transport
                    ? apiTransportToFlightInfo(d.transport)
                    : undefined,
                startDate: d.date,
                endDate,
                itinerary: [
                    {
                        id: uuidToNumericId(d.id),
                        date: d.date,
                        activities: d.activities.map(apiActivityToActivity),
                    },
                ],
            };
        });
    }

    return {
        apiId: it.id,
        name: it.name ?? '',
        note: it.note ?? undefined,
        startDate: it.startDate ?? undefined,
        endDate: it.endDate ?? undefined,
        status: it.status
            ? { id: it.status.id, name: it.status.name }
            : undefined,
        // Match the numeric id to TRIP_BASIC so downstream `isSingleTrip(type?.id)`
        // checks resolve correctly — DateBlock branches single vs multi rendering
        // off this id, not off `interaryType.name`.
        type: it.interaryType
            ? isSingle
                ? { ...TRIP_BASIC.SINGLE, name: it.interaryType.name }
                : { ...TRIP_BASIC.MULTIPLE, name: it.interaryType.name }
            : undefined,
        budget: it.budget ?? undefined,
        total: it.budget ?? undefined,
        image: it.image ?? undefined,
        destinations,
        organizer,
        friends,
    };
};

/** True if the current user (by backend UUID) is an organizer on the given itinerary. */
export const isCurrentUserOrganizer = (
    it: ApiItinerary | undefined,
    currentUserId: string | undefined
): boolean => {
    if (!it || !currentUserId) return false;
    if (it.user.id === currentUserId) return true;
    return it.organizers.some((o) => o.id === currentUserId);
};
