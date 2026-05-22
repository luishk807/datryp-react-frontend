export interface TopPlace {
    /** Stable key for React's render list. Numeric for legacy seed data,
     *  string slug (`name--code`) for live monthly cities. */
    id: number | string;
    name: string;
    country: string;
    countryCode: string;
    image: string;
    tagline: string;
}
