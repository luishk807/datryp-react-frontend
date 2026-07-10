import type { BudgetSuggestRequest } from 'api/budgetApi';

/** A well-formed budget-suggest request (typed as the FE's own interface). */
export const budgetRequestFixture: BudgetSuggestRequest = {
    countryCode: 'JP',
    city: 'Tokyo',
    days: 7,
    travelStyle: 'mid-range',
    startDate: '2026-09-01',
    homeCountryCode: 'US',
    homeCity: 'New York',
};

/** Wire response with a full estimate. Raw envelope shape is private to the
 *  module, so it's pinned inline here. */
export const budgetResponseFixture = {
    result: {
        suggested_total: 2500,
        currency: 'USD',
        daily: 250,
        note: 'Mid-range week in Tokyo including flights.',
    },
} as const;

/** Wire response when the model couldn't estimate — client maps this to null. */
export const budgetNullResponseFixture = {
    result: null,
} as const;
