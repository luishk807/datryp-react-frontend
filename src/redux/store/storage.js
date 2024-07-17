import { singleTripDetailobj } from '../../sample/tripData';

export const initializedState = () => (initialState);

export const initialState = {
    ...singleTripDetailobj
};

export const saveState = (state) => {
    try {
        let serialized = JSON.stringify(state);
        console.log('saveState: saving redux', state);
        localStorage.setItem('trip-state', serialized);
    } catch(err) {
        console.log('error saving state', err);
        // return localStorage.setItem('trip-state', initializedState());
    }
};


export const loadState = () => {
    try {
        let serialized = localStorage.getItem('trip-state');
        if (!serialized) {
            console.log('loadState: nothin found');
            return initializedState();
        } 
        const serialState = JSON.parse(serialized);
        console.log('loadState: fetch state', serialState);
        return serialState;
    } catch (err) {
        return initializedState();
    }
};

