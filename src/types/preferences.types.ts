/** Onboarding preferences for the current user. Mirrors the backend
 *  `PreferencesResponse` shape — exposed both via `/me/preferences` and
 *  embedded on `/auth/me` so the UserContext can decide whether to
 *  auto-launch the wizard without an extra round-trip. */
export interface Preferences {
    countryOfBirthCode: string | null;
    /** UUID of the row in the `genders` catalog. Null when the user
     *  hasn't picked one (or chose to skip). Powers the personalized
     *  "best place this month" recommender. */
    genderId: string | null;
    interests: string[];
    travelerStyles: string[];
    dreamDestinations: string[];
    onboardingCompletedAt: string | null;
}

/** Partial update for `PATCH /me/preferences`. Any field set to
 *  `undefined` is omitted from the request (server treats it as
 *  unchanged); pass `null` to explicitly clear a field. */
export interface PreferencesUpdate {
    countryOfBirthCode?: string | null;
    genderId?: string | null;
    interests?: string[];
    travelerStyles?: string[];
    dreamDestinations?: string[];
    markComplete?: boolean;
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
