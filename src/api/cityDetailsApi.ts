/**
 * Fetch wrapper for `GET /city-details` on the Python backend.
 * REST (not GraphQL) — see backend `app/routers/city_details.py`.
 */
import type {
    CityDetails,
    CityDetailsResult,
    CitySummary,
} from "types";
import { activeLang } from "i18n";

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? "http://localhost:8000";

interface NamedTipRaw {
    name: string;
    why: string;
    // Optional Unsplash enrichment — only populated for the first 4
    // `things_to_do` entries (Pro "Experience Highlights" strip).
    image_url?: string | null;
    photographer_name?: string | null;
    photographer_url?: string | null;
}

const toNamedTip = (raw: NamedTipRaw) => ({
    name: raw.name,
    why: raw.why,
    imageUrl: raw.image_url ?? undefined,
    photographerName: raw.photographer_name ?? undefined,
    photographerUrl: raw.photographer_url ?? undefined,
});

interface CurrencyInfoRaw {
    code: string;
    name: string;
    rate_per_usd: number;
}

interface SafetyInfoRaw {
    score: number;
    level: "low" | "moderate" | "high";
    summary: string;
}

interface CoordinatesRaw {
    lat: number;
    lng: number;
}

interface TravelBasicsRaw {
    preferred_transport: string;
    transport_system: string;
    payment_method: "cash" | "card" | "mixed";
    payment_note: string;
    language: string;
    vibe: string;
    audience: string;
    age_recommendation: string;
}

interface VisaInfoRaw {
    destination_country_code: string;
    visa_free_countries: string[];
    visa_on_arrival_countries: string[];
    summary: string;
}

interface LodgingInfoRaw {
    recommended_type: string;
    airbnb_availability: "common" | "limited" | "none";
    airbnb_note: string;
    hotel_availability: "common" | "limited" | "none";
    hotel_note: string;
    price_range: string;
    booking_tip: string;
}

interface NearbyDestinationRaw {
    name: string;
    country: string;
    kind: string;
    why: string;
    lat: number;
    lng: number;
    image_url?: string | null;
}

interface LocalFlavorRaw {
    fun_level: number;
    nightlife: string;
    famous_liquor: string;
    unique_souvenir: string;
    must_do_before_leaving: NamedTipRaw[];
}

interface AirportRaw {
    iata_code: string;
    name: string;
    distance_km: number;
    international: boolean;
}

interface CityDetailsRaw {
    long_description: string;
    country_description: string;
    budget_description: string;
    city_highlight: string;
    country_highlight: string;
    top_places: NamedTipRaw[];
    foods: NamedTipRaw[];
    things_to_do: NamedTipRaw[];
    photo_spots: NamedTipRaw[];
    notes_to_know: NamedTipRaw[];
    best_time_to_visit: string;
    worst_time_to_visit: string;
    weather: string;
    currency: CurrencyInfoRaw;
    safety: SafetyInfoRaw;
    coordinates: CoordinatesRaw;
    travel_basics: TravelBasicsRaw;
    lodging: LodgingInfoRaw;
    nearby_destinations: NearbyDestinationRaw[];
    local_flavor: LocalFlavorRaw;
    cost_level: number;
    visa: VisaInfoRaw;
    airports?: AirportRaw[];
    tourist_rating?: number;
    popularity?: {
        score: number;
        trend: 'rising' | 'steady' | 'falling';
        summary: string;
    } | null;
    cultural_shock?: string | null;
    before_you_go?: string[];
}

interface CitySummaryRaw {
    name: string;
    country: string;
    country_code: string;
    country_id: string | null;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface CityDetailsResponseRaw {
    city: CitySummaryRaw;
    cached: boolean;
    details: CityDetailsRaw;
}

const toCity = (raw: CitySummaryRaw): CitySummary => ({
    name: raw.name,
    country: raw.country,
    countryCode: raw.country_code,
    countryId: raw.country_id,
    imageUrl: raw.image_url,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
});

// Per-group mappers. Each maps one OpenAI prompt group (prose / lists /
// facts) to its slice of the camelCased `CityDetails`. The progressive
// "slice" endpoints return one group each; the monolithic `/city-details`
// composes all three (see `toDetails`). Sub-objects are guarded for the
// slice schemas' permissive nulls — harmless on the full (never-null) row.

type CityProseRaw = Pick<
    CityDetailsRaw,
    | "long_description"
    | "country_description"
    | "budget_description"
    | "city_highlight"
    | "country_highlight"
    | "weather"
    | "best_time_to_visit"
    | "worst_time_to_visit"
    | "cultural_shock"
    | "before_you_go"
>;

type CityListsRaw = Pick<
    CityDetailsRaw,
    | "top_places"
    | "foods"
    | "things_to_do"
    | "photo_spots"
    | "notes_to_know"
    | "nearby_destinations"
> & { local_flavor: LocalFlavorRaw | null };

type CityFactsRaw = {
    currency: CurrencyInfoRaw | null;
    safety: SafetyInfoRaw | null;
    coordinates: CoordinatesRaw | null;
    travel_basics: TravelBasicsRaw | null;
    lodging: LodgingInfoRaw | null;
    cost_level: number;
    visa: VisaInfoRaw | null;
    airports?: AirportRaw[];
    tourist_rating?: number;
    popularity?: CityDetailsRaw["popularity"];
};

const proseFromRaw = (raw: CityProseRaw): Partial<CityDetails> => ({
    longDescription: raw.long_description,
    countryDescription: raw.country_description,
    budgetDescription: raw.budget_description,
    cityHighlight: raw.city_highlight,
    countryHighlight: raw.country_highlight,
    weather: raw.weather,
    bestTimeToVisit: raw.best_time_to_visit,
    worstTimeToVisit: raw.worst_time_to_visit,
    culturalShock: raw.cultural_shock ?? undefined,
    beforeYouGo: raw.before_you_go ?? undefined,
});

const listsFromRaw = (raw: CityListsRaw): Partial<CityDetails> => ({
    topPlaces: raw.top_places.map(toNamedTip),
    foods: raw.foods.map(toNamedTip),
    thingsToDo: raw.things_to_do.map(toNamedTip),
    photoSpots: raw.photo_spots.map(toNamedTip),
    notesToKnow: raw.notes_to_know.map(toNamedTip),
    nearbyDestinations: raw.nearby_destinations.map((n) => ({
        ...n,
        imageUrl: n.image_url ?? null,
    })),
    localFlavor: raw.local_flavor
        ? {
              funLevel: raw.local_flavor.fun_level,
              nightlife: raw.local_flavor.nightlife,
              famousLiquor: raw.local_flavor.famous_liquor,
              uniqueSouvenir: raw.local_flavor.unique_souvenir,
              mustDoBeforeLeaving: raw.local_flavor.must_do_before_leaving,
          }
        : undefined,
});

const factsFromRaw = (raw: CityFactsRaw): Partial<CityDetails> => ({
    currency: raw.currency
        ? {
              code: raw.currency.code,
              name: raw.currency.name,
              ratePerUsd: raw.currency.rate_per_usd,
          }
        : undefined,
    safety: raw.safety
        ? {
              score: raw.safety.score,
              level: raw.safety.level,
              summary: raw.safety.summary,
          }
        : undefined,
    coordinates: raw.coordinates
        ? { lat: raw.coordinates.lat, lng: raw.coordinates.lng }
        : undefined,
    travelBasics: raw.travel_basics
        ? {
              preferredTransport: raw.travel_basics.preferred_transport,
              transportSystem: raw.travel_basics.transport_system,
              paymentMethod: raw.travel_basics.payment_method,
              paymentNote: raw.travel_basics.payment_note,
              language: raw.travel_basics.language,
              vibe: raw.travel_basics.vibe,
              audience: raw.travel_basics.audience,
              ageRecommendation: raw.travel_basics.age_recommendation,
          }
        : undefined,
    lodging: raw.lodging
        ? {
              recommendedType: raw.lodging.recommended_type,
              airbnbAvailability: raw.lodging.airbnb_availability,
              airbnbNote: raw.lodging.airbnb_note,
              hotelAvailability: raw.lodging.hotel_availability,
              hotelNote: raw.lodging.hotel_note,
              priceRange: raw.lodging.price_range,
              bookingTip: raw.lodging.booking_tip,
          }
        : undefined,
    costLevel: raw.cost_level,
    visa: raw.visa
        ? {
              destinationCountryCode: raw.visa.destination_country_code,
              visaFreeCountries: raw.visa.visa_free_countries,
              visaOnArrivalCountries: raw.visa.visa_on_arrival_countries,
              summary: raw.visa.summary,
          }
        : undefined,
    // Optional on the wire so cache rows from before this field shipped
    // still deserialize. UI degrades to an "Airport info unavailable"
    // message until the row gets refreshed.
    airports: (raw.airports ?? []).map((a) => ({
        iataCode: a.iata_code,
        name: a.name,
        distanceKm: a.distance_km,
        international: a.international,
    })),
    touristRating: raw.tourist_rating ?? 0,
    popularity: raw.popularity
        ? {
              score: raw.popularity.score,
              trend: raw.popularity.trend,
              summary: raw.popularity.summary,
          }
        : undefined,
});

const toDetails = (raw: CityDetailsRaw): CityDetails =>
    ({
        ...proseFromRaw(raw),
        ...listsFromRaw(raw),
        ...factsFromRaw(raw),
    }) as CityDetails;

export const fetchCityDetails = async (
    name: string,
    country: string,
    code: string
): Promise<CityDetailsResult> => {
    const params = new URLSearchParams({ name, country, code, lang: activeLang() });
    const resp = await fetch(`${API_BASE}/city-details?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/city-details failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as CityDetailsResponseRaw;
    return {
        city: toCity(body.city),
        cached: body.cached,
        details: toDetails(body.details),
    };
};

// --- Progressive "slice" fetchers ------------------------------------------
// One per OpenAI prompt group, fetched in parallel by the city page so it
// paints in phases (prose → lists → facts) on a cold city. Each returns its
// slice of the camelCased details; the page merges them. Backend caches all
// three into the same row, so cost matches the monolithic call.

/** Slice of `CityDetails` returned by one progressive endpoint. */
export type CityDetailsSlice = Partial<CityDetails>;

export interface CityProseResult {
    city: CitySummary;
    cached: boolean;
    details: CityDetailsSlice;
}

const sliceParams = (name: string, country: string, code: string) =>
    new URLSearchParams({ name, country, code, lang: activeLang() });

export const fetchCityProse = async (
    name: string,
    country: string,
    code: string
): Promise<CityProseResult> => {
    const resp = await fetch(
        `${API_BASE}/city-details/prose?${sliceParams(name, country, code)}`
    );
    if (!resp.ok) {
        throw new Error(
            `/city-details/prose failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as {
        city: CitySummaryRaw;
        cached: boolean;
        prose: CityProseRaw;
    };
    return {
        city: toCity(body.city),
        cached: body.cached,
        details: proseFromRaw(body.prose),
    };
};

export const fetchCityLists = async (
    name: string,
    country: string,
    code: string
): Promise<CityDetailsSlice> => {
    const resp = await fetch(
        `${API_BASE}/city-details/lists?${sliceParams(name, country, code)}`
    );
    if (!resp.ok) {
        throw new Error(
            `/city-details/lists failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as { cached: boolean; lists: CityListsRaw };
    return listsFromRaw(body.lists);
};

export const fetchCityFacts = async (
    name: string,
    country: string,
    code: string
): Promise<CityDetailsSlice> => {
    const resp = await fetch(
        `${API_BASE}/city-details/facts?${sliceParams(name, country, code)}`
    );
    if (!resp.ok) {
        throw new Error(
            `/city-details/facts failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as { cached: boolean; facts: CityFactsRaw };
    return factsFromRaw(body.facts);
};
