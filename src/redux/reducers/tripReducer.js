// import { combineReducers } from "redux";

import { initialState } from "../store/storage";

const tripReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'BASIC_INFO':
        {
            console.log("testing this", action.payload);
            return {
                ...state,
                ...action.payload,
            };
        }
        case 'DESTINATION_SINGLE':
        {
            console.log("destination redux", action.payload);
            return {
                ...state,
                destinations: action.payload
            };
        }
        case 'ON_SAVE_PLACE':
        {
            console.log("place save redux", action.payload);
            return {
                ...state
            };
        }
        case 'ON_DELETE_PLACE':
        {
            console.log("place delete redux", action.payload);
            return {
                ...state
            };
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