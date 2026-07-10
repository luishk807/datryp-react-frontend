/** Wire-shape fixtures for the `/city-details/quick` + `/country-details/quick`
 *  prose slices. The raw interface is private, so the shape is pinned locally.
 *  `destinationProseWireFixture` has every paragraph; the reshaper's `?? null`
 *  branch is exercised with a raw `{}` payload in the test. */
export const destinationProseWireFixture = {
    long_description:
        'Kyoto blends imperial temples, tranquil gardens, and a living geisha district.',
    country_description:
        'Japan pairs bullet-train efficiency with centuries-deep tradition.',
    budget_description:
        'Mid-range travelers should budget around $150/day including lodging.',
} as const;
