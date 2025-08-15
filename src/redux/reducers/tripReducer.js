// import { combineReducers } from "redux";

import { initialState } from "../store/storage";

let lastBudgetId = 0;
let lastPlaceId = 0;
let lastActivityId = 0;
let lastDateId = 0;
let lastDestinationId = 0;

const generationRandomId = () => {
    return Math.floor(Math.random()*1000);
};
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
                    id: generationRandomId(),
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
            
            const { value, itineraryId, activityIndex, destinationIndx} = action.payload;

            const destIndx = destinationIndx || 0;

            console.log("apend budget");
            const newBudget = value.map(item => ({
                ...item,
                id: generationRandomId()
            }));
            destinations[destIndx].itinerary[itineraryId].activities[activityIndex].budget =newBudget;


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
        case 'ADD_DESTINATION':
        {
            console.log("add destination", action.payload);
            console.log("trip", state);
            const destinations = JSON.parse(JSON.stringify(state.destinations));
            
            const { value, index } = action.payload;

            // lastDestinationId++;

            destinations.push({
                ...value,
                startDate: action.payload.startDate,
                endDate: action.payload.endDate,
                id: generationRandomId()
            });

            console.log("destinations", destinations);
          
            return {
                ...state,
                destinations: destinations
            };
        }
        case 'EDIT_DESTINATION':
        {
            console.log("edit destination", action.payload);
            console.log("trip", state);
            const { value, index, startDate, endDate, removeIndexes } = action.payload;
            const destinations = JSON.parse(JSON.stringify(state.destinations));
            // const currValue = destinations[index];

            destinations[index] = {
                startDate,
                endDate,
                ...value
            };

            console.log("destinations", destinations);
            let n_destination = [];

            if (removeIndexes.length) {
                for(let i = 0; i < destinations.length; i++) {
                    if(!removeIndexes.includes(destinations[i].id)) {
                        n_destination.push(destinations[i]);
                    }
                }
                return {
                    ...state,
                    destinations: n_destination
                };
            } else {
                return {
                    ...state,
                    destinations: destinations
                };
            }

            
 
        }
        case 'DELETE_DESTINATION':
        {
            console.log("remvoe destination", action.payload);
            console.log("trip", state);

            const { index } = action.payload;
            let destinations = JSON.parse(JSON.stringify(state.destinations));
            const n_activities = destinations.filter(item => item.id !== index);
            destinations = n_activities;

            return {
                ...state,
                destinations: destinations
            };
        }
        case 'ADD_PLACE':
        {
            console.log("add place", action.payload);
            console.log("trip", state);
            const destinations = JSON.parse(JSON.stringify(state.destinations));
            
            const { value, index, destinationIndx} = action.payload;
            
            const destIndx = destinationIndx || 0;
            
            if (destinations[destIndx].itinerary && destinations[destIndx].itinerary.length) {
                console.log("apend activities");
                destinations[destIndx].itinerary[index].activities.push({
                    ...value,
                    id: generationRandomId()
                });
            } else {
                destinations[destIndx].itinerary = [
                    {
                        id: lastDateId,
                        date: action.payload.date,
                        activities: [{
                            ...action.payload.value,
                            id: generationRandomId()
                        }]
                    }
                ];
            }

            console.log("ADD PLACE, new destination", destinations);

            // return {
            //     ...state,
            // };
            return {
                ...state,
                destinations: destinations
            };
        }
        case 'EDIT_PLACE':
        {
            console.log("edit place", action.payload);
            console.log("trip", state);
            const { value, activityIndex, itineraryIndex, destinationIndx } = action.payload;
            const destIndx = destinationIndx || 0;
            const destinations = JSON.parse(JSON.stringify(state.destinations));
            const currValue = destinations[destIndx].itinerary[itineraryIndex].activities[activityIndex];
            destinations[destIndx].itinerary[itineraryIndex].activities[activityIndex] = {
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
            const { value, index, destinationIndx} = action.payload;
            const destIndx = destinationIndx || 0;
            const destinations = JSON.parse(JSON.stringify(state.destinations));
            const n_activities = destinations[destIndx].itinerary[index].activities.filter(item => item.id !== value);
            destinations[destIndx].itinerary[0].activities = n_activities;
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