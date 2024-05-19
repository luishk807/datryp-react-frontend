import { combineReducers } from "redux";

const initialStaste = {
    value: 0
};

const counterReducer = (state = initialStaste, action) => {
    switch(action.type) {
        case 'INCREMENT': 
            return { ...state, value: state.value + 1};
        case 'SUBSTRACT':
            return { ...state, value: state.value - 1};
        default:
            return state;
    }
};

const rootReducers = combineReducers({
    counter: counterReducer
});

export default rootReducers;