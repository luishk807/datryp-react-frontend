/** Wire-shape fixtures for `POST /activities/suggest-fields`. The raw
 *  interfaces are private, so the shape is pinned locally. Exercises the
 *  snake→camel `toSuggestion` reshape and the `result: null` no-suggestion
 *  branch. */
export const activitySuggestWireFixture = {
    result: {
        name: 'Buckingham Palace',
        location: 'Westminster',
        city: 'London',
        country: 'United Kingdom',
        start_time: '09:30',
        end_time: '11:30',
        check_in_time: null,
        check_out_time: null,
        depart_time: null,
        arrival_time: null,
        cost: '30',
        currency: 'GBP',
    },
} as const;

export const activitySuggestNoResultFixture = { result: null } as const;
