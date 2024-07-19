// import { combineReducers } from "redux";

import { initialState } from "../store/storage";

let lastBudgetId = 0;
let lastPlaceId = 0;
let lastActivityId = 0;
let lastDateId = 0;
let lastDestinationId = 0;

const tripReducer = (state = null, action) => {
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
                destinations: {
                    id: ++lastDestinationId,
                    ...action.payload
                }
            };
        }
        case 'EDIT_BUDGET':
        {
            console.log("edit budget", action.payload);
            return {
                ...state,
            };
        }
        case 'DELETE_BUDGET':
        {
            console.log("remove budget", action.payload);
            return {
                ...state,
            };
        }
        case 'ADD_BUDGET':
        {
            console.log("add budget", action.payload);
            console.log("trip", state);
            const destinations = JSON.parse(JSON.stringify(state.destinations));
            
            const { value, itineraryId, activityIndex} = action.payload;
            console.log("apend budget");
            const newBudget = value.map(item => ({
                ...item,
                id:  lastBudgetId++
            }));
            destinations[0].itinerary[itineraryId].activities[activityIndex].budget =newBudget;


            return {
                ...state,
                destinations: destinations
            };
        }
        case 'ADD_ACTIVITY':
        {
            console.log("add activity", action.payload);
            return {
                ...state,
            };
        }
        case 'EDIT_ACTIVITY':
        {
            console.log("edit activity", action.payload);
            return {
                ...state,
            };
        }
        case 'DELETE_ACTIVITY':
        {
            console.log("remvoe activity", action.payload);
            return {
                ...state,
            };
        }
        case 'ADD_PLACE':
        {
            console.log("add place", action.payload);
            console.log("trip", state);
            const destinations = JSON.parse(JSON.stringify(state.destinations));
            
            const { value, index } = action.payload;
            if (destinations[0].itinerary && destinations[0].itinerary.length) {
                console.log("apend activities");
                destinations[0].itinerary[index].activities.push({
                    ...value,
                    id: lastPlaceId++
                });
            } else {
                destinations[0].itinerary = [
                    {
                        id: ++lastDateId,
                        date: action.payload.date,
                        activities: [{
                            ...action.payload.value,
                            id: lastPlaceId++
                        }]
                    }
                ];
            }

           
            return {
                ...state,
                destinations: destinations
            };
        }
        case 'EDIT_PLACE':
        {
            console.log("edit place", action.payload);
            console.log("trip", state);
            const { value, activityIndex, itineraryIndex } = action.payload;
            const destinations = JSON.parse(JSON.stringify(state.destinations));
            const currValue = destinations[0].itinerary[itineraryIndex].activities[activityIndex];
            destinations[0].itinerary[itineraryIndex].activities[activityIndex] = {
                ...currValue,
                ...value
            };

            return {
                ...state,
                destinations: destinations
            };
        }
        case 'DELETE_PLACE':
        {
            console.log("remvoe place", action.payload);
            console.log("trip", state);
            const { value, index } = action.payload;
            const destinations = JSON.parse(JSON.stringify(state.destinations));
            const n_activities = destinations[0].itinerary[index].activities.filter(item => item.id !== value);
            destinations[0].itinerary[0].activities = n_activities;
            return {
                ...state,
                destinations: destinations
            };
        }
        case 'ACTIVITY_SINGLE':
        {
            console.log("budget redux", action.payload);
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
                            new_activities.push(action.payload);
                            currState.destinations[i].itinerary[x].activities = new_activities;
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
            return null;
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