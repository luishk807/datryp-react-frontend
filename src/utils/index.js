import { TRIP_BASIC } from "constants";
export const isSingleTrip = (type) => {
    return type === TRIP_BASIC.SINGLE.id ? true : false;
};

export const convertMoney = (value) => {
    let usDollar = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    });

    return usDollar.format(value);
};