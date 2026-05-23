/** City-level enriched info returned by `GET /city-details`. Sits between
 *  PlaceDetails (a specific place inside a city) and CountryDetails (a
 *  whole country). Reuses the shared sub-types from placeDetails since
 *  most are city-level under the hood. */
import type {
    Airport,
    Coordinates,
    CurrencyInfo,
    LocalFlavor,
    LodgingInfo,
    NamedTip,
    NearbyDestination,
    PopularityInfo,
    SafetyInfo,
    TravelBasics,
    VisaInfo,
} from "./placeDetails.types";

export interface CityDetails {
    longDescription: string;
    countryDescription: string;
    budgetDescription: string;
    cityHighlight: string;
    countryHighlight: string;
    topPlaces: NamedTip[];
    foods: NamedTip[];
    thingsToDo: NamedTip[];
    photoSpots: NamedTip[];
    notesToKnow: NamedTip[];
    bestTimeToVisit: string;
    worstTimeToVisit: string;
    weather: string;
    currency: CurrencyInfo;
    safety: SafetyInfo;
    coordinates: Coordinates;
    travelBasics: TravelBasics;
    lodging: LodgingInfo;
    nearbyDestinations: NearbyDestination[];
    localFlavor: LocalFlavor;
    /** 1 (cheapest) – 5 (most expensive). */
    costLevel: number;
    visa: VisaInfo;
    /** Airports serving the city. Empty for cache rows from before
     *  this field shipped — UI degrades gracefully. */
    airports: Airport[];
    /** AI-curated 0-5 overall tourist rating. Pairs with the
     *  crowdsourced review average to give the city header both a
     *  "global rating" and a "user rating". 0 = unavailable (pre-existing
     *  cache rows from before this field shipped). */
    touristRating: number;
    /** Year-current traveler-popularity read. Optional for rows cached
     *  before this field shipped — the UI hides the meter when absent. */
    popularity?: PopularityInfo;
    /** Heads-up on cultural-shock moments a first-time visitor might
     *  experience. Optional for rows cached before this field shipped. */
    culturalShock?: string;
}

export interface CitySummary {
    name: string;
    country: string;
    countryCode: string;
    /** Backend UUID of the city's country, resolved from `countryCode` in
     *  the catalog. `null` when the country isn't seeded — saving the trip
     *  then won't link to a country FK. */
    countryId: string | null;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface CityDetailsResult {
    city: CitySummary;
    cached: boolean;
    details: CityDetails;
}
