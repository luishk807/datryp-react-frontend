/** A name + 1-sentence "why" — used for foods, places-to-visit, and
 *  things-to-do on the detail page. Mirrors backend `NamedTip`.
 *
 *  The three image fields (`imageUrl`, `photographerName`,
 *  `photographerUrl`) are optional and only populated for the first-N
 *  `thingsToDo` entries used by the Pro "Experience Highlights" image
 *  strip. All other consumers (foods, photoSpots, notesToKnow,
 *  placesToVisit, topCities, topPlaces) leave them undefined. */
export interface NamedTip {
  name: string;
  why: string;
  imageUrl?: string | null;
  photographerName?: string | null;
  photographerUrl?: string | null;
}

/** Approximate FX rate sourced from OpenAI's training data — display with
 *  an "approximate" caveat in the UI. Mirrors backend `CurrencyInfo`. */
export interface CurrencyInfo {
  code: string;       // e.g. "THB"
  name: string;       // e.g. "Thai Baht"
  ratePerUsd: number; // units of local currency per 1 USD
}

export type SafetyLevel = 'low' | 'moderate' | 'high';

/** Rough traveler-safety read. `score` is 0-100 (100 = safest); `level` is
 *  a coarse band the UI uses for color + label. Mirrors backend `SafetyInfo`. */
export interface SafetyInfo {
  score: number;
  level: SafetyLevel;
  summary: string;
}

/** Approximate lat/lng of the place — feeds the travel-from-your-IP
 *  estimate and the Google Maps deep link. */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** Tourist-visa picture for the destination — ISO 3166-1 alpha-2 codes that
 *  get visa-free / visa-on-arrival entry, plus a free-text fallback summary.
 *  Mirrors backend `VisaInfo`. */
export interface VisaInfo {
  destinationCountryCode: string;
  visaFreeCountries: string[];
  visaOnArrivalCountries: string[];
  summary: string;
}

export type PaymentMethod = 'cash' | 'card' | 'mixed';

/** Free-form short label for a nearby destination's "type": e.g.
 *  "city", "region", "country", "district", "park", "neighborhood".
 *  Kept loose because the backend AI returns context-appropriate values that
 *  don't always fit a small enum (e.g. Tokyo districts, Kyoto parks). */
export type NearbyKind = string;

/** A nearby city / region / country / district / etc. worth visiting from
 *  the current place. Rendered as a clickable card linking to
 *  `/place?q=<name>&i=0`. lat/lng are no longer used by the UI (distance
 *  sort was removed) but stay on the payload so older cached rows
 *  validate. */
export interface NearbyDestination {
  name: string;
  country: string;
  kind: NearbyKind;
  why: string;
  lat: number;
  lng: number;
  /** Unsplash photo URL — populated server-side via the same
   *  `enrich_named_tips_with_unsplash` helper that powers the
   *  "Top 5" cards. Optional because cached rows from before image
   *  enrichment shipped don't carry it; the card falls back to a
   *  gradient + icon when missing. */
  imageUrl?: string | null;
}

/** Locale-specific 'don't leave without...' info — fun energy, nightlife,
 *  signature drink, unique souvenir, and 5 must-do experiences. Mirrors
 *  backend `LocalFlavor`. */
export interface LocalFlavor {
  /** 1 (quiet) – 5 (high-energy party scene). */
  funLevel: number;
  nightlife: string;
  famousLiquor: string;
  uniqueSouvenir: string;
  mustDoBeforeLeaving: NamedTip[];
}

export type Availability = 'common' | 'limited' | 'none';

/** Where to stay — Airbnb vs hotel availability, recommended lodging type,
 *  typical price range, and a booking tip. Mirrors backend `LodgingInfo`. */
export interface LodgingInfo {
  recommendedType: string;
  airbnbAvailability: Availability;
  airbnbNote: string;
  hotelAvailability: Availability;
  hotelNote: string;
  priceRange: string;
  bookingTip: string;
}

/** Practical 'know-before-you-go' info — transport, payment, language, vibe,
 *  audience, age. Mirrors backend `TravelBasics`. */
export interface TravelBasics {
  preferredTransport: string;
  transportSystem: string;
  paymentMethod: PaymentMethod;
  paymentNote: string;
  language: string;
  vibe: string;
  audience: string;
  ageRecommendation: string;
}

/** One airport that serves a destination. AI-populated alongside the
 *  rest of the detail-page payload. IATA code is what travelers
 *  actually book with; `international` flags hub airports vs. small
 *  regional fields. */
export interface Airport {
  iataCode: string;
  name: string;
  distanceKm: number;
  international: boolean;
}

export type PopularityTrend = 'rising' | 'steady' | 'falling';

/** Rough traveler-popularity read for the place this year. `score` is
 *  0-100 (100 = top-tier bucket-list destination right now); `trend` is the
 *  year-over-year direction (rendered as an arrow in the UI); `summary` is
 *  one-line context on what's driving it. Mirrors backend `PopularityInfo`.
 *  Optional because rows cached before this field shipped don't have it —
 *  the UI hides the widget when undefined. */
export interface PopularityInfo {
  score: number;
  trend: PopularityTrend;
  summary: string;
}

/** How walkable a place/city is on foot. `rating` 1-5 (5 = very walkable);
 *  `note` is one short sentence. Mirrors backend `WalkabilityInfo`. */
export interface WalkabilityInfo {
  rating: number;
  note: string;
}

/** A lesser-known spot / area / experience most visitors miss, plus one line
 *  on why it's worth seeking out. Mirrors backend `HiddenGem`. */
export interface HiddenGem {
  name: string;
  why: string;
}

/** Where to stay: best areas + areas to avoid. Mirrors backend
 *  `NeighborhoodTips`. City/place-scoped. */
export interface NeighborhoodTips {
  best: string[];
  avoid: string[];
}

/** Enriched detail-page info. Lazy-fetched per place from `/place-details`. */
export interface PlaceDetails {
  longDescription: string;
  countryDescription: string;
  budgetDescription: string;
  cityHighlight: string;
  countryHighlight: string;
  foods: NamedTip[];
  placesToVisit: NamedTip[];
  thingsToDo: NamedTip[];
  photoSpots: NamedTip[];
  notesToKnow: NamedTip[];
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
  /** Airports serving the place. Sorted by usefulness (largest hub
   *  first). May be empty for rows cached before this field shipped. */
  airports: Airport[];
  /** Year-current traveler-popularity read. Optional for rows cached
   *  before this field shipped — UI hides the meter widget when absent. */
  popularity?: PopularityInfo;
  /** Heads-up on cultural-shock moments a first-time visitor might
   *  experience. Optional for rows cached before this field shipped —
   *  the UI hides the callout when absent. */
  culturalShock?: string;
  /** Actionable "sort this before you fly" checklist. Optional for rows
   *  cached before this field shipped — the UI hides it when empty. */
  beforeYouGo?: string[];
  /** How walkable the place is on foot. Optional for rows cached before this
   *  field shipped — the UI hides the card when absent. */
  walkability?: WalkabilityInfo;
  /** Lesser-known spots most visitors miss. Optional for rows cached before
   *  this field shipped — the UI hides the card when empty. */
  hiddenGems?: HiddenGem[];
  /** Where to stay: best areas + areas to avoid. Optional for rows cached
   *  before this field shipped. */
  neighborhoods?: NeighborhoodTips;
  /** Place-specific "Great for" traveler-type / vibe tags (closed vocabulary).
   *  Drives the "Is this right for you?" match at place granularity instead of
   *  borrowing the country's tags. Empty for rows cached before this field
   *  shipped — the widget falls back to the country tags. */
  greatFor?: string[];
}

export interface PlaceDetailsResult {
  query: string;
  index: number;
  cached: boolean;
  details: PlaceDetails;
}
