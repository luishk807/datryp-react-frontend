export const NO_IMAGE = "./images/logo-gray.png";
export const LOGO_IMAGE = "/images/logo.svg";
export const PAGE_TITLE = "DaTryp.com";

/** Lightweight email validator — checks for `local@domain.tld` shape only.
 *  Not RFC-5321 strict (intentionally — the backend does the authoritative
 *  validation when the email is actually sent). Use this for client-side
 *  "enter a valid email" UX in forms. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Local hero images shown on the homepage when `/hero-images` is empty or unreachable. */
export const FALLBACK_HERO_IMAGES = [
  "/images/sample/iceland.jpg",
  "/images/sample/china1.jpg",
  "/images/sample/china2.jpg",
  "/images/sample/vietnam.jpg",
] as const;

export const ACTION = {
  ADD: "add",
  EDIT: "edit",
  DELETE: "delete",
} as const;

export const BUDGET_STATUS = {
  UNDER: "under",
  WARNING: "warning",
  OVER: "over",
  EMPTY: "empty",
} as const;

export const AUTH_MODE = {
  LOGIN: "login",
  SIGNUP: "signup",
} as const;

/** Role values stored in `users.role` on the Python backend. Admins bypass
 *  paywalls and tier gates; every check should go through a helper, never
 *  compare the literal string at a call site. */
export const USER_ROLE = {
  USER: "user",
  ADMIN: "admin",
} as const;

/** Subscription plan values mirrored from the Python backend's
 *  `users.subscription_plan` column. `'premium'` is reserved for a future
 *  tier — keep it here so feature gates can be written once. */
export const SUBSCRIPTION_PLAN = {
  FREE: "free",
  PRO: "pro",
  PREMIUM: "premium",
} as const;

/** Subscription status mirroring Stripe's lifecycle, normalized to the
 *  states we act on. `'none'` = never subscribed. */
export const SUBSCRIPTION_STATUS = {
  NONE: "none",
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
} as const;

/** Trip-mode tab/prop value (lowercase state-key, distinct from TRIP_BASIC's
 *  display names). 'recommend' is the homepage's AI-recommender tab; components
 *  that only edit a saved trip should narrow this to exclude RECOMMEND. */
export const TRIP_MODE = {
  SINGLE: "single",
  MULTIPLE: "multiple",
  RECOMMEND: "recommend",
} as const;

/** What kind of entry an activity is on the day-by-day timeline. Set on
 *  creation in the activity modal and locked thereafter — editing an
 *  activity can't change its kind (delete + recreate instead).
 *
 *  - `place` (default): a real activity with location/cost/time
 *  - `note`: a free-text reminder pinned to a day, no time slot
 *  - `flight`: a flight entry with depart/arrival airports + datetimes
 */
export const ACTIVITY_KIND = {
  PLACE: "place",
  NOTE: "note",
  FLIGHT: "flight",
} as const;

export const AUTH_LABEL = {
  LOGIN: "Login",
  SIGNUP: "Sign Up",
} as const;

export const BUTTON_VARIANT = {
  PLAIN: "plain",
  TEXT: "text",
  TEXT_PLAIN: "text-plain",
  STANDARD: "standard",
  STANDARD_SMALL: "standard-small",
  STANDARD_MINI: "standard-mini",
  LINE: "line",
  NONE: "none",
} as const;

/**
 * Canonical itinerary-type names. Must match the rows seeded into the backend
 * `interary_types` table. UUIDs live on the backend; these are the keys used
 * to find the right UUID by name (see `useItineraryTypes()`).
 */
export const ITINERARY_TYPE = {
  SINGLE: "Single Destination Trip",
  MULTI: "Multi Destination Trip",
} as const;

/**
 * Canonical trip-status names. Must match the rows seeded into the backend
 * `trip_statuses` table by `app/scripts/seed_lookups.py`. The actual UUIDs
 * live on the backend and are fetched at runtime via `useTripStatuses()`;
 * these constants are the keys we use to find the right UUID by name.
 */
export const TRIP_STATUS = {
  PLANNING: "Planning",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

/** Notification `kind` strings. The backend writes these literal strings to
 *  `notifications.kind`; the inbox UI keys icon + copy off of them. Renaming
 *  any key is a breaking change for already-persisted rows — add a new kind
 *  rather than renaming. Mirrors the KIND_* constants in
 *  `app/services/notifications.py`. */
export const NOTIFICATION_KIND = {
  TRIP_CREATED: "trip_created",
  TRIP_STATUS_CHANGED: "trip_status_changed",
  TRIP_UPDATED: "trip_updated",
  TRIP_COMPLETED: "trip_completed",
  TRIP_CANCELLED: "trip_cancelled",
  TRIP_DELETED: "trip_deleted",
  TRIP_STARTING_SOON: "trip_starting_soon",
} as const;

/** Where a `visited_places` row came from. `MANUAL` = user clicked the
 *  VisitedButton on a place page. `ITINERARY` = the row was created by the
 *  cascade that runs when the user marks one of their own itineraries
 *  complete (the cascade only writes for the completer, never for
 *  participants — see project memory). */
export const VISITED_SOURCE = {
  MANUAL: "manual",
  ITINERARY: "itinerary",
} as const;

/** Where a `saved_*` row came from. Only `MANUAL` is written today
 *  (the user clicked the Save button). Reserved for a future cascade
 *  that auto-bookmarks places added to an itinerary, etc. */
export const SAVED_SOURCE = {
  MANUAL: "manual",
} as const;

export const TRIP_BASIC = {
  SINGLE: {
    id: 1,
    name: "Single",
    route: "/single",
    steps: {
      BASIC: 0,
      FRIEND: 1,
      FINISH: 2,
    },
  },
  MULTIPLE: {
    id: 2,
    name: "Multiple",
    route: "/multiple",
    steps: {
      BASIC: 0,
      FRIEND: 1,
      FINISH: 2,
    },
  },
};
