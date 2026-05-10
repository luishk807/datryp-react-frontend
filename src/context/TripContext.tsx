import React, {
    createContext,
    useContext,
    useEffect,
    useReducer,
    type Dispatch,
    type ReactNode,
} from 'react';
import { produce } from 'immer';
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
    itineraryId: number;
    activityIndex: number;
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
            const { value, index, date, destinationIndx } = action.payload;
            const destIndx = destinationIndx ?? 0;
            const dest = draft.destinations[destIndx];
            if (!dest) return;

            const newActivity: Activity = { ...value, id: generateId() };

            if (dest.itinerary && dest.itinerary.length) {
                const day = dest.itinerary[index];
                if (day) {
                    day.activities.push(newActivity);
                }
            } else {
                dest.itinerary = [
                    {
                        id: generateId(),
                        date,
                        activities: [newActivity],
                    },
                ];
            }
            return;
        }
        case 'editPlace': {
            const { value, itineraryIndex, activityIndex, destinationIndx } = action.payload;
            const destIndx = destinationIndx ?? 0;
            const day = draft.destinations[destIndx]?.itinerary?.[itineraryIndex];
            const current = day?.activities?.[activityIndex];
            if (current && day) {
                day.activities[activityIndex] = { ...current, ...value };
            }
            return;
        }
        case 'deletePlace': {
            const { value, index, destinationIndx } = action.payload;
            const destIndx = destinationIndx ?? 0;
            const day = draft.destinations[destIndx]?.itinerary?.[index];
            if (day) {
                day.activities = day.activities.filter((a) => a.id !== value);
            }
            return;
        }
        case 'addBudget': {
            const { value, itineraryId, activityIndex, destinationIndx } = action.payload;
            const destIndx = destinationIndx ?? 0;
            const activity =
                draft.destinations[destIndx]?.itinerary?.[itineraryId]?.activities?.[activityIndex];
            if (activity) {
                activity.budget = value.map((item) => ({ ...item, id: generateId() }));
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
