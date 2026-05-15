export const NO_IMAGE = './images/logo-gray.png';

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

export type TripStatusName = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS];

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