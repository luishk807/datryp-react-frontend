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
        case 'ACTIVITY_SINGLE':
        {
            console.log("budget redux", action.payload);
            const { id, value} = action.payload;
            let currState = JSON.parse(JSON.stringify(state));

            const destinations = currState.destinations;
            
            for(let i = 0; i < destinations.length; i++) {
                const itinerary = destinations[i].itinerary;
                for(let x = 0; x < itinerary.length; x++) {
                    const activity = itinerary[x].activities;
                    for(let y = 0; y < activity.length; y++) {
                        let curActivity = activity[y];
                        if (curActivity.id === value.id) {
                            currState.destinations[i].itinerary[x].activities[y] = value;
                            break;
                        }
                    }

                }
            }

            console.log("finised",currState);
            return {
                ...state,
                ...currState
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
            let currState = JSON.parse(JSON.stringify(state));
            
            const destinations = currState.destinations;
            for(let i = 0; i < destinations.length; i++) {
                const itinerary = destinations[i].itinerary;
                for(let x = 0; x < itinerary.length; x++) {
                    const activities = itinerary[x].activities;
                    for(let y = 0; y < activities.length; y++) {
                        let curActivity = activities[y];
                        if (curActivity.id === action.payload.id) {
                            const new_activities = activities.filter(item => item.id !== action.payload.id);
                            currState.destinations[i].itinerary[x].activities = new_activities;
                            break;
                        }
                    }

                }
            }
            console.log("finised delete",currState);
            return {
                ...state,
                ...currState
            };

        }
        case 'RESET_STATE': {
            return {};
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