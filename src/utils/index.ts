import { TRIP_BASIC } from "constants";

export * from "./date";
export * from "./destinations";
export * from "./remapTripDates";
export * from "./duplicateTrip";
export * from "./lazyWithRetry";
export * from "./parseRoute";
export * from "./tripStats";
export * from "./tripReadiness";
export * from "./tripCardStats";

export const isSingleTrip = (type) => {
    return type === TRIP_BASIC.SINGLE.id ? true : false;
};

export const convertMoney = (value) => {
    // Coerce missing / non-numeric inputs to 0 so the UI shows "$0" instead
    // of "NaN" (which is what Intl.NumberFormat returns for undefined/string).
    const num = typeof value === 'number' ? value : parseFloat(value);
    const safe = Number.isFinite(num) ? num : 0;
    let usDollar = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    });

    return usDollar.format(safe);
};