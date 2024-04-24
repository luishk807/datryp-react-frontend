import { configureStore } from '@reduxjs/toolkit';
import tripReducer from '../reducers/tripReducer';

const store = configureStore({
    reducer: tripReducer,
});

export default store;