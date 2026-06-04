/** Onboarding preferences for the current user. Mirrors the backend
 *  `PreferencesResponse` shape — exposed both via `/me/preferences` and
 *  embedded on `/auth/me` so the UserContext can decide whether to
 *  auto-launch the wizard without an extra round-trip. */
export interface Preferences {
    /** Editable profile fields, persisted on the User row. Embedded on
     *  both `/me/preferences` and `/auth/me` so the same shape is reused
     *  by the Account page and the UserContext. */
    phone: string | null;
    birthYear: number | null;
    countryOfBirthCode: string | null;
    /** UUID of the row in the `genders` catalog. Null when the user
     *  hasn't picked one (or chose to skip). Powers the personalized
     *  "best place this month" recommender. */
    genderId: string | null;
    interests: string[];
    travelerStyles: string[];
    dreamDestinations: string[];
    onboardingCompletedAt: string | null;
    /** City-level home base — used to suggest a depart airport / train
     *  station when the user starts planning a new trip. Privacy-by-
     *  design: we deliberately stop at city granularity (no street
     *  address). All five fields move together — when one is set they
     *  should all be set; clearing the home city nulls all five. */
    homeCity: string | null;
    homeCountry: string | null;
    homeCountryCode: string | null;
    homeLatitude: number | null;
    homeLongitude: number | null;
    /** OPT-IN travel preferences used by the trip recommender to bias
     *  picks (Disney-friendly when kids are present, couple-style
     *  activities for "couple", etc). Stored as coarse slugs only —
     *  see `src/constants/travelCompanions.ts` for the catalog and the
     *  privacy rationale. Empty array means the user hasn't opted in. */
    travelCompanions: string[];
    kidsAgeBuckets: string[];
    /** Per-channel notification preferences. In-app alerts are always on
     *  (no toggle). Email defaults on; SMS is opt-in and only effective
     *  when `phone` is also set to a valid number. */
    notifyEmail: boolean;
    notifySms: boolean;
}

/** Partial update for `PATCH /me/preferences`. Any field set to
 *  `undefined` is omitted from the request (server treats it as
 *  unchanged); pass `null` to explicitly clear a field. */
export interface PreferencesUpdate {
    phone?: string | null;
    birthYear?: number | null;
    countryOfBirthCode?: string | null;
    genderId?: string | null;
    interests?: string[];
    travelerStyles?: string[];
    dreamDestinations?: string[];
    markComplete?: boolean;
    homeCity?: string | null;
    homeCountry?: string | null;
    homeCountryCode?: string | null;
    homeLatitude?: number | null;
    homeLongitude?: number | null;
    travelCompanions?: string[];
    kidsAgeBuckets?: string[];
    notifyEmail?: boolean;
    notifySms?: boolean;
}

/** One row in a slug-based catalog (interests, traveler styles).
 *  Slugs match the backend tuples; labels are display-only. */
export interface CatalogOption {
    slug: string;
    label: string;
}

/** One row in the genders catalog. UUID-keyed because it's a real DB
 *  table (`genders`), unlike the slug-based interest / traveler-style
 *  catalogs which are hard-coded constants. */
export interface GenderOption {
    id: string;
    name: string;
}

/** Back-compat alias — older callsites import `InterestOption`. */
export type InterestOption = CatalogOption;
export type TravelerStyleOption = CatalogOption;
