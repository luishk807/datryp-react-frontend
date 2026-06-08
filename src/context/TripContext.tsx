import React, {
    createContext,
    useContext,
    useEffect,
    useReducer,
    type Dispatch,
    type ReactNode,
} from 'react';
import { produce } from 'immer';
import moment from 'moment';
import { isSameDay, remapTripDatesToRange } from 'utils';
import { TRIP_BASIC } from 'constants';
import type {
    Activity,
    BudgetItem,
    Destination,
    ItineraryDay,
    TripState,
} from 'types';
import { emptyTripState } from 'types';

const STORAGE_KEY = 'trip-state';

let nextId = 1;
const generateId = (): number => {
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0];
    }
    nextId += 1;
    return Date.now() + nextId;
};

interface AddDestinationPayload {
    value: Omit<Destination, 'id' | 'itinerary'> & Partial<Pick<Destination, 'itinerary'>>;
    startDate?: string;
    endDate?: string;
    index?: number;
}

interface EditDestinationPayload {
    value: Partial<Destination>;
    index: number;
    startDate?: string;
    endDate?: string;
    removeIndexes: number[];
}

interface DeleteDestinationPayload {
    index: number;
}

interface AddPlacePayload {
    value: Omit<Activity, 'id'>;
    index: number;
    date: string;
    destinationIndx?: number;
}

interface EditPlacePayload {
    value: Partial<Activity>;
    itineraryIndex: number;
    activityIndex: number;
    destinationIndx?: number;
}

interface DeletePlacePayload {
    value: number;
    index: number;
    destinationIndx?: number;
}

interface MovePlacePayload {
    /** Activity id to relocate. Identity is stable across renders. */
    activityId: number;
    /** Source destination index. */
    fromDestIndx: number;
    /** Target destination index. May equal `fromDestIndx` (within-dest move). */
    toDestIndx: number;
    /** Target date (any parseable date string). The activity is appended to
     *  the matching ItineraryDay; a new day row is created if none exists. */
    toDate: string;
}

interface AddBudgetPayload {
    value: Array<Omit<BudgetItem, 'id'>>;
    activityId: number;
    destinationIndx?: number;
}

export type TripAction =
    | { type: 'basicInfo'; payload: Partial<TripState> }
    | { type: 'addDestination'; payload: AddDestinationPayload }
    | { type: 'editDestination'; payload: EditDestinationPayload }
    | { type: 'deleteDestination'; payload: DeleteDestinationPayload }
    | { type: 'addPlace'; payload: AddPlacePayload }
    | { type: 'editPlace'; payload: EditPlacePayload }
    | { type: 'deletePlace'; payload: DeletePlacePayload }
    | { type: 'movePlace'; payload: MovePlacePayload }
    | { type: 'addBudget'; payload: AddBudgetPayload }
    | { type: 'resetTrip' };

export const basicInfo = (payload: Partial<TripState>): TripAction => ({
    type: 'basicInfo',
    payload,
});

export const addDestination = (payload: AddDestinationPayload): TripAction => ({
    type: 'addDestination',
    payload,
});

export const editDestination = (payload: EditDestinationPayload): TripAction => ({
    type: 'editDestination',
    payload,
});

export const deleteDestination = (payload: DeleteDestinationPayload): TripAction => ({
    type: 'deleteDestination',
    payload,
});

export const addPlace = (payload: AddPlacePayload): TripAction => ({
    type: 'addPlace',
    payload,
});

export const editPlace = (payload: EditPlacePayload): TripAction => ({
    type: 'editPlace',
    payload,
});

export const deletePlace = (payload: DeletePlacePayload): TripAction => ({
    type: 'deletePlace',
    payload,
});

export const movePlace = (payload: MovePlacePayload): TripAction => ({
    type: 'movePlace',
    payload,
});

export const addBudget = (payload: AddBudgetPayload): TripAction => ({
    type: 'addBudget',
    payload,
});

export const resetTrip = (): TripAction => ({ type: 'resetTrip' });

const tripReducer = produce((draft: TripState, action: TripAction) => {
    switch (action.type) {
        case 'basicInfo': {
            // Cascade: when the payload shrinks the `friends` array, prune
            // matching budget entries from every activity. Without this, a
            // user who was added to an activity split stays on the budget
            // chips after they're removed from the participant list. We do
            // this *before* the Object.assign so the comparison uses the
            // pre-change draft.friends snapshot.
            const nextFriends = action.payload.friends;
            if (Array.isArray(nextFriends)) {
                const newIds = new Set(nextFriends.map((f) => f.id));
                const removedIds = new Set<number>();
                for (const f of draft.friends ?? []) {
                    if (!newIds.has(f.id)) removedIds.add(f.id);
                }
                if (removedIds.size > 0) {
                    for (const dest of draft.destinations) {
                        if (!dest.itinerary) continue;
                        for (const day of dest.itinerary) {
                            for (const activity of day.activities) {
                                if (!activity.budget) continue;
                                activity.budget = activity.budget.filter(
                                    (b) => !removedIds.has(b.user.id)
                                );
                            }
                        }
                    }
                }
            }
            // Snapshot the start before the merge so the multi-destination
            // re-anchor below can tell which destinations were tracking it.
            const prevStartDate = draft.startDate;
            Object.assign(draft, action.payload);

            // Assign real ids to any seeded destinations / itinerary
            // days / activities that came in with id=0. CityDetail and
            // CountryDetail seed the day-1 outbound + return flights
            // with placeholder id=0; without this pass, every seeded
            // activity shares the same id, which breaks `movePlace`
            // (`findIndex(a => a.id === activityId)` matches the FIRST
            // id=0 row, not the intended one). Walking the destinations
            // here centralizes the fix so the seed callers don't each
            // need their own id generator.
            for (const dest of draft.destinations ?? []) {
                if (!dest.id) dest.id = generateId();
                if (!dest.itinerary) continue;
                for (const day of dest.itinerary) {
                    if (!day.id) day.id = generateId();
                    for (const act of day.activities ?? []) {
                        if (!act.id) act.id = generateId();
                    }
                }
            }

            // Drag the end date along when the start moves past it, so the
            // range never goes backwards. Picking a start after the current
            // end snaps the end to the same day rather than leaving an
            // invalid "end before start" range the user has to fix by hand.
            if (
                'startDate' in action.payload &&
                draft.startDate &&
                draft.endDate &&
                moment(draft.endDate).isBefore(moment(draft.startDate), 'day')
            ) {
                draft.endDate = draft.startDate;
            }

            // Single-destination date change: re-align the itinerary days to
            // the new range so activities move WITH the trip instead of being
            // stranded on an old day. We SHIFT every day by the start delta and
            // then FIT onto [startDate, endDate] (pad new dates, drop ones the
            // range no longer covers). The earlier version only re-homed days
            // that fell OUTSIDE the range, so moving the start *earlier* while
            // the end stayed in range (e.g. 6/12→6/13→6/12) left a seeded day-1
            // flight stuck on the old start. `remapTripDatesToRange` is the same
            // shift+fit the edit modal uses — sharing it keeps create + edit
            // consistent and also re-homes the "/place stamped at today" seed.
            const dateChanged =
                'startDate' in action.payload || 'endDate' in action.payload;
            if (
                dateChanged &&
                draft.type?.id === TRIP_BASIC.SINGLE.id &&
                draft.startDate &&
                draft.endDate
            ) {
                draft.destinations = remapTripDatesToRange(
                    draft as TripState,
                    prevStartDate
                ).destinations;
            }

            // Multi-destination create flow: the country / city page seeds the
            // first destination anchored to the trip start (today). When the
            // user then picks real dates in the wizard's Dates step, a
            // destination still pinned to the old start — or one seeded with no
            // date at all — would fall outside the new range and vanish from
            // the itinerary (DateBlock keys multi destinations by `startDate`),
            // taking its auto-seeded flight with it. Re-anchor those to the new
            // start so the preset destination + flight follow the dates.
            // Scoped to creation (no apiId) and to destinations that were
            // tracking the old start, so user-placed mid-trip legs keep their
            // own dates.
            if (
                dateChanged &&
                draft.type?.id === TRIP_BASIC.MULTIPLE.id &&
                !draft.apiId &&
                draft.startDate
            ) {
                const newStart = draft.startDate;
                // Shift any placeholder date stamped at the OLD anchor onto the
                // new start. The country/city seed stamps the outbound flight
                // with TODAY's date (before the user picks real dates) — that's
                // what made the flight show e.g. "Jun 7" on a Jun 9 trip.
                // Matching on prevStartDate means a flight the user actually
                // dated (a different day) is left untouched.
                const reanchorDate = (d?: string): string | undefined =>
                    d && prevStartDate && isSameDay(d, prevStartDate)
                        ? newStart
                        : d;
                for (const dest of draft.destinations ?? []) {
                    const tracksOldStart =
                        !dest.startDate ||
                        (!!prevStartDate &&
                            isSameDay(dest.startDate, prevStartDate));
                    if (!tracksOldStart) continue;
                    dest.startDate = newStart;
                    dest.endDate = newStart;
                    for (const day of dest.itinerary ?? []) {
                        day.date = newStart;
                        // The seeded outbound flight is an activity (kind=
                        // FLIGHT) whose segments carry the date — re-anchor them
                        // too, plus any transit segments, so the depart/arrive
                        // dates follow the trip start.
                        for (const act of day.activities ?? []) {
                            for (const seg of act.flightSegments ?? []) {
                                seg.departDate = reanchorDate(seg.departDate);
                                seg.arrivalDate = reanchorDate(seg.arrivalDate);
                            }
                            for (const seg of act.transitSegments ?? []) {
                                seg.departDate = reanchorDate(seg.departDate);
                                seg.arrivalDate = reanchorDate(seg.arrivalDate);
                            }
                        }
                    }
                    // Destination header flight (multi model stores it here) —
                    // re-anchor its segments + flat headline the same way.
                    if (dest.flightInfo) {
                        for (const seg of dest.flightInfo.segments ?? []) {
                            seg.departDate = reanchorDate(seg.departDate);
                            seg.arrivalDate = reanchorDate(seg.arrivalDate);
                        }
                        dest.flightInfo.departDate = reanchorDate(
                            dest.flightInfo.departDate,
                        );
                        dest.flightInfo.arrivalDate = reanchorDate(
                            dest.flightInfo.arrivalDate,
                        );
                    }
                }
            }
            return;
        }
        case 'addDestination': {
            const { value, startDate, endDate } = action.payload;
            draft.destinations.push({
                ...value,
                startDate,
                endDate,
                id: generateId(),
                itinerary: value.itinerary ?? [],
            } as Destination);
            return;
        }
        case 'editDestination': {
            const { value, index, startDate, endDate, removeIndexes } = action.payload;
            const existing = draft.destinations[index];
            if (existing) {
                draft.destinations[index] = {
                    ...existing,
                    ...value,
                    startDate,
                    endDate,
                } as Destination;
            }
            if (removeIndexes && removeIndexes.length) {
                draft.destinations = draft.destinations.filter(
                    (d) => !removeIndexes.includes(d.id)
                );
            }
            return;
        }
        case 'deleteDestination': {
            draft.destinations = draft.destinations.filter(
                (d) => d.id !== action.payload.index
            );
            return;
        }
        case 'addPlace': {
            const { value, date, destinationIndx } = action.payload;
            const destIndx = destinationIndx ?? 0;

            // Auto-create destinations up to `destIndx` if missing. Otherwise
            // a user who landed on the trip page without a country pre-set
            // (e.g. TopPlace lookup failed, direct URL after reset) would see
            // Add Place silently no-op. The country can be filled in later.
            while (draft.destinations.length <= destIndx) {
                draft.destinations.push({
                    id: generateId(),
                    country: { id: 0, name: '' },
                    itinerary: [],
                } as Destination);
            }
            const dest = draft.destinations[destIndx];
            if (!dest.itinerary) dest.itinerary = [];

            const newActivity: Activity = { ...value, id: generateId() };
            const day = dest.itinerary.find(
                (d) => isSameDay(d.date, date)
            );

            if (day) {
                day.activities.push(newActivity);
            } else {
                dest.itinerary.push({
                    id: generateId(),
                    date,
                    activities: [newActivity],
                });
            }
            return;
        }
        case 'editPlace': {
            const { value, destinationIndx } = action.payload;
            const destIndx = destinationIndx ?? 0;
            const dest = draft.destinations[destIndx];
            if (!dest?.itinerary) return;

            const targetId = (value as { id?: number })?.id;
            if (targetId == null) return;

            for (const day of dest.itinerary) {
                const idx = day.activities.findIndex((a) => a.id === targetId);
                if (idx !== -1) {
                    day.activities[idx] = { ...day.activities[idx], ...value };
                    return;
                }
            }
            return;
        }
        case 'deletePlace': {
            const { value: activityId, destinationIndx } = action.payload;
            const destIndx = destinationIndx ?? 0;
            const dest = draft.destinations[destIndx];
            if (!dest?.itinerary) return;

            for (const day of dest.itinerary) {
                const idx = day.activities.findIndex((a) => a.id === activityId);
                if (idx !== -1) {
                    day.activities.splice(idx, 1);
                    return;
                }
            }
            return;
        }
        case 'movePlace': {
            const { activityId, fromDestIndx, toDestIndx, toDate } =
                action.payload;
            const fromDest = draft.destinations[fromDestIndx];
            if (!fromDest?.itinerary) return;

            // Find + extract the source activity. Splice from its day so
            // the source itinerary stays consistent.
            let moved: Activity | null = null;
            for (const day of fromDest.itinerary) {
                const idx = day.activities.findIndex((a) => a.id === activityId);
                if (idx !== -1) {
                    moved = day.activities.splice(idx, 1)[0];
                    break;
                }
            }
            if (!moved) return;

            // Auto-create destinations up to `toDestIndx` if missing — same
            // guard as `addPlace`. Keeps the reducer safe against stale
            // indexes from rapid UI changes.
            while (draft.destinations.length <= toDestIndx) {
                draft.destinations.push({
                    id: generateId(),
                    country: { id: 0, name: '' },
                    itinerary: [],
                } as Destination);
            }
            const toDest = draft.destinations[toDestIndx];
            if (!toDest.itinerary) toDest.itinerary = [];

            const targetDay = toDest.itinerary.find((d) =>
                isSameDay(d.date, toDate)
            );
            if (targetDay) {
                targetDay.activities.push(moved);
            } else {
                toDest.itinerary.push({
                    id: generateId(),
                    date: toDate,
                    activities: [moved],
                });
            }
            return;
        }
        case 'addBudget': {
            const { value, activityId, destinationIndx } = action.payload;
            const destIndx = destinationIndx ?? 0;
            const dest = draft.destinations[destIndx];
            if (!dest?.itinerary) return;

            for (const day of dest.itinerary) {
                const activity = day.activities.find((a) => a.id === activityId);
                if (activity) {
                    activity.budget = value.map((item) => ({
                        ...item,
                        id: generateId(),
                    }));
                    return;
                }
            }
            return;
        }
        case 'resetTrip': {
            return emptyTripState;
        }
    }
});

const loadInitialState = (): TripState => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyTripState;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.destinations)) {
            return emptyTripState;
        }
        return { ...emptyTripState, ...parsed };
    } catch {
        return emptyTripState;
    }
};

const TripStateContext = createContext<TripState | null>(null);
const TripDispatchContext = createContext<Dispatch<TripAction> | null>(null);

export const TripProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(tripReducer, undefined, loadInitialState);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (err) {
            console.warn('failed to persist trip state', err);
        }
    }, [state]);

    return (
        // immer's produce widens the result type to `Immutable<TripState>`
        // — TypeScript flags it as not assignable to the mutable context
        // value type. Runtime is fine (immer guarantees no mutation of
        // the previous state), but the compile-time signature mismatches.
        // Narrow it back with a single cast at this seam.
        <TripStateContext.Provider value={state as TripState}>
            <TripDispatchContext.Provider value={dispatch}>
                {children}
            </TripDispatchContext.Provider>
        </TripStateContext.Provider>
    );
};

export const useTripState = (): TripState => {
    const ctx = useContext(TripStateContext);
    if (!ctx) throw new Error('useTripState must be used inside <TripProvider>');
    return ctx;
};

export const useTripDispatch = (): Dispatch<TripAction> => {
    const ctx = useContext(TripDispatchContext);
    if (!ctx) throw new Error('useTripDispatch must be used inside <TripProvider>');
    return ctx;
};
