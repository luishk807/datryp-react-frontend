/**
 * Fetch wrapper for `GET /country-details?code=XX` on the Python backend.
 * REST (not GraphQL) — see backend `app/routers/country_details.py`.
 */
import type {
    CountryDetails,
    CountryDetailsResult,
    CountrySummary,
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

interface CapitalCoordinatesRaw {
    lat: number;
    lng: number;
}

interface CountryDetailsRaw {
    long_description: string;
    capital_city: string;
    capital_coordinates?: CapitalCoordinatesRaw | null;
    budget_description: string;
    country_highlight: string;
    top_cities: NamedTipRaw[];
    foods: NamedTipRaw[];
    things_to_do: NamedTipRaw[];
    photo_spots: NamedTipRaw[];
    notes_to_know: NamedTipRaw[];
    best_time_to_visit: string;
    worst_time_to_visit: string;
    weather: string;
    currency: CurrencyInfoRaw;
    safety: SafetyInfoRaw;
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

interface CountrySummaryRaw {
    id: string;
    name: string;
    code: string;
    local: string | null;
    image: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface CountryDetailsResponseRaw {
    country: CountrySummaryRaw;
    cached: boolean;
    details: CountryDetailsRaw;
}

const toCountry = (raw: CountrySummaryRaw): CountrySummary => ({
    id: raw.id,
    name: raw.name,
    code: raw.code,
    local: raw.local,
    image: raw.image,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
});

// Per-group mappers — one per OpenAI prompt group (prose / lists / facts).
// The progressive "slice" endpoints return one group each; the monolithic
// `/country-details` composes all three (see `toDetails`). Sub-objects are
// guarded for the slice schemas' permissive nulls — harmless on the full row.

type CountryProseRaw = Pick<
    CountryDetailsRaw,
    | "long_description"
    | "capital_city"
    | "capital_coordinates"
    | "budget_description"
    | "country_highlight"
    | "weather"
    | "best_time_to_visit"
    | "worst_time_to_visit"
    | "cultural_shock"
    | "before_you_go"
>;

type CountryListsRaw = Pick<
    CountryDetailsRaw,
    | "top_cities"
    | "foods"
    | "things_to_do"
    | "photo_spots"
    | "notes_to_know"
    | "nearby_destinations"
> & { local_flavor: LocalFlavorRaw | null };

type CountryFactsRaw = {
    currency: CurrencyInfoRaw | null;
    safety: SafetyInfoRaw | null;
    travel_basics: TravelBasicsRaw | null;
    lodging: LodgingInfoRaw | null;
    cost_level: number;
    visa: VisaInfoRaw | null;
    airports?: AirportRaw[];
    tourist_rating?: number;
    popularity?: CountryDetailsRaw["popularity"];
};

const proseFromRaw = (raw: CountryProseRaw): Partial<CountryDetails> => ({
    longDescription: raw.long_description,
    capitalCity: raw.capital_city,
    capitalCoordinates: raw.capital_coordinates
        ? { lat: raw.capital_coordinates.lat, lng: raw.capital_coordinates.lng }
        : undefined,
    budgetDescription: raw.budget_description,
    countryHighlight: raw.country_highlight,
    weather: raw.weather,
    bestTimeToVisit: raw.best_time_to_visit,
    worstTimeToVisit: raw.worst_time_to_visit,
    culturalShock: raw.cultural_shock ?? undefined,
    beforeYouGo: raw.before_you_go ?? undefined,
});

const listsFromRaw = (raw: CountryListsRaw): Partial<CountryDetails> => ({
    topCities: raw.top_cities.map(toNamedTip),
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

const factsFromRaw = (raw: CountryFactsRaw): Partial<CountryDetails> => ({
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

const toDetails = (raw: CountryDetailsRaw): CountryDetails =>
    ({
        ...proseFromRaw(raw),
        ...listsFromRaw(raw),
        ...factsFromRaw(raw),
    }) as CountryDetails;

export const fetchCountryDetails = async (
    code: string
): Promise<CountryDetailsResult> => {
    const params = new URLSearchParams({ code, lang: activeLang() });
    const resp = await fetch(`${API_BASE}/country-details?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/country-details failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as CountryDetailsResponseRaw;
    return {
        country: toCountry(body.country),
        cached: body.cached,
        details: toDetails(body.details),
    };
};

// --- Progressive "slice" fetchers ------------------------------------------
// One per OpenAI prompt group, fetched in parallel by the country page so it
// paints in phases (prose → lists → facts) on a cold country. Backend caches
// all three into the same row, so cost matches the monolithic call.

export type CountryDetailsSlice = Partial<CountryDetails>;

export interface CountryProseResult {
    country: CountrySummary;
    cached: boolean;
    details: CountryDetailsSlice;
}

export const fetchCountryProse = async (
    code: string
): Promise<CountryProseResult> => {
    const params = new URLSearchParams({ code, lang: activeLang() });
    const resp = await fetch(`${API_BASE}/country-details/prose?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/country-details/prose failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as {
        country: CountrySummaryRaw;
        cached: boolean;
        prose: CountryProseRaw;
    };
    return {
        country: toCountry(body.country),
        cached: body.cached,
        details: proseFromRaw(body.prose),
    };
};

export const fetchCountryLists = async (
    code: string
): Promise<CountryDetailsSlice> => {
    const params = new URLSearchParams({ code, lang: activeLang() });
    const resp = await fetch(`${API_BASE}/country-details/lists?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/country-details/lists failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as {
        cached: boolean;
        lists: CountryListsRaw;
    };
    return listsFromRaw(body.lists);
};

export const fetchCountryFacts = async (
    code: string
): Promise<CountryDetailsSlice> => {
    const params = new URLSearchParams({ code, lang: activeLang() });
    const resp = await fetch(`${API_BASE}/country-details/facts?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/country-details/facts failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as {
        cached: boolean;
        facts: CountryFactsRaw;
    };
    return factsFromRaw(body.facts);
};
