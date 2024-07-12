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
            let currState = JSON.parse(JSON.stringify(state));
            
            const destinations = currState.destinations;
            for(let i = 0; i < destinations.length; i++) {
                const itinerary = destinations[i].itinerary;
                for(let x = 0; x < itinerary.length; x++) {
                    const activity = itinerary[x].activities;
                    for(let y = 0; y < activity.length; y++) {
                        let curActivity = activity[y];
                        if (curActivity.id === action.payload.id) {
                            currState.destinations[i].itinerary[x].activities[y] = action.payload;
                            break;
                        }
                    }

                }
            }

            console.log("finised");
            return {
                ...state,
                ...currState
            };
        }
        case 'ON_DELETE_PLACE':
        {
            console.log("place delete redux", action.payload);
            const currState = {...state};
            
            for(let i = 0; i <= currState.destinations.length; i++) {
                const itinerary = currState.destinations[i].itinerary;

                let break1loop = false;
                if (break1loop) {
                    break;
                }
                for(let x = 0; x <= itinerary.length; x++) {
                    const currItinenary = itinerary[x];
                    let break2loop = false;
                    console.log('checking '+currItinenary);
                    if (currItinenary.id === action.payload.id) {
                        console.log("founddddd", currItinenary);
                        break2loop = true;
                        break;
                    }
                }
            }

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