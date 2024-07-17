import { configureStore } from '@reduxjs/toolkit';
import tripReducer from '../reducers/tripReducer';
import { saveState, loadState} from './storage';

const loadSaveState = loadState();

const store = configureStore({
    reducer: tripReducer,
    preloadedState: {...loadSaveState}
});

// const store = configureStore({
//     reducer: tripReducer
// });

store.subscribe(() => {
    saveState(store.getState());
});

export default store;