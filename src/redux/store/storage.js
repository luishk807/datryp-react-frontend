import { singleTripDetailobj } from '../../sample/tripData';

export const initializedState = () => (initialState);

export const initialState = {
    ...singleTripDetailobj
};

export const saveState = (state) => {
    try {
        let serialized = JSON.stringify(state);
        localStorage.setItem('trip-state', serialized);
    } catch(err) {
        console.log("error saving state", err);
        // return localStorage.setItem('trip-state', initializedState());
    }
};


export const loadState = () => {
    try {
        let serialized = localStorage.getItem('trip-state');
        if (!serialized) {
            console.log('nothin found');
            return initializedState();
        }
        return JSON.parse(serialized);
    } catch (err) {
        return initializedState();
    }
};

