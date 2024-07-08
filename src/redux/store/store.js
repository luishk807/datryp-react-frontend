import { configureStore } from '@reduxjs/toolkit';
import tripReducer from '../reducers/tripReducer';
import { saveState, loadState} from './storage';

const loadSaveState = loadState();

const store = configureStore({
    reducer: tripReducer,
    preloadedState: {...loadSaveState}
});

store.subscribe(() => {
    saveState(store.getState());
});

export default store;