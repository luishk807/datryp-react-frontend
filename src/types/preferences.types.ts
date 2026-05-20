/** Onboarding preferences for the current user. Mirrors the backend
 *  `PreferencesResponse` shape — exposed both via `/me/preferences` and
 *  embedded on `/auth/me` so the UserContext can decide whether to
 *  auto-launch the wizard without an extra round-trip. */
export interface Preferences {
    countryOfBirthCode: string | null;
    interests: string[];
    onboardingCompletedAt: string | null;
}

/** Partial update for `PATCH /me/preferences`. Any field set to
 *  `undefined` is omitted from the request (server treats it as
 *  unchanged); pass `null` to explicitly clear a field. */
export interface PreferencesUpdate {
    countryOfBirthCode?: string | null;
    interests?: string[];
    markComplete?: boolean;
}

/** One row in the interest chip catalog (`GET /me/interests-catalog`).
 *  Slugs match the backend `INTERESTS` tuple; labels are display-only. */
export interface InterestOption {
    slug: string;
    label: string;
}
