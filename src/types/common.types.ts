import type {
  ACTION,
  ACTIVITY_EXPECTATION,
  ACTIVITY_KIND,
  ADD_METHOD,
  AUTH_MODE,
  BUDGET_STATUS,
  BUTTON_VARIANT,
  ITINERARY_TYPE,
  MAINTENANCE_MODE,
  NOTIFY_CHANNEL,
  OFFLINE_STATUS,
  REVIEW_CATEGORY,
  REVIEW_VISIBILITY,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
  TRIP_EXPECTATION,
  TRIP_MODE,
  TRIP_STATUS,
  USER_ROLE,
} from "constants";

export type ActionType = (typeof ACTION)[keyof typeof ACTION];
export type ReviewCategory = (typeof REVIEW_CATEGORY)[keyof typeof REVIEW_CATEGORY];
export type ReviewVisibility = (typeof REVIEW_VISIBILITY)[keyof typeof REVIEW_VISIBILITY];
export type ActivityExpectation = (typeof ACTIVITY_EXPECTATION)[keyof typeof ACTIVITY_EXPECTATION];
export type TripExpectation = (typeof TRIP_EXPECTATION)[keyof typeof TRIP_EXPECTATION];
export type ActivityKind = (typeof ACTIVITY_KIND)[keyof typeof ACTIVITY_KIND];
export type AddMethod = (typeof ADD_METHOD)[keyof typeof ADD_METHOD];
export type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];
export type BudgetStatus = (typeof BUDGET_STATUS)[keyof typeof BUDGET_STATUS];
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];
export type ItineraryTypeName = (typeof ITINERARY_TYPE)[keyof typeof ITINERARY_TYPE];
export type MaintenanceMode = (typeof MAINTENANCE_MODE)[keyof typeof MAINTENANCE_MODE];
export type NotifyChannel = (typeof NOTIFY_CHANNEL)[keyof typeof NOTIFY_CHANNEL];
export type OfflineStatus = (typeof OFFLINE_STATUS)[keyof typeof OFFLINE_STATUS];
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
export type TripMode = (typeof TRIP_MODE)[keyof typeof TRIP_MODE];
export type TripStatusName = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS];
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/**
 * Shared props for "add/edit modal button" components (e.g. AddDestination,
 * AddPlaceBtn). Extend it and add the fields unique to that component.
 * - TDraft: shape passed to onChange (the work-in-progress object)
 * - TData:  shape of the existing record being edited
 */
export interface AddEditButtonProps<TDraft, TData> {
  onChange?: (item: TDraft) => void;
  type?: typeof ACTION.ADD | typeof ACTION.EDIT;
  data?: TData | null;
  buttonType?: typeof BUTTON_VARIANT.TEXT | typeof BUTTON_VARIANT.STANDARD;
  isViewMode?: boolean;
}

export interface Friend {
  id: number;
  label?: string;
  name?: string;
  /** Backend User UUID — preserved so the save mutation can use it for
   * participantIds / organizerIds. Optional for legacy/mock entries. */
  userId?: string;
}

export interface Country {
  id: number | string;
  name: string;
  code?: string;
  local?: string;
  image?: string;
}

export interface FlightInfo {
  /** Transport mode this booking represents. Backed by the generic
   *  `transports` table — a flight is just `mode === 'flight'`. Defaults to
   *  'flight' when omitted (legacy / flight-only callers). Lets a destination
   *  ARRIVAL carry a train/bus/rental on `dest.flightInfo` without a separate
   *  field, and TransportHeader renders the right label off it. */
  mode?: ActivityKind;
  departDate?: string;
  departTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  flightNumber?: string;
  departAirport?: string;
  arrivalAirport?: string;
  /** Carrier / operator for ground transport (JR, FlixBus, Hertz). Null on
   *  flights, which identify by `flightNumber`. Maps to `transport_leg.carrier`. */
  carrier?: string;
  /** Free-form seat / class / fare (train class, seat number). Maps to
   *  `transport_leg.seat_or_class`. */
  seatOrClass?: string;
  /** Total cost for the whole booking. One number, not per-segment —
   *  multi-leg flights still have a single fare. Per-friend split
   *  (who's paying) is queued for a follow-up and will live in its own
   *  table the way `activity_budgets` does. */
  cost?: string | number;
  /** Single payer for the booking. Covers "one friend paid for the
   *  group" without the complexity of per-friend amounts. When
   *  `budgets` has exactly one entry, this auto-derives from it for
   *  callers that only render the headline. */
  paidBy?: { id: string; name: string | null } | null;
  /** Date the booking was paid (ISO `YYYY-MM-DD`). Cleared together
   *  with `paidBy` when the organizer marks the flight as unpaid.
   *  Same organizer-only edit gating as the activity-level fields. */
  paidAt?: string | null;
  /** Per-friend split of the flight cost. Same shape as `BudgetItem`
   *  (from activity.types) but inlined here to avoid a circular import
   *  between common.types and activity.types. Empty / missing means
   *  no split is configured. */
  budgets?: Array<{ id: number; user: Friend; budget: string | number }>;
  /** Per-leg breakdown for destination-level flights when the flight has
   *  stopovers. Single-leg flights leave this undefined (or carry a
   *  one-element list with the same values as the flat fields above).
   *  The flat fields stay populated as a cached view of segment 0 for
   *  legacy callers that only render the headline. Only meaningful on
   *  the destination's `flightInfo` field — `Activity.flightSegments`
   *  already handles activity-level multi-leg flights via its own list. */
  segments?: FlightInfo[];
}

/** One leg of a ground-transport (train / bus) activity. Mirrors
 *  `FlightInfo` but with stations instead of airports and an
 *  `operator` for the carrier (Renfe, JR, FlixBus, etc.). Optional
 *  `classOrSeat` covers train class / seat number / bus seat all in
 *  one freeform field — keeps the form short.
 *
 *  Currently frontend-only; the backend `activities` table doesn't
 *  yet have a join-table equivalent of `activity_flight_segments`
 *  for transit, so structured station info won't round-trip a save
 *  until that ships. The kind + name + cost + times will persist
 *  via the standard Activity columns. */
export interface TransitInfo {
  operator?: string;
  number?: string;
  departStation?: string;
  arrivalStation?: string;
  departDate?: string;
  departTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  classOrSeat?: string;
}

export interface ImageRef {
  url: string;
  name: string;
}
