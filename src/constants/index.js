export const NO_IMAGE = './images/logo-gray.png';

export const REDUX_TYPE = {
    ADD: 'add',
    DELETE: 'delete',
    EDIT: 'edit'
};

export const TRIP_BASIC = {
    SINGLE: {
        id: 1,
        name: 'Single',
        route: '/single',
        steps: {
            BASIC: 0,
            FRIEND: 1,
            FINISH: 2
        }
    },
    MULTIPLE: {
        id: 2,
        name: 'Multiple',
        route: '/multiple',
        steps: {
            BASIC: 0,
            FRIEND: 1,
            FINISH: 2
        }
    }
};