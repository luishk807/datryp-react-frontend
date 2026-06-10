import type {
  ActivityKind,
  FlightInfo,
  Friend,
  ImageRef,
  TransitInfo,
} from "./common.types";

export interface ActivityStatus {
  /** Numeric for legacy sample data; string (UUID) when sourced from the
   *  backend `trip_statuses` lookup. Activities and itineraries share the
   *  same lookup table, so a status assigned via `useTripStatuses()` is
   *  directly persistable on either. */
  id: number | string;
  name: string;
}

export interface ShareCostEntry {
  name: string;
  amount: string;
  status: string;
}

export interface BudgetItem {
  id: number;
  user: Friend;
  budget: string | number;
}

export type BudgetEntry = Omit<BudgetItem, "id">;

export interface Activity {
  id: number;
  /** Backend UUID for this activity, preserved from the API (the numeric
   *  `id` above is a hash for legacy list keys and can't round-trip to the
   *  server). Mirrors how `Friend.userId` keeps the real id alongside the
   *  numeric one. Undefined for freshly-added, not-yet-saved activities.
   *  Required by endpoints that target a specific activity by UUID — e.g.
   *  the per-activity "Notify participants" alert. */
  apiId?: string;
  /** What kind of entry this is on the day timeline. Locked at create
   *  time — editing can't change it. Missing/undefined is treated as
   *  `'place'` so pre-existing activities keep rendering as before. */
  kind?: ActivityKind;
  name?: string;
  place?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  cost?: string | number;
  note?: string;
  image?: ImageRef;
  status?: number | ActivityStatus;
  budget?: BudgetItem[];
  shareCost?: ShareCostEntry[];
  people?: string | number;
  /** Only set when `kind === 'flight'`. The form populates depart /
   *  arrival airports + datetimes; other kinds ignore this field.
   *  Single-segment flights (no layover) carry just one entry; flights
   *  with stopovers carry one entry per leg. The first segment's
   *  depart and the last segment's arrival drive the day-row time
   *  display and sort order. */
  flightSegments?: FlightInfo[];
  /** Only set when `kind === 'train' | 'bus' | 'rental_car'`. Mirrors the
   *  multi-segment shape of flights so a train with a transfer can carry two
   *  legs. Persisted via the generic transport model (mapped to
   *  `transport_legs`) — a train/bus added through Add Activity round-trips a
   *  save now. A destination's ARRIVAL transport (any mode) lives on
   *  `dest.flightInfo` (which carries `mode`), NOT as a flagged activity. */
  transitSegments?: TransitInfo[];
  /** Only set when `kind === 'hotel_checkin' | 'hotel_checkout'`.
   *  Holds the structured hotel fields that don't have an obvious
   *  home on the flat Activity columns — specifically the
   *  confirmation number. Name, address, time, and cost ride on
   *  `name` / `location` / `startTime` / `cost` as usual. */
  hotelInfo?: {
    confirmationNumber?: string;
  };
  /** Structured place data captured when the user picks a real place
   *  from PlaceAutocomplete / PlaceSuggestions. Null/undefined on
   *  free-text activities. The Mapper trip-link cascade (PR 3) reads
   *  these fields to write self-only `visited_places` rows with a
   *  tripId back-link when a trip is marked Completed. */
  placeKey?: string | null;
  placeCity?: string | null;
  placeCountry?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Original URL the user pasted into the Add-Activity smart-entry when
   *  adding a PLACE (e.g. a TripAdvisor / Yelp / Maps page). We extract
   *  the name + pin from it but keep the link so the card can offer a
   *  "View source" affordance. Null on typed (non-URL) entries and on
   *  every non-place kind. */
  sourceUrl?: string | null;
  /** Global (Google Places) rating snapshot captured at place-pull time
   *  during activity creation. Persisted so the card shows the rating to
   *  every viewer (free included) without a live, Pro-gated lookup. Null
   *  on free-text entries and places the lookup didn't match. A point-in-
   *  time value — not re-polled — so it can drift from the live Google
   *  number over the life of a saved trip. */
  googleRating?: number | null;
  googleRatingCount?: number | null;
  /** OpenAI/recommender "overall rating" snapshot captured at add time
   *  (recommender top match for a smart-entry pick, or the rating the AI
   *  trip-generation emits for a place). Blended with the Google +
   *  traveler ratings on the card. A model estimate — no review count.
   *  Null on free-text entries and unrated places. */
  openaiRating?: number | null;
  /** Set by the organizer when they confirm a participant has paid for
   *  this activity. `paidAt` is the date the payment was made (ISO
   *  `YYYY-MM-DD`); `paidBy` is the participant who paid. Both are
   *  organizer-only writes — non-organizers see the chip read-only. The
   *  pair is cleared together when the organizer marks an activity as
   *  unpaid. */
  paidAt?: string | null;
  paidBy?: { id: string; name: string | null } | null;
}

export interface ItineraryDay {
  id: number;
  date: string;
  activities: Activity[];
}
