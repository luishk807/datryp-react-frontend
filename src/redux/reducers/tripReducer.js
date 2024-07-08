// import { combineReducers } from "redux";

import { initialState } from "../store/storage";

const tripReducer = (state = initialState, action) => {
    switch (action.type) {
    case 'BASIC_INFO':
    {
        console.log("testing this", action.payload);
        const test = {
            ...state,
            ...action.payload,
        };
        console.log("final", test);
        return test;
    }
    default: {
        return state;
    }
    }

};

// const rootReducer = combineReducers({
//     tripReducer: tripReducer
// });

export default tripReducer;