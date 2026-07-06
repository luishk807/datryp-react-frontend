/**
 * Fetch wrapper for `GET /place-recommendations` on the Python backend.
 * REST (not GraphQL) — see backend `app/routers/place_recommendations.py`.
 */
import type {
    PlaceDetails,
    PlaceDetailsResult,
    PlaceRecommendation,
    PlaceRecommendationsResult,
} from 'types';
import { QueryBlockedError } from 'api/moderationError';
import { SearchQuotaExceededError } from 'api/searchQuotaError';
import { getAuthToken } from 'api/authStorage';
import { activeLang } from 'i18n';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface PlaceItemRaw {
    name: string;
    city: string;
    country: string;
    country_code: string | null;
    rating: number;
    best_time_to_visit: string;
    description: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
    latitude: number | null;
    longitude: number | null;
}

/** Mirrors backend NamedTip — name + 1-sentence why, plus the optional
 *  Unsplash enrichment trio that's only populated for the first-N
 *  `things_to_do` entries (Pro "Experience Highlights" image strip). */
interface NamedTipRawWithImage {
    name: string;
    why: string;
    image_url?: string | null;
    photographer_name?: string | null;
    photographer_url?: string | null;
}

const toNamedTip = (raw: NamedTipRawWithImage) => ({
    name: raw.name,
    why: raw.why,
    imageUrl: raw.image_url ?? undefined,
    photographerName: raw.photographer_name ?? undefined,
    photographerUrl: raw.photographer_url ?? undefined,
});

interface PlaceRecommendationsResponseRaw {
    query: string;
    cached: boolean;
    items: PlaceItemRaw[];
    // Results-page extras — only present on the discovery search path (and on
    // cache rows written after the field shipped). See PlaceRecommendationsResult.
    summary?: string | null;
    related_searches?: string[] | null;
}

const toPlace = (raw: PlaceItemRaw): PlaceRecommendation => ({
    name: raw.name,
    city: raw.city,
    country: raw.country,
    countryCode: raw.country_code ?? null,
    rating: raw.rating,
    bestTimeToVisit: raw.best_time_to_visit,
    description: raw.description,
    imageUrl: raw.image_url,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
});

export const fetchPlaceRecommendations = async (
    query: string,
    limit = 2,
    country?: string,
    // 'suggestion' marks the auto-fired Add-Activity suggestion strip, which
    // the backend exempts from the free-tier search quota. Explicit user
    // searches (homepage / smart-entry) use the default 'search'.
    kind: 'search' | 'suggestion' = 'search'
): Promise<PlaceRecommendationsResult> => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (country && country.trim()) {
        params.set('country', country.trim());
    }
    if (kind === 'suggestion') {
        params.set('kind', 'suggestion');
    }
    // Generate + cache the result cards (descriptions, best-time, country
    // names) in the active UI language.
    params.set('lang', activeLang());
    // /place-recommendations now requires auth — attach the bearer token.
    // Anonymous calls get 401 from the route and surface here as a thrown
    // Error; the SearchResults page lifts the user into the login flow.
    const token = getAuthToken();
    const resp = await fetch(`${API_BASE}/place-recommendations?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (resp.status === 422) {
        // Travel-scope moderation hit. Body shape: `{ detail: { blocked, category } }`.
        // Anything malformed falls through to the generic error branch below.
        try {
            const errBody = (await resp.json()) as {
                detail?: { blocked?: boolean; category?: string };
            };
            if (errBody.detail?.blocked) {
                throw new QueryBlockedError(errBody.detail.category ?? 'other');
            }
        } catch (parseErr) {
            if (parseErr instanceof QueryBlockedError) throw parseErr;
            // fall through to generic error
        }
    }
    if (resp.status === 402) {
        // Free-tier daily quota hit. Body shape:
        // `{ detail: { quota_exceeded, limit, used, resets_at } }`.
        try {
            const errBody = (await resp.json()) as {
                detail?: {
                    quota_exceeded?: boolean;
                    limit?: number;
                    used?: number;
                    resets_at?: string;
                };
            };
            if (errBody.detail?.quota_exceeded) {
                throw new SearchQuotaExceededError({
                    limit: errBody.detail.limit ?? 5,
                    used: errBody.detail.used ?? 0,
                    resetsAt: errBody.detail.resets_at ?? null,
                });
            }
        } catch (parseErr) {
            if (parseErr instanceof SearchQuotaExceededError) throw parseErr;
            // fall through to generic error
        }
    }
    if (!resp.ok) {
        throw new Error(
            `/place-recommendations failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as PlaceRecommendationsResponseRaw;
    return {
        query: body.query,
        cached: body.cached,
        items: body.items.map(toPlace),
        summary: body.summary ?? undefined,
        relatedSearches: body.related_searches ?? undefined,
    };
};

/**
 * Go-direct entry for a KNOWN place. Seeds (or reuses) a single-place cache row
 * server-side and returns its canonical `query` + a one-item list, so the place
 * page can render the header and fire the detail slices WITHOUT first running
 * the 5-result AI recommender. Used by saved / visited / map navigations that
 * already carry name + city + country. Not billed (no SearchEvent, no quota).
 *
 * Returns the same `PlaceRecommendationsResult` shape as `fetchPlaceRecommendations`
 * (with `items.length === 1` at index 0) so the place page consumes it identically.
 */
export const fetchPlaceDirect = async (
    name: string,
    city: string,
    country: string
): Promise<PlaceRecommendationsResult> => {
    const params = new URLSearchParams({ name, lang: activeLang() });
    if (city.trim()) params.set('city', city.trim());
    if (country.trim()) params.set('country', country.trim());
    const token = getAuthToken();
    const resp = await fetch(`${API_BASE}/place-direct?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!resp.ok) {
        throw new Error(
            `/place-direct failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as PlaceRecommendationsResponseRaw;
    return {
        query: body.query,
        cached: body.cached,
        items: body.items.map(toPlace),
    };
};

// ─── /place-details ────────────────────────────────────────────────────────

interface CurrencyInfoRaw {
    code: string;
    name: string;
    rate_per_usd: number;
}

interface SafetyInfoRaw {
    score: number;
    level: 'low' | 'moderate' | 'high';
    summary: string;
}

interface CoordinatesRaw {
    lat: number;
    lng: number;
}

interface TravelBasicsRaw {
    preferred_transport: string;
    transport_system: string;
    payment_method: 'cash' | 'card' | 'mixed';
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
    airbnb_availability: 'common' | 'limited' | 'none';
    airbnb_note: string;
    hotel_availability: 'common' | 'limited' | 'none';
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
    must_do_before_leaving: { name: string; why: string }[];
}

interface AirportRaw {
    iata_code: string;
    name: string;
    distance_km: number;
    international: boolean;
}

interface PopularityInfoRaw {
    score: number;
    trend: 'rising' | 'steady' | 'falling';
    summary: string;
}

interface PlaceDetailsRaw {
    long_description: string;
    country_description: string;
    budget_description: string;
    city_highlight: string;
    country_highlight: string;
    foods: NamedTipRawWithImage[];
    places_to_visit: NamedTipRawWithImage[];
    things_to_do: NamedTipRawWithImage[];
    photo_spots: NamedTipRawWithImage[];
    notes_to_know: NamedTipRawWithImage[];
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
    popularity?: PopularityInfoRaw | null;
    walkability?: { rating: number; note: string } | null;
    cultural_shock?: string | null;
    before_you_go?: string[];
    hidden_gems?: { name: string; why: string }[];
}

interface PlaceDetailsResponseRaw {
    query: string;
    index: number;
    cached: boolean;
    details: PlaceDetailsRaw;
}

// Per-group mappers — one per OpenAI prompt group (prose / lists / facts).
// The progressive "slice" endpoints return one group each; the monolithic
// `/place-details` composes all three (see `toDetails`). Sub-objects are
// guarded for the slice schemas' permissive nulls — harmless on the full row.

type PlaceProseRaw = Pick<
    PlaceDetailsRaw,
    | 'long_description'
    | 'country_description'
    | 'budget_description'
    | 'city_highlight'
    | 'country_highlight'
    | 'weather'
    | 'worst_time_to_visit'
    | 'cultural_shock'
    | 'before_you_go'
    | 'hidden_gems'
>;

type PlaceListsRaw = Pick<
    PlaceDetailsRaw,
    | 'foods'
    | 'places_to_visit'
    | 'things_to_do'
    | 'photo_spots'
    | 'notes_to_know'
    | 'nearby_destinations'
> & { local_flavor: LocalFlavorRaw | null };

type PlaceFactsRaw = {
    currency: CurrencyInfoRaw | null;
    safety: SafetyInfoRaw | null;
    coordinates: CoordinatesRaw | null;
    travel_basics: TravelBasicsRaw | null;
    lodging: LodgingInfoRaw | null;
    cost_level: number;
    visa: VisaInfoRaw | null;
    airports?: AirportRaw[];
    popularity?: PopularityInfoRaw | null;
    walkability?: { rating: number; note: string } | null;
};

const proseFromRaw = (raw: PlaceProseRaw): Partial<PlaceDetails> => ({
    longDescription: raw.long_description,
    countryDescription: raw.country_description,
    budgetDescription: raw.budget_description,
    cityHighlight: raw.city_highlight,
    countryHighlight: raw.country_highlight,
    weather: raw.weather,
    worstTimeToVisit: raw.worst_time_to_visit,
    culturalShock: raw.cultural_shock ?? undefined,
    beforeYouGo: raw.before_you_go ?? undefined,
    hiddenGems: raw.hidden_gems
        ?.filter((g) => g?.name)
        .map((g) => ({ name: g.name, why: g.why ?? '' })),
});

const listsFromRaw = (raw: PlaceListsRaw): Partial<PlaceDetails> => ({
    foods: raw.foods.map(toNamedTip),
    placesToVisit: raw.places_to_visit.map(toNamedTip),
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

const factsFromRaw = (raw: PlaceFactsRaw): Partial<PlaceDetails> => ({
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
    airports: (raw.airports ?? []).map((a) => ({
        iataCode: a.iata_code,
        name: a.name,
        distanceKm: a.distance_km,
        international: a.international,
    })),
    popularity: raw.popularity
        ? {
              score: raw.popularity.score,
              trend: raw.popularity.trend,
              summary: raw.popularity.summary,
          }
        : undefined,
    walkability:
        raw.walkability && raw.walkability.rating >= 1
            ? {
                  rating: raw.walkability.rating,
                  note: raw.walkability.note ?? '',
              }
            : undefined,
});

const toDetails = (raw: PlaceDetailsRaw): PlaceDetails =>
    ({
        ...proseFromRaw(raw),
        ...listsFromRaw(raw),
        ...factsFromRaw(raw),
    }) as PlaceDetails;

const authHeaders = (): Record<string, string> | undefined => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
};

export const fetchPlaceDetails = async (
    query: string,
    index: number
): Promise<PlaceDetailsResult> => {
    const params = new URLSearchParams({ q: query, i: String(index), lang: activeLang() });
    // /place-details requires auth on the backend (`Depends(get_current_user)`);
    // forward the same bearer token used by /place-recommendations or the
    // request gets rejected as anonymous.
    const resp = await fetch(`${API_BASE}/place-details?${params}`, {
        headers: authHeaders(),
    });
    if (!resp.ok) {
        throw new Error(
            `/place-details failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as PlaceDetailsResponseRaw;
    return {
        query: body.query,
        index: body.index,
        cached: body.cached,
        details: toDetails(body.details),
    };
};

// --- Progressive "slice" fetchers ------------------------------------------
// The place page slices the DETAIL enrichment (step 2) into prose / lists /
// facts so it paints in phases once the recommendation lands. Each returns its
// slice of the camelCased details; the page merges them. Backend caches all
// three into the same row, so cost matches the monolithic call.

export type PlaceDetailsSlice = Partial<PlaceDetails>;

const fetchPlaceSlice = async <TBody, K extends keyof TBody>(
    path: 'prose' | 'lists' | 'facts',
    query: string,
    index: number,
    key: K,
    map: (group: TBody[K]) => PlaceDetailsSlice
): Promise<PlaceDetailsSlice> => {
    const params = new URLSearchParams({ q: query, i: String(index), lang: activeLang() });
    const resp = await fetch(`${API_BASE}/place-details/${path}?${params}`, {
        headers: authHeaders(),
    });
    if (!resp.ok) {
        throw new Error(
            `/place-details/${path} failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as TBody;
    return map(body[key]);
};

export const fetchPlaceProse = (
    query: string,
    index: number
): Promise<PlaceDetailsSlice> =>
    fetchPlaceSlice<{ prose: PlaceProseRaw }, 'prose'>(
        'prose',
        query,
        index,
        'prose',
        proseFromRaw
    );

export const fetchPlaceLists = (
    query: string,
    index: number
): Promise<PlaceDetailsSlice> =>
    fetchPlaceSlice<{ lists: PlaceListsRaw }, 'lists'>(
        'lists',
        query,
        index,
        'lists',
        listsFromRaw
    );

export const fetchPlaceFacts = (
    query: string,
    index: number
): Promise<PlaceDetailsSlice> =>
    fetchPlaceSlice<{ facts: PlaceFactsRaw }, 'facts'>(
        'facts',
        query,
        index,
        'facts',
        factsFromRaw
    );
