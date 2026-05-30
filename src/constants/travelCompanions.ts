/**
 * Frontend mirror of the backend `app.core.travel_companions` catalog.
 *
 * PRIVACY POSTURE
 * ---------------
 * Both fields are opt-in. The pickers default to empty selection, the
 * kids-age picker is hidden unless `family_kids` is among the chosen
 * travel-companion slugs, and the slugs themselves are intentionally
 * coarse (age BUCKETS, not exact ages; no names; no marital status).
 * See [src/components/Sections/Privacy/index.tsx] for the user-facing
 * description and consent copy.
 *
 * Slugs must stay in lockstep with the backend catalog — they're
 * persisted on the User row and read by both the API validator and
 * the AI prompts. Add new buckets only after a product review.
 */

export const TRAVEL_COMPANIONS = [
    { slug: 'solo', label: 'Solo' },
    { slug: 'couple', label: 'Couple' },
    { slug: 'family_kids', label: 'Family with kids' },
    { slug: 'with_friends', label: 'With friends' },
] as const;

export type TravelCompanionSlug = (typeof TRAVEL_COMPANIONS)[number]['slug'];

export const KIDS_AGE_BUCKETS = [
    { slug: '0-2', label: '0–2 (toddlers)' },
    { slug: '3-5', label: '3–5 (pre-school)' },
    { slug: '6-9', label: '6–9 (school-age)' },
    { slug: '10-12', label: '10–12 (tweens)' },
    { slug: '13-17', label: '13–17 (teens)' },
] as const;

export type KidsAgeBucketSlug = (typeof KIDS_AGE_BUCKETS)[number]['slug'];

/** True when the kids-age picker should be visible — i.e. the user
 *  has indicated they travel as a family with children. Centralizes
 *  the linkage so the Account UI and any future surfaces (signup
 *  wizard, AI prompts) agree on when to surface the picker. */
export const shouldShowKidsAgePicker = (
    companions: readonly string[],
): boolean => companions.includes('family_kids');
