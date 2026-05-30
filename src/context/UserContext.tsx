import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    useCurrentUser,
    useLogin,
    useLogout,
    useSignup,
} from 'api/hooks/useAuth';
import { savedPlacesKey } from 'api/hooks/useSavedPlaces';
import { savedCitiesKey } from 'api/hooks/useSavedCities';
import { savedCountriesKey } from 'api/hooks/useSavedCountries';
import type { SignupPayload } from 'api/authApi';
import { USER_ROLE } from 'constants';
import type { SubscriptionPlan, SubscriptionStatus, UserRole } from 'types';
import { migrateLocalBookmarks } from 'utils/migrateLocalBookmarks';

export type PaymentType = 'card' | 'paypal' | 'venmo' | 'other';

export interface UserFriend {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    pending?: boolean;
}

export interface User {
    id: string;
    name: string;
    email?: string;
    paymentType?: PaymentType;
    friends?: UserFriend[];
    /** Server-authoritative phone, year-of-birth, and ISO-2 country of
     *  birth. Persisted via `PATCH /me/preferences`; read off `/auth/me`.
     *  Previously these lived in localStorage and silently vanished on a
     *  new browser / re-login — see git history for the migration. */
    phone: string | null;
    birthYear: number | null;
    /** Authoritative role from the backend's `users.role` column. Drives
     *  admin bypass on paywalls and tier gates — never derive this from the
     *  client or trust localStorage. */
    role: UserRole;
    /** Subscription state, re-shaped to camelCase from the wire format.
     *  Server-authoritative — the Stripe webhook is the source of truth. */
    subscriptionPlan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    /** Free-tier saved-trip ceiling for this user. Paid members and admins
     *  ignore this — they have no cap. UI should still display it as
     *  "{tripCount} / {effectiveTripCap}" for free users. */
    effectiveTripCap: number;
    /** Server-derived flag — true when the user has an active paid plan and
     *  a status that warrants paid access (trial / active / past-due grace).
     *  Prefer this over re-deriving from plan + status on the client. */
    isPaidMember: boolean;
    /** ISO-8601 timestamps, set by the Stripe webhook. Null when there's no
     *  active subscription / trial. Components render them as "trial ends in
     *  X days" / "renews on Y" — see SubscriptionSection. */
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    /** True when the user has cancelled via the Customer Portal but the
     *  current period is still active. */
    cancelAtPeriodEnd: boolean;
    /** Server-authoritative ISO-2 country code from `/me/preferences`.
     *  Persisted on the User row; replaced the localStorage `countryOfBirth`
     *  overlay so it survives a new browser / re-login. */
    countryOfBirthCode: string | null;
    /** Interest slugs the user picked during onboarding (or later on the
     *  Account page). Empty array = none chosen yet. */
    interests: string[];
    /** Traveler-style slugs from the same onboarding step. Powers the
     *  personalized "Places you might love" homepage section. */
    travelerStyles: string[];
    /** ISO-2 country codes the user flagged as dream destinations. Same
     *  source as `interests` — drives personalized recommendations. */
    dreamDestinations: string[];
    /** UUID of the row in the `genders` catalog (Male / Female /
     *  Non-binary / Prefer not to say). Null when unset. Powers the
     *  Pro "best place this month" recommender. */
    genderId: string | null;
    /** ISO-8601 timestamp marking when the user finished or explicitly
     *  skipped the onboarding wizard. Null means "needs the wizard" — the
     *  auto-launcher in App reads this. */
    onboardingCompletedAt: string | null;
    /** Public CloudFront URL of the user's profile picture, or null if
     *  they haven't uploaded one. Drives the circle avatar on the
     *  Account page and in the Header. */
    profileImageUrl: string | null;
    /** City-level home base. All five fields move together; null when
     *  the user hasn't set a home city. Used by trip creation to seed
     *  the depart-airport / station of the first transport leg. Privacy:
     *  city granularity only — we deliberately don't capture street. */
    homeCity: string | null;
    homeCountry: string | null;
    homeCountryCode: string | null;
    homeLatitude: number | null;
    homeLongitude: number | null;
    /** OPT-IN travel preferences. See `src/constants/travelCompanions.ts`
     *  for the catalog + privacy posture (coarse slugs, age buckets only,
     *  no names, no marital status). Empty array = the user hasn't
     *  opted in. */
    travelCompanions: string[];
    kidsAgeBuckets: string[];
    /** ISO-3166 alpha-2 country code the backend inferred from the
     *  request's edge-geo header. NOT persisted to the user row —
     *  derived per request — so used only as a hint to pre-select /
     *  reorder country dropdowns (Country of birth, etc). Null when
     *  no geo header is set (local dev without a CDN in front). */
    detectedCountryCode: string | null;
}

/**
 * Fields the Python backend doesn't yet model (friends list, payment type).
 * We store them per-user in localStorage and merge them on top of the
 * authenticated user from /auth/me. phone / birthYear / countryOfBirthCode
 * used to live here too and have since moved server-side.
 */
type LocalOverlay = Pick<User, 'paymentType' | 'friends'>;

interface UserContextValue {
    user: User | null;
    isLoading: boolean;
    /** True when the authenticated user has admin role. Use this — not a
     *  direct `user.role === 'admin'` comparison — so the source of truth
     *  stays one place. */
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (payload: SignupPayload) => Promise<void>;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    loginError: Error | null;
    signupError: Error | null;
    isLoggingIn: boolean;
    isSigningUp: boolean;
}

const OVERLAY_KEY_PREFIX = 'datryp:user-overlay:';

const loadOverlay = (userId: string): LocalOverlay => {
    try {
        const raw = localStorage.getItem(OVERLAY_KEY_PREFIX + userId);
        if (!raw) return {};
        return JSON.parse(raw) as LocalOverlay;
    } catch {
        return {};
    }
};

const saveOverlay = (userId: string, overlay: LocalOverlay): void => {
    try {
        localStorage.setItem(
            OVERLAY_KEY_PREFIX + userId,
            JSON.stringify(overlay)
        );
    } catch {
        // ignore quota errors
    }
};

const UserContext = createContext<UserContextValue | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const { data: me, isLoading } = useCurrentUser();
    const loginMutation = useLogin();
    const signupMutation = useSignup();
    const logoutFn = useLogout();
    const queryClient = useQueryClient();

    const [overlay, setOverlay] = useState<LocalOverlay>({});

    useEffect(() => {
        if (me?.id) {
            setOverlay(loadOverlay(me.id));
        } else {
            setOverlay({});
        }
    }, [me?.id]);

    useEffect(() => {
        if (me?.id) saveOverlay(me.id, overlay);
    }, [me?.id, overlay]);

    // One-time migration of legacy localStorage bookmarks to the backend.
    // Runs once per user per browser; subsequent sign-ins are a no-op via
    // a `datryp:bookmarks:migrated:<userId>` flag. After a successful
    // migration we invalidate the saved-* queries so the Saved page and
    // bookmark buttons reflect the freshly-uploaded rows.
    useEffect(() => {
        if (!me?.id) return;
        let cancelled = false;
        void migrateLocalBookmarks(me.id).then(() => {
            if (cancelled) return;
            queryClient.invalidateQueries({ queryKey: savedPlacesKey });
            queryClient.invalidateQueries({ queryKey: savedCitiesKey });
            queryClient.invalidateQueries({ queryKey: savedCountriesKey });
        });
        return () => {
            cancelled = true;
        };
    }, [me?.id, queryClient]);

    const user: User | null = useMemo(() => {
        if (!me) return null;
        return {
            id: me.id,
            name: me.name ?? me.email,
            email: me.email,
            phone: me.phone,
            birthYear: me.birth_year,
            role: me.role,
            subscriptionPlan: me.subscription_plan,
            subscriptionStatus: me.subscription_status,
            effectiveTripCap: me.effective_trip_cap,
            isPaidMember: me.is_paid_member,
            trialEndsAt: me.trial_ends_at,
            currentPeriodEnd: me.current_period_end,
            cancelAtPeriodEnd: me.subscription_cancel_at_period_end,
            countryOfBirthCode: me.country_of_birth_code,
            interests: me.interests ?? [],
            travelerStyles: me.traveler_styles ?? [],
            dreamDestinations: me.dream_destinations ?? [],
            genderId: me.gender_id,
            onboardingCompletedAt: me.onboarding_completed_at,
            profileImageUrl: me.profile_image_url,
            homeCity: me.home_city,
            homeCountry: me.home_country,
            homeCountryCode: me.home_country_code,
            homeLatitude: me.home_latitude,
            homeLongitude: me.home_longitude,
            travelCompanions: me.travel_companions ?? [],
            kidsAgeBuckets: me.kids_age_buckets ?? [],
            detectedCountryCode: me.detected_country_code ?? null,
            ...overlay,
        };
    }, [me, overlay]);

    const isAdmin = user?.role === USER_ROLE.ADMIN;

    const login = useCallback(
        async (email: string, password: string) => {
            await loginMutation.mutateAsync({ email, password });
        },
        [loginMutation]
    );

    const signup = useCallback(
        async (payload: SignupPayload) => {
            await signupMutation.mutateAsync(payload);
        },
        [signupMutation]
    );

    const logout = useCallback(() => {
        logoutFn();
        setOverlay({});
    }, [logoutFn]);

    const updateUser = useCallback((updates: Partial<User>) => {
        setOverlay((prev) => ({ ...prev, ...updates }));
    }, []);

    const value = useMemo<UserContextValue>(
        () => ({
            user,
            isLoading,
            isAdmin,
            login,
            signup,
            logout,
            updateUser,
            loginError: loginMutation.error,
            signupError: signupMutation.error,
            isLoggingIn: loginMutation.isPending,
            isSigningUp: signupMutation.isPending,
        }),
        [
            user,
            isLoading,
            isAdmin,
            login,
            signup,
            logout,
            updateUser,
            loginMutation.error,
            signupMutation.error,
            loginMutation.isPending,
            signupMutation.isPending,
        ]
    );

    return (
        <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );
};

export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used within UserProvider');
    return ctx;
};
