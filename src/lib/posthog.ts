/**
 * PostHog browser SDK wrapper. Centralizes init / identify / reset so
 * the rest of the app never imports posthog-js directly — keeps the
 * privacy posture promised in the Privacy Policy in exactly one place.
 *
 * What we send to PostHog (matches what the Privacy Policy promises):
 *   - feature-usage events (autocapture clicks/form-submits + any
 *     explicit `capture()` calls).
 *   - an opaque user id (the User UUID) once the user signs in.
 *   - a small set of coarse, non-PII person properties so we can
 *     segment funnels (subscription plan, is_paid_member).
 *
 * What we DON'T send:
 *   - name, email, phone, country, gender, birth year.
 *   - any input field values (autocapture only collects element
 *     metadata, not the values inside <input> / <textarea>).
 *   - session recordings (disabled — see Privacy Policy "we do not
 *     record video of your sessions").
 *
 * Hard requirement before deploying: VITE_POSTHOG_KEY must be set. If
 * it isn't, every helper here becomes a no-op. That keeps local-dev
 * builds without a key from crashing on init AND means PRs that
 * forget the env var simply ship without analytics — better than
 * shipping an exception loop.
 */
import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = 'https://us.i.posthog.com';

let isInitialized = false;

/** Returns true when a key is configured AND init() has run. The
 *  identify / reset / capture helpers below short-circuit when this
 *  is false so unconfigured environments stay silent. */
const ready = (): boolean => isInitialized && Boolean(POSTHOG_KEY);

/** Boot-time init. Called once from `main.tsx`; subsequent calls are
 *  idempotent. Safe to call when the key is missing — we just skip. */
export const initPosthog = (): void => {
    if (isInitialized) return;
    if (!POSTHOG_KEY) {
        if (import.meta.env.DEV) {
            // Loud-in-dev so a missing key in `.env` is obvious during
            // local setup; production builds stay silent.
            console.info(
                '[posthog] VITE_POSTHOG_KEY is not set — analytics disabled.',
            );
        }
        return;
    }
    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        // Create person profiles only for signed-in users. Anonymous
        // visitors still emit events (so we can see homepage funnels),
        // but we don't materialize a profile until they identify —
        // cheaper on PostHog's quota AND less PII at rest.
        person_profiles: 'identified_only',
        // Default `true` — capture pageviews on history change. React
        // Router uses pushState, which posthog-js v1.117+ hooks into
        // automatically so we don't need a manual route effect.
        capture_pageview: true,
        capture_pageleave: true,
        // Session recording stays OFF — the Privacy Policy explicitly
        // promises "we do not record video of your sessions." Don't
        // flip without coordinating a policy update + EU consent
        // flow.
        disable_session_recording: true,
        // Autocapture is on (default) — clicks, form submits. Field
        // VALUES are never captured, only element metadata. We add
        // `data-ph-no-capture` selectively on the sensitive primitives
        // (PhoneInput, etc.) to also strip the element metadata for
        // those fields.
        autocapture: true,
        // Bandwidth tweak: don't fetch feature flags on every page
        // load if we're not using them yet. Flip to true the first
        // time we ship a `posthog.isFeatureEnabled(...)` call.
        advanced_disable_feature_flags: true,
    });
    isInitialized = true;
};

/** Tell PostHog who the current user is, using the opaque user UUID
 *  as the distinct id. The person properties below are deliberately
 *  COARSE and non-PII — they're what we'd need to slice funnels
 *  ("conversion rate by plan") without expanding the PII footprint
 *  beyond what the Privacy Policy promises. */
export interface IdentifyContext {
    id: string;
    /** Provided so the helper can match against `VITE_POSTHOG_IGNORE_EMAILS`
     *  and opt the dev/admin out of capturing entirely. Never sent to
     *  PostHog as a person property (would expand the PII footprint
     *  beyond what the Privacy Policy promises). */
    email?: string;
    subscriptionPlan?: string;
    isPaidMember?: boolean;
    isAdmin?: boolean;
}

// Comma-separated list of email addresses whose sessions should NOT
// be captured. The dev's own account goes here so admin browsing /
// dogfooding traffic doesn't pollute the analytics. Match is
// case-insensitive and trimmed. Reads at module load — restart the
// Vite dev server after editing the .env value.
const IGNORE_EMAILS = ((import.meta.env.VITE_POSTHOG_IGNORE_EMAILS as
    | string
    | undefined) ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const shouldIgnore = (email: string | undefined): boolean => {
    if (!email) return false;
    return IGNORE_EMAILS.includes(email.trim().toLowerCase());
};

export const identifyPosthogUser = (ctx: IdentifyContext): void => {
    if (!ready()) return;
    if (shouldIgnore(ctx.email)) {
        // Opt the browser session out of capturing for the rest of
        // the session. Persisted in posthog-js's own localStorage key
        // so a refresh still respects the opt-out.
        if (!posthog.has_opted_out_capturing()) {
            posthog.opt_out_capturing();
        }
        return;
    }
    // Inverse path — when an ignored user logs out and a normal user
    // logs in on the same browser, flip capturing back on so we don't
    // permanently silence the device after the first dev session.
    if (posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing();
    }
    posthog.identify(ctx.id, {
        subscription_plan: ctx.subscriptionPlan ?? null,
        is_paid_member: Boolean(ctx.isPaidMember),
        is_admin: Boolean(ctx.isAdmin),
    });
};

/** Called on logout. Wipes the distinct id so the next session starts
 *  anonymous again — without this, a shared device would attribute
 *  the next person's events to the previous person's profile. */
export const resetPosthog = (): void => {
    if (!ready()) return;
    posthog.reset();
};

/** Thin pass-through for explicit event capture. Most events come
 *  from autocapture; reach for this when you need a custom event with
 *  structured properties (e.g. `capture('trip.created', { trip_type })`).
 *  Keeps callers from importing posthog-js directly. */
export const capture = (
    event: string,
    properties?: Record<string, unknown>,
): void => {
    if (!ready()) return;
    posthog.capture(event, properties);
};
