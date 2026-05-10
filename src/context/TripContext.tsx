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
import type {
    Activity,
    BudgetItem,
    Destination,
    TripState,
} from 'types/trip';
import { emptyTripState } from 'types/trip';

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

export const addBudget = (payload: AddBudgetPayload): TripAction => ({
    type: 'addBudget',
    payload,
});

export const resetTrip = (): TripAction => ({ type: 'resetTrip' });

const tripReducer = produce((draft: TripState, action: TripAction) => {
    switch (action.type) {
        case 'basicInfo': {
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
            const dest = draft.destinations[destIndx];
            if (!dest) return;

            if (!dest.itinerary) dest.itinerary = [];

            const newActivity: Activity = { ...value, id: generateId() };
            const day = dest.itinerary.find(
                (d) => moment(d.date).isSame(date, 'day')
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
