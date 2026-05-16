export const NO_IMAGE = './images/logo-gray.png';
export const LOGO_IMAGE = '/images/logo.svg';

/** Local hero images shown on the homepage when `/hero-images` is empty or unreachable. */
export const FALLBACK_HERO_IMAGES = [
    '/images/sample/iceland.jpg',
    '/images/sample/china1.jpg',
    '/images/sample/china2.jpg',
    '/images/sample/vietnam.jpg',
] as const;

export const ACTION = {
    ADD: 'add',
    EDIT: 'edit',
    DELETE: 'delete',
} as const;

export const BUDGET_STATUS = {
    UNDER: 'under',
    WARNING: 'warning',
    OVER: 'over',
    EMPTY: 'empty',
} as const;

export const AUTH_MODE = {
    LOGIN: 'login',
    SIGNUP: 'signup',
} as const;

/** Trip-mode tab/prop value (lowercase state-key, distinct from TRIP_BASIC's
 *  display names). 'recommend' is the homepage's AI-recommender tab; components
 *  that only edit a saved trip should narrow this to exclude RECOMMEND. */
export const TRIP_MODE = {
    SINGLE: 'single',
    MULTIPLE: 'multiple',
    RECOMMEND: 'recommend',
} as const;

export const AUTH_LABEL = {
    LOGIN: 'Login',
    SIGNUP: 'Sign Up',
} as const;

export const BUTTON_VARIANT = {
    PLAIN: 'plain',
    TEXT: 'text',
    TEXT_PLAIN: 'text-plain',
    STANDARD: 'standard',
    STANDARD_SMALL: 'standard-small',
    STANDARD_MINI: 'standard-mini',
    LINE: 'line',
    NONE: 'none',
} as const;

/**
 * Canonical itinerary-type names. Must match the rows seeded into the backend
 * `interary_types` table. UUIDs live on the backend; these are the keys used
 * to find the right UUID by name (see `useItineraryTypes()`).
 */
export const ITINERARY_TYPE = {
    SINGLE: 'Single Destination Trip',
    MULTI: 'Multi Destination Trip',
} as const;

/**
 * Canonical trip-status names. Must match the rows seeded into the backend
 * `trip_statuses` table by `app/scripts/seed_lookups.py`. The actual UUIDs
 * live on the backend and are fetched at runtime via `useTripStatuses()`;
 * these constants are the keys we use to find the right UUID by name.
 */
export const TRIP_STATUS = {
    PLANNING: 'Planning',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
} as const;

export const TRIP_BASIC = {
    SINGLE: {
        id: 1,
        name: 'Single',
        route: '/single',
        steps: {
            BASIC: 0,
            FRIEND: 1,
            FINISH: 2
        }
    },
    MULTIPLE: {
        id: 2,
        name: 'Multiple',
        route: '/multiple',
        steps: {
            BASIC: 0,
            FRIEND: 1,
            FINISH: 2
        }
    }
};