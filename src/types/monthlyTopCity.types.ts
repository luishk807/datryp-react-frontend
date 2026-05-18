/** One city in the monthly "Top 6 cities to travel" list returned by
 *  `GET /top-cities-monthly`. AI-curated for the requested month so picks
 *  shift seasonally (cherry blossoms, monsoon, jazz festivals, etc.). */
export interface MonthlyTopCity {
    name: string;
    country: string;
    countryCode: string;
    /** Why this city is great in this specific month. 1-2 sentences. */
    why: string;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface MonthlyTopCitiesResult {
    /** Cache key (`YYYY-MM`) that the row was served from. */
    month: string;
    cached: boolean;
    cities: MonthlyTopCity[];
}
