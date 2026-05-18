import React, {
    createContext,
    useContext,
    useEffect,
    useReducer,
    type Dispatch,
    type ReactNode,
} from 'react';
import { produce } from 'immer';
import { isSameDay } from 'utils';
import type {
    Activity,
    BudgetItem,
    Destination,
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
            Object.assign(draft, action.payload);
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
        <TripStateContext.Provider value={state}>
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
