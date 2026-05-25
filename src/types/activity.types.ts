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
  /** Only set when `kind === 'train' | 'bus'`. Mirrors the
   *  multi-segment shape of flights so a train with a transfer can
   *  carry two legs. Currently frontend-only — see TransitInfo doc
   *  for the backend-persistence caveat. */
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
}

export interface ItineraryDay {
  id: number;
  date: string;
  activities: Activity[];
}
